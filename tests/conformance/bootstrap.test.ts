import { describe, it, expect } from 'vitest';
import { corpusDir, corpusPath, specsDir , requireSibling } from '../../tools/corpus/sibling-repos'
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCases, runTokenCase } from '../../tools/corpus/bootstrap-runner';

/**
 * The TOKENIZER half of the conformance corpus, as part of `npm test`.
 *
 * The `tokenizer/*.io` suites cannot be read without a working tokenizer — their test data is
 * written with the raw strings, regular strings and escapes under test. They are therefore
 * generated into `bootstrap/tokenizer.csv`, which any language opens with no dependencies, and it
 * is the CSV that runs. `.io` remains the source of truth; the CSV is committed and regenerable:
 *
 *   npm run corpus:bootstrap && git diff --exit-code ../io-test-cases/bootstrap/
 *
 * proves it has not drifted. That check belongs in CI rather than here, because it writes a file.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const CSV = corpusPath('bootstrap', 'tokenizer.csv') ?? '';

const present = fs.existsSync(CSV);

// In CI this must FAIL rather than skip: a skipped conformance suite is
// indistinguishable from a passing one, and that is how all 1,769 of these went unrun.
requireSibling('corpus', present);

describe.skipIf(!present)('conformance corpus (bootstrap tokenizer CSV)', () => {
  const cases = present ? loadCases(CSV) : [];

  it('the CSV holds cases', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const c of cases) {
    it(`${c.suite}/${c.name}`, () => {
      expect(runTokenCase(c).join('\n')).toBe('');
    });
  }
});
