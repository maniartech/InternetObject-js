/**
 * Consume the package the way a user does: pack the tarball, install it into a scratch project
 * outside this repo, and import it — as ESM, as CommonJS, and as TypeScript.
 *
 * This exists because of a real defect. Until 2026-08-23 the published package could not be
 * imported at all: `bundle: false` left 447 extensionless relative specifiers in the ESM output,
 * and Node's resolver requires explicit extensions. It shipped in 0.2.1 and nobody noticed,
 * because the only check that touched dist/ ran `esbuild --bundle` over it — and esbuild's
 * BUNDLER resolves extensionless imports happily. The build was validated by a resolver that
 * papers over the exact bug.
 *
 * So the rule this script encodes: never validate a package with a bundler. Use Node, and use the
 * installed tarball, not the source tree.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const scratch = mkdtempSync(join(tmpdir(), 'io-verify-'));

const isWin = process.platform === 'win32';
const base = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };

// npm is a .cmd shim on Windows, and Node has refused to spawnSync those directly (EINVAL) since
// the CVE-2024-27980 fix — so it needs a shell. Every argument here is repo-controlled.
const runNpm = (args, cwd) => execFileSync(npm, args, { ...base, cwd, shell: isWin });

// Node itself must NOT go through a shell: its path contains spaces ("C:\\Program Files\\..."),
// which the shell would split into a bogus command.
const runNode = (args, cwd) => execFileSync(process.execPath, args, { ...base, cwd });

let failed = false;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m, e) => { failed = true; console.error(`  ✗ ${m}\n${String(e).split('\n').slice(0, 6).join('\n')}`); };

try {
  // `tsup --watch` writes raw tsup output into dist and cleans the folder first: no extension
  // fixing, no dist/cjs/package.json, no declarations. The result is not a package, and consuming
  // it produces Node resolution errors that name none of that. `finalize-dist.mjs` writes this
  // marker, so its absence identifies the situation exactly.
  if (!existsSync(join(root, 'dist', 'cjs', 'package.json'))) {
    console.error('✗ dist/cjs/package.json is missing.');
    console.error('  dist looks like `tsup --watch` output, which is NOT a publishable package.');
    console.error('  Run `npm run build` first — it adds the extension fixing, the CommonJS marker');
    console.error('  and the declarations that watch mode skips.');
    process.exit(1);
  }

  console.log('📦 Packing…');
  runNpm(['pack', '--pack-destination', scratch], root);
  const tgz = readdirSync(scratch).find((f) => f.endsWith('.tgz'));
  if (!tgz) throw new Error('npm pack produced no tarball');

  console.log(`📥 Installing ${tgz} into a scratch project…`);
  writeFileSync(join(scratch, 'package.json'), JSON.stringify({ name: 'io-verify', version: '1.0.0', private: true }) + '\n');
  runNpm(['install', `./${tgz}`], scratch);

  console.log('🔎 Consuming it:');

  writeFileSync(join(scratch, 'esm.mjs'), `
import { parse, parseDocument, load, parseDefinitions, stringify, subscribe, version, createStreamReader, IOObject } from 'internet-object';

// parse returns plain JavaScript; parseDocument returns the document (§2).
const got = JSON.stringify(parse('name: string, age: int\\n---\\n~ Alice, 30\\n~ Bob, 25'));
if (got !== '[{"name":"Alice","age":30},{"name":"Bob","age":25}]') throw new Error('parse: ' + got);

const d = parseDocument('name: string, age: int\\n---\\n~ Alice, 30\\n~ Bob, 25');
if (JSON.stringify(d.toObject()) !== got) throw new Error('parse is not parseDocument().toObject()');
if (stringify(d) !== '~ Alice, 30\\n~ Bob, 25') throw new Error('stringify: ' + stringify(d));
if (String(d) !== 'name: string, age: int\\n---\\n~ Alice, 30\\n~ Bob, 25') throw new Error('String(doc): ' + String(d));

const l = load({ name: 'C', age: 1 }, parseDefinitions('~ $schema: {name: string, age: int}'));
if (JSON.stringify(l.toObject()) !== '{"name":"C","age":1}') throw new Error('load');

// The one that nearly shipped broken. set() validates only because src/schema/write-hooks.ts
// installs the hooks, and it is reached by a BARE side-effect import — the kind a bundler is free
// to drop unless sideEffects lists it. Nothing here fails to compile when it is dropped; the
// library simply stops validating, silently. So the packed artifact has to be asked directly.
let refused = false;
try { d.data[0].age = 'not-an-int'; } catch { refused = true; }
if (!refused) throw new Error('set() did not validate — the write hooks were tree-shaken out');
let adopted = false;
try { d.data.push({ name: 'X' }); } catch { adopted = true; }
if (!adopted) throw new Error('push() did not adopt — the write hooks were tree-shaken out');

// Errors reach the sink in slot three, on every entry point (§2.5).
const sink = [];
parse('age: int\\n---\\n~ 30\\n~ abc', null, sink);
if (sink.length !== 1) throw new Error('sink got ' + sink.length + ' errors, expected 1');

// Notification (§8).
const stop = subscribe(d, () => {});
const before = version(d);
d.data[1].age = 26;
if (version(d) !== before + 1) throw new Error('version did not move');
stop();

if (typeof createStreamReader !== 'function') throw new Error('streaming export missing');
if (typeof IOObject !== 'function') throw new Error('IOObject export missing');
`);
  try { runNode(['esm.mjs'], scratch); ok('ESM  — parse/parseDocument/stringify/load/stream, validated writes, sink, notification'); }
  catch (e) { bad('ESM import', e.stderr || e); }

  writeFileSync(join(scratch, 'cjs.cjs'), `
const { parse, parseDocument, stringify } = require('internet-object');
const got = JSON.stringify(parse('name: string, age: int\\n---\\n~ Alice, 30'));
if (got !== '[{"name":"Alice","age":30}]') throw new Error('parse: ' + got);
const d = parseDocument('name: string, age: int\\n---\\n~ Alice, 30');
if (stringify(d) !== '~ Alice, 30') throw new Error('stringify');
// Same tree-shaking check as the ESM half — the CJS bundle is built separately and can lose it
// on its own.
let refused = false;
try { d.data[0].age = 'not-an-int'; } catch { refused = true; }
if (!refused) throw new Error('set() did not validate — the write hooks were tree-shaken out');
`);
  try { runNode(['cjs.cjs'], scratch); ok('CJS  — require works'); }
  catch (e) { bad('CJS require', e.stderr || e); }

  // A CJS entry that resolves to an ESM file only works on Node >= 22.12 (require(ESM)). Assert
  // the CJS half is genuinely CommonJS, so Node 18 and 20 — which `engines` supports — are safe.
  writeFileSync(join(scratch, 'cjs-is-cjs.cjs'), `
const path = require.resolve('internet-object');
const { readFileSync } = require('node:fs');
const marker = JSON.parse(readFileSync(require('node:path').join(require('node:path').dirname(path), 'package.json'), 'utf8'));
if (marker.type !== 'commonjs') throw new Error('dist/cjs is not marked commonjs: ' + JSON.stringify(marker));
const body = readFileSync(path, 'utf8');
// The CJS entry is bundled and the library has no dependencies, so it may contain no require()
// at all. What proves it is CommonJS is that it assigns module.exports and uses no ESM syntax.
if (!body.includes('module.exports')) throw new Error('CJS entry never assigns module.exports');
if (/^\s*(import|export)\s/m.test(body)) throw new Error('CJS entry contains ESM syntax');
`);
  try { runNode(['cjs-is-cjs.cjs'], scratch); ok('CJS  — genuinely CommonJS (safe on Node 18/20, not relying on require(ESM))'); }
  catch (e) { bad('CJS is real CommonJS', e.stderr || e); }

  writeFileSync(join(scratch, 'ts.ts'), `
import { parse, parseDocument, stringify, load, parseDefinitions, IODocument } from 'internet-object';
const plain = parse('name: string, age: int\\n---\\n~ Alice, 30');
const d = parseDocument('name: string, age: int\\n---\\n~ Alice, 30');
const s: string = stringify(d);
const doc: IODocument = load({ name: 'A', age: 1 }, parseDefinitions('~ $schema: {name: string, age: int}'));
export { plain, s, doc };
`);
  // Install tsc into the scratch project and drive it through node directly — npx would need a
  // shell, and a shell would mangle paths containing spaces.
  runNpm(['install', '--no-save', 'typescript@5'], scratch);
  const tsc = join(scratch, 'node_modules', 'typescript', 'bin', 'tsc');
  for (const [mode, mod] of [['node16', 'node16'], ['bundler', 'esnext']]) {
    const args = [tsc, '--noEmit', '--strict', '--skipLibCheck', '--target', 'es2022',
                  '--module', mod, '--moduleResolution', mode, 'ts.ts'];
    try { runNode(args, scratch); ok(`Types — resolve under moduleResolution: ${mode}`); }
    catch (e) { bad(`Types under ${mode}`, e.stdout || e.stderr || e); }
  }
} catch (e) {
  failed = true;
  console.error('verify-package failed before the checks could run:\n', e.stderr || e.message || e);
} finally {
  try { rmSync(scratch, { recursive: true, force: true }); } catch { /* best effort */ }
}

if (failed) {
  console.error('\n❌ Package verification FAILED — this package would not work when installed.');
  process.exit(1);
}
console.log('\n✨ Package verified: installs and imports cleanly as ESM, CJS and TypeScript.');
