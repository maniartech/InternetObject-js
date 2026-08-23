import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCoverage } from '../../tools/corpus/coverage';

/**
 * The coverage map must stay honest.
 *
 * `coverage.ts` maps each specification page to the corpus categories that pin its rules and
 * writes `io-test-cases/COVERAGE.md`. The map is CURATED — nothing in a corpus file says which
 * page it belongs to — so its whole value is in not rotting. It rots in three ways:
 *
 *   1. a spec page is added and nobody says what covers it;
 *   2. a mapping names a corpus category that has been renamed or removed;
 *   3. COVERAGE.md is not regenerated, so it describes a corpus that no longer exists.
 *
 * `buildCoverage()` reports (1) and (2) as problems rather than exiting, so they can be asserted
 * on with the reason attached. (3) is caught by comparing the rendered output with the file.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '../..');
const COVERAGE = path.resolve(REPO, '../io-test-cases/COVERAGE.md');
const SPECS = path.resolve(REPO, '../io-specs');

// Both sibling checkouts are needed; a consumer building from a tarball has neither.
const present = fs.existsSync(SPECS) && fs.existsSync(path.resolve(REPO, '../io-test-cases'));

describe.skipIf(!present)('spec coverage map', () => {
  const result = present ? buildCoverage() : null;

  it('classifies every spec page, and names only categories that exist', () => {
    // The generator's own message says exactly which page is unclassified or which category is
    // misnamed; surfacing it beats asserting on a count.
    expect(result!.problems.join('\n')).toBe('');
  });

  it('reports no uncovered normative page', () => {
    // A gap is a fact, not a bug — but it must be a DELIBERATE fact. This fails until the page is
    // either covered by cases or reclassified as narrative, so neither can happen by drift.
    expect(result!.uncovered).toEqual([]);
  });

  it('COVERAGE.md on disk matches what the map produces', () => {
    const onDisk = fs.existsSync(COVERAGE) ? fs.readFileSync(COVERAGE, 'utf8') : '';
    expect(onDisk, 'COVERAGE.md is stale — run `npx tsx tools/corpus/coverage.ts`')
      .toBe(result!.markdown);
  });
});
