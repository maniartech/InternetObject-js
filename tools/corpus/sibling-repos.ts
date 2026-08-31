/**
 * Where the sibling repositories are.
 *
 * The corpus generators write into the conformance-corpus repository, and the coverage tool reads
 * the specification repository. Both used to be hardcoded as `'../io-test-cases'` and
 * `'../io-specs'` — the directory names on one maintainer's machine. The repositories are actually
 * called `InternetObject-test-cases` and `InternetObject-specs`, so a normal `git clone` produced
 * directories that none of the tooling could find.
 *
 * This resolves them instead of assuming:
 *
 *   1. an explicit override — `IO_CORPUS_DIR` / `IO_SPECS_DIR`, absolute or relative to the repo
 *      root. Use this for any layout that is not two siblings in one folder.
 *   2. otherwise, the first candidate directory name that exists beside this repository.
 *
 * Resolution is anchored to THIS file's location, not to `process.cwd()`, so a generator behaves
 * the same whether it is run from the repo root, from `tools/`, or by a test runner.
 *
 * Nothing here throws on absence. A missing sibling is a legitimate state — someone building from
 * a tarball has neither — so the callers decide: generators refuse to run without one, and the
 * conformance suites skip with a reason.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The root of this repository, wherever it happens to be checked out or named. */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The folder holding this repository, i.e. where its siblings live. */
const SIBLING_ROOT = path.dirname(REPO_ROOT);

/**
 * Directory names to try, in order. The canonical repository name comes first; the short local
 * name is kept as a fallback so existing checkouts keep working.
 */
const CANDIDATES = {
  corpus: ['InternetObject-test-cases', 'io-test-cases'],
  specs: ['InternetObject-specs', 'io-specs'],
} as const;

function resolveSibling(kind: keyof typeof CANDIDATES, envVar: string): string | null {
  const override = process.env[envVar];
  if (override) {
    const resolved = path.resolve(REPO_ROOT, override);
    return fs.existsSync(resolved) ? resolved : null;
  }
  for (const name of CANDIDATES[kind]) {
    const candidate = path.join(SIBLING_ROOT, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** The conformance corpus repository, or `null` when it is not checked out beside this one. */
export function corpusDir(): string | null {
  return resolveSibling('corpus', 'IO_CORPUS_DIR');
}

/** The specification repository, or `null` when it is not checked out beside this one. */
export function specsDir(): string | null {
  return resolveSibling('specs', 'IO_SPECS_DIR');
}

/** A path inside the corpus, or `null` when the corpus is absent. */
export function corpusPath(...segments: string[]): string | null {
  const root = corpusDir();
  return root === null ? null : path.join(root, ...segments);
}

/** A path inside the specification, or `null` when it is absent. */
export function specsPath(...segments: string[]): string | null {
  const root = specsDir();
  return root === null ? null : path.join(root, ...segments);
}

/**
 * The message to print when a tool cannot run without a sibling. Names the override rather than
 * just reporting absence, because "not found" without "here is how to say where it is" sends the
 * reader into the source.
 */
export function missingSiblingMessage(kind: keyof typeof CANDIDATES): string {
  const envVar = kind === 'corpus' ? 'IO_CORPUS_DIR' : 'IO_SPECS_DIR';
  const names = CANDIDATES[kind].join(' or ');
  return [
    `Could not find the ${kind} repository.`,
    `Looked for ${names} beside ${REPO_ROOT}.`,
    `Clone it there, or point ${envVar} at it.`,
  ].join('\n');
}

/** Same as {@link corpusPath}, but for tools that cannot proceed without it. */
export function requireCorpusPath(...segments: string[]): string {
  const resolved = corpusPath(...segments);
  if (resolved === null) throw new Error(missingSiblingMessage('corpus'));
  return resolved;
}

/**
 * Turns a missing sibling from a SKIP into a FAILURE, when `IO_REQUIRE_SIBLINGS=1` is set.
 *
 * Skipping is right on a developer's machine and right for anyone building from a tarball — they
 * legitimately have no corpus. It is wrong in CI, where a silently skipped suite is indistinguishable
 * from a passing one.
 *
 * That distinction is not hypothetical here. `tests/conformance/corpus.test.ts` says it plainly:
 * *"a reference implementation that does not run the contract on every commit is not a reference."*
 * The suite was written to stop 85 cases going unrun for months — and then ran nowhere in CI,
 * because the corpus is a sibling repository and CI checked out only this one. All 1,769 conformance
 * tests reported as skipped, and the pipeline was green.
 *
 * @throws when the sibling is required and absent.
 */
export function requireSibling(kind: keyof typeof CANDIDATES, present: boolean): void {
  if (present) return;
  if (process.env.IO_REQUIRE_SIBLINGS !== '1') return;
  throw new Error(
    `IO_REQUIRE_SIBLINGS=1 and the ${kind} repository is missing, so this suite would have been ` +
    `SKIPPED rather than run.

${missingSiblingMessage(kind)}`
  );
}
