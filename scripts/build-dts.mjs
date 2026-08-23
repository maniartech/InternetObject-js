/**
 * Generate the type declarations, retrying a known flaky crash.
 *
 * `tsup --dts-only` intermittently dies on Windows inside its declaration worker — a native abort
 * with no diagnostic (exit 127 / 0xC0000374 STATUS_HEAP_CORRUPTION under node and npm, exit 116
 * under bun). Measured over six consecutive runs: the JS pass (`tsup --no-dts`) succeeded 6/6, the
 * declaration pass 5/6. It is the declaration pass alone, and it is independent of the runner.
 *
 * The failure is all-or-nothing: it either crashes and emits nothing, or completes and emits
 * correct, identical output. There is no partial or corrupted state to inherit — so retrying is
 * safe, and it is what a human does anyway.
 *
 * This is a workaround, not a fix. The durable answer is to emit declarations with `tsc
 * --emitDeclarationOnly`, which has no worker to crash; that is a build-layout change and is
 * deliberately not being done on the eve of a release. If the retries ever start being needed
 * routinely, do that instead.
 *
 *   node scripts/build-dts.mjs        # run by `npm run build`
 *
 * Exit: 0 when declarations were emitted, 1 when every attempt failed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ATTEMPTS = 3;

/** Declarations actually on disk — the crash emits none, so this is the real success test. */
function declarationCount(dir) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) n += declarationCount(join(dir, entry.name));
    else if (entry.name.endsWith('.d.ts') || entry.name.endsWith('.d.cts')) n++;
  }
  return n;
}

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  const result = spawnSync('npx', ['tsup', '--dts-only'], {
    cwd: root,
    stdio: attempt === 1 ? 'inherit' : 'ignore', // keep the first attempt's output; hide retry noise
    shell: process.platform === 'win32',
  });

  const emitted = declarationCount(join(root, 'dist'));
  if (result.status === 0 && emitted > 0) {
    if (attempt > 1) console.log(`✅ declarations emitted on attempt ${attempt} (${emitted} files)`);
    process.exit(0);
  }

  console.warn(
    `⚠️  declaration pass failed (attempt ${attempt}/${ATTEMPTS}, exit ${result.status}, ` +
    `${emitted} files) — known flaky tsup crash, retrying`
  );
}

console.error(`❌ declarations could not be generated after ${ATTEMPTS} attempts.`);
console.error('   This is normally the flaky tsup worker crash; if it persists, switch the');
console.error('   declaration step to `tsc --emitDeclarationOnly` (see this file\'s header).');
process.exit(1);
