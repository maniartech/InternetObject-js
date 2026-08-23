/**
 * Add explicit file extensions to the relative import specifiers in dist/esm.
 *
 * WHY THIS EXISTS
 *
 * Node's ESM resolver requires an explicit extension on a relative specifier: `./core/document`
 * is not a module, `./core/document.js` is. TypeScript source conventionally omits it, and
 * esbuild in unbundled mode (`bundle: false`) rewrites the output FILE extension but never the
 * specifiers inside the files. The result is an ESM build where every import is unresolvable.
 *
 * That is not hypothetical: it shipped. internet-object@0.2.1 could not be imported at all — 447
 * extensionless specifiers across 81 files — and went unnoticed for seven months, because the only
 * check that touched dist/ ran `esbuild --bundle` over it, and a BUNDLER resolves extensionless
 * imports happily where Node does not.
 *
 * The alternative is writing `.js` in the TypeScript source (what `moduleResolution: NodeNext`
 * expects). That was tried and deliberately rejected: it puts build-format detail into 661 import
 * statements and makes the source noisier to read. Doing it here keeps the source clean and the
 * output correct.
 *
 * WHAT IT DOES
 *
 * For every `.js` file under dist/esm, each relative specifier is resolved against what was
 * actually emitted:
 *
 *     './foo'   ->  './foo.js'         when foo.js exists
 *     './bar'   ->  './bar/index.js'   when bar/ is a directory with an index.js
 *     '.'       ->  './index.js'       (the same case, spelled shorter)
 *
 * Anything already carrying an extension is left alone, so the script is idempotent. A specifier
 * that resolves to NEITHER a file nor a directory index is a real problem — it means the build
 * emitted an import to something that does not exist — so the script fails loudly rather than
 * leaving a broken specifier in place.
 *
 * Only dist/esm is processed. dist/cjs is a single bundled file with no cross-file specifiers, and
 * type declarations already carry extensions from tsup.
 *
 * Run automatically by the ESM half of tsup.config.ts (`onSuccess`).
 * Verified end-to-end by `scripts/verify-package.mjs`, which imports the built package with Node.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const esmDir = join(root, 'dist', 'esm');

if (!existsSync(esmDir)) {
  console.error(`fix-esm-extensions: ${esmDir} does not exist — did the ESM build run?`);
  process.exit(1);
}

/** `from '...'`, `import '...'`, `export ... from '...'`, and dynamic `import('...')`. */
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.\.?(?:\/[^"']*)?)\2/g;
const HAS_EXTENSION = /\.(js|mjs|cjs|json|node)$/;

function jsFilesIn(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsFilesIn(full));
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = jsFilesIn(esmDir);
const unresolved = [];
let rewritten = 0;
let touchedFiles = 0;

for (const file of files) {
  const here = dirname(file);
  const before = readFileSync(file, 'utf8');

  const after = before.replace(SPECIFIER, (match, lead, quote, spec) => {
    if (HAS_EXTENSION.test(spec)) return match;

    const target = resolve(here, spec);
    let fixed;
    if (existsSync(`${target}.js`)) {
      fixed = `${spec}.js`;
    } else if (existsSync(join(target, 'index.js')) && statSync(target).isDirectory()) {
      // `.` and `./x` both land here; normalise `.` to `./index.js` rather than `./index.js`
      // hanging off an empty prefix.
      fixed = spec === '.' || spec === '..' ? `${spec}/index.js` : `${spec.replace(/\/$/, '')}/index.js`;
    } else {
      unresolved.push({ file, spec });
      return match;
    }
    rewritten++;
    return `${lead}${quote}${fixed}${quote}`;
  });

  if (after !== before) {
    writeFileSync(file, after);
    touchedFiles++;
  }
}

if (unresolved.length > 0) {
  console.error('fix-esm-extensions: specifiers that resolve to nothing emitted:');
  for (const { file, spec } of unresolved) {
    console.error(`  ${file.slice(root.length + 1)}  ->  ${spec}`);
  }
  process.exit(1);
}

console.log(`✅ ESM extensions: ${rewritten} specifiers across ${touchedFiles}/${files.length} files`);
