import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Every example under `examples/` is executed here.
 *
 * An example that does not run is worse than no example: a reader copies it, it fails, and they
 * conclude the library is broken rather than the documentation. So each one is imported for real —
 * they run their code at module scope — and must complete without throwing.
 *
 * This also means an example CANNOT silently rot. Rename a method or change a return shape and the
 * examples fail alongside the unit tests, in the same run, before anybody publishes.
 *
 * Adding an example needs no change here: drop a folder under `examples/` containing `index.ts`
 * and it is picked up. The checks below also enforce the shape every example is expected to have,
 * so a half-finished one is a failure rather than a quiet omission.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const EXAMPLES = path.resolve(here, '..', '..', 'examples');

/** Example folders, in the order a reader meets them. */
function exampleDirs(): string[] {
  return fs
    .readdirSync(EXAMPLES, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(EXAMPLES, e.name, 'index.ts')))
    .map((e) => e.name)
    .sort();
}

const dirs = exampleDirs();

describe('examples', () => {
  it('there are examples to run', () => {
    expect(dirs.length).toBeGreaterThan(0);
  });

  describe('every example is complete', () => {
    for (const dir of dirs) {
      it(`${dir} has a README explaining it`, () => {
        const readme = path.join(EXAMPLES, dir, 'README.md');
        expect(fs.existsSync(readme), `${dir}/README.md is missing`).toBe(true);
        // A stub helps nobody. This is a floor, not a target.
        expect(fs.readFileSync(readme, 'utf8').trim().length).toBeGreaterThan(400);
      });
    }
  });

  describe('every example runs', () => {
    let logged: string[] = [];

    beforeEach(() => {
      logged = [];
      vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(' '));
      });
    });

    afterEach(() => { vi.restoreAllMocks(); });

    for (const dir of dirs) {
      it(`${dir} completes and prints something`, async () => {
        // A fresh query string defeats the module cache, so each example runs its own code rather
        // than silently reusing a previous import.
        const entry = path.join(EXAMPLES, dir, 'index.ts');
        await import(/* @vite-ignore */ `${entry}?example=${dir}`);
        expect(logged.length, `${dir} printed nothing — an example should show its result`).toBeGreaterThan(0);
      });
    }
  });
});
