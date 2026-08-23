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
import { mkdtempSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
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
  console.log('📦 Packing…');
  runNpm(['pack', '--pack-destination', scratch], root);
  const tgz = readdirSync(scratch).find((f) => f.endsWith('.tgz'));
  if (!tgz) throw new Error('npm pack produced no tarball');

  console.log(`📥 Installing ${tgz} into a scratch project…`);
  writeFileSync(join(scratch, 'package.json'), JSON.stringify({ name: 'io-verify', version: '1.0.0', private: true }) + '\n');
  runNpm(['install', `./${tgz}`], scratch);

  console.log('🔎 Consuming it:');

  writeFileSync(join(scratch, 'esm.mjs'), `
import { parse, load, parseDefinitions, stringify, createStreamReader, IOObject } from 'internet-object';
const d = parse('name: string, age: int\\n---\\n~ Alice, 30\\n~ Bob, 25');
const got = JSON.stringify(d.toObject());
if (got !== '[{"name":"Alice","age":30},{"name":"Bob","age":25}]') throw new Error('parse: ' + got);
if (stringify(d) !== '~ Alice, 30\\n~ Bob, 25') throw new Error('stringify: ' + stringify(d));
const l = load({ name: 'C', age: 1 }, parseDefinitions('~ $schema: {name: string, age: int}'));
if (JSON.stringify(l.toObject()) !== '{"name":"C","age":1}') throw new Error('load');
if (typeof createStreamReader !== 'function') throw new Error('streaming export missing');
if (typeof IOObject !== 'function') throw new Error('IOObject export missing');
`);
  try { runNode(['esm.mjs'], scratch); ok('ESM  — import works, parse/stringify/load/stream all correct'); }
  catch (e) { bad('ESM import', e.stderr || e); }

  writeFileSync(join(scratch, 'cjs.cjs'), `
const { parse, stringify } = require('internet-object');
const d = parse('name: string, age: int\\n---\\n~ Alice, 30');
const got = JSON.stringify(d.toObject());
if (got !== '[{"name":"Alice","age":30}]') throw new Error('parse: ' + got);
if (stringify(d) !== '~ Alice, 30') throw new Error('stringify');
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
import { parse, stringify, load, parseDefinitions, IODocument } from 'internet-object';
const d = parse('name: string, age: int\\n---\\n~ Alice, 30');
const s: string = stringify(d);
const doc: IODocument = load({ name: 'A', age: 1 }, parseDefinitions('~ $schema: {name: string, age: int}'));
export { s, doc };
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
