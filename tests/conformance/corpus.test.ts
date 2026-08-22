import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runFile, kindOf, ELSEWHERE, type FileResult } from '../../tools/corpus/runner';

/**
 * The language-independent conformance corpus, as part of `npm test`.
 *
 * `io-test-cases` is the contract every implementation of Internet Object must satisfy — Go, Rust,
 * C#, Dart — and io-js2 is the reference. A reference implementation that does not run the contract
 * on every commit is not a reference; it is a second opinion that happens to be nearby.
 *
 * This suite exists because that was literally true here. The corpus was checked only by a script
 * somebody had to remember to run, and:
 *
 *   - 85 cases (the whole `schema/` and `streaming/` suites) had no comparator at all and were
 *     reported as "skipped" for months;
 *   - running them for the first time found two real defects and thirteen stale error codes;
 *   - a bug fix in io-js2 could silently invalidate corpus rows with nothing to say so.
 *
 * Every case is a separate `it()`, so a failure names the case rather than the file.
 *
 * The comparators are NOT duplicated here — they live in `tools/corpus/runner.ts`, shared with the
 * `npm run corpus` CLI. Two implementations of "does this case pass" would eventually disagree,
 * and then the corpus would mean whichever one you happened to run.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const CORPUS = path.resolve(here, '../../../io-test-cases');

/** Every `.io` suite file, recursively, in a stable order. */
function corpusFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...corpusFiles(full));
    else if (entry.name.endsWith('.io')) out.push(full);
  }
  return out;
}

const files = corpusFiles(CORPUS);
const rel = (f: string) => path.relative(CORPUS, f).replace(/\\/g, '/');

// A missing corpus is not a silent pass. The sibling checkout is how this repo is developed, but a
// consumer building from a tarball will not have it, so skip loudly rather than report zero tests.
describe.skipIf(files.length === 0)('conformance corpus (io-test-cases)', () => {
  // Run every file up front: `it()` bodies cannot be async-registered, and running each file once
  // is cheaper than re-parsing it per case.
  const results = new Map<string, Promise<FileResult>>();
  for (const f of files) results.set(f, runFile(f));

  for (const file of files) {
    const name = rel(file);
    const kind = kindOf(file);
    const via = ELSEWHERE.get(kind);

    // `tokenizer/` suites express their data with the syntax under test, so they run against the
    // generated bootstrap CSV instead (tests/conformance/bootstrap.test.ts). Covered, not skipped.
    if (via) continue;

    describe(name, () => {
      it('the suite file itself parses', async () => {
        const r = await results.get(file)!;
        expect(r.suiteError).toBeUndefined();
      });

      it('has a comparator', async () => {
        const r = await results.get(file)!;
        expect(r.coverage, `no comparator for kind '${kind}' — these cases assert nothing`).toBe('run');
      });

      it('every row is runnable', async () => {
        const r = await results.get(file)!;
        // An "inert" row carries no input, so it silently asserts nothing. That is how a case
        // stops testing without anyone noticing.
        expect(r.inert, `${r.inert} row(s) carry no input`).toBe(0);
      });

      // Case-level assertions are registered lazily against the resolved file result. Vitest needs
      // the `it()` calls at collection time, so the row names come from a synchronous pre-read.
      const rows = peekRowNames(file);
      for (let i = 0; i < rows.length; i++) {
        const caseName = rows[i];
        it(caseName, async () => {
          const r = await results.get(file)!;
          const c = r.cases.find(x => x.name === caseName) ?? r.cases[i];
          expect(c, `case '${caseName}' did not run`).toBeDefined();
          expect(c!.problems.join('\n')).toBe('');
        });
      }
    });
  }
});

/**
 * Read just the case NAMES, synchronously, so vitest can register one `it()` per case at
 * collection time. The full run happens once per file in the promise map above.
 */
function peekRowNames(file: string): string[] {
  try {
    // Deliberately a plain text scan rather than a parse: this runs during collection, and a suite
    // file that fails to parse is reported by its own `it()` above rather than crashing collection.
    const text = fs.readFileSync(file, 'utf8');
    const body = text.split(/\n---\n/).slice(1).join('\n---\n');
    const names: string[] = [];
    for (const line of body.split('\n')) {
      const m = /^~\s*([A-Za-z_][A-Za-z0-9_]*)\s*,/.exec(line);
      if (m) names.push(m[1]);
    }
    return names;
  } catch {
    return [];
  }
}
