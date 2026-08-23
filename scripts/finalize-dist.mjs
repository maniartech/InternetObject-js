/**
 * Marks dist/cjs as CommonJS.
 *
 * The package root is `"type": "module"`, so every `.js` file under it is ESM by default —
 * including the ones tsup writes into dist/cjs. A nested package.json overrides that for its own
 * subtree, which is what makes `require('internet-object')` load real CommonJS instead of hitting
 * ERR_REQUIRE_ESM on Node 18 and 20.
 *
 * Run automatically by the CJS half of tsup.config.ts (`onSuccess`).
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cjsDir = join(root, 'dist', 'cjs');

if (!existsSync(cjsDir)) {
  console.error(`finalize-dist: ${cjsDir} does not exist — did the CJS build run?`);
  process.exit(1);
}

writeFileSync(join(cjsDir, 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
console.log('✅ dist/cjs marked as CommonJS');
