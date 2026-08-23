/**
 * Remove build output, portably.
 *
 * Both tsup configs use `clean: true`, but that only clears their own `outDir` (dist/esm,
 * dist/cjs) — output from a previous layout would survive beside them and ship. This clears the
 * whole tree first. Node's fs.rmSync rather than `rm -rf`, because npm runs scripts through
 * cmd.exe on Windows, where `rm` does not exist.
 */
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
for (const dir of ['dist', 'coverage']) {
  rmSync(join(root, dir), { recursive: true, force: true });
}
