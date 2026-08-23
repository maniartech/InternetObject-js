import { describe, test, expect } from 'vitest';
import { loadInferred, stringify } from '../../src';

/**
 * R2 — JS bigint values infer as the `bigint` schema type, not `number`.
 *
 * Regression: the inferrer mapped a JS bigint to schema type `number`, but `number` (IEEE-754 double)
 * correctly rejects a bigint at validation → `loadInferred({big: 42n})` threw `not-a-number`.
 * Spec: `42n` is a distinct bigint value type and `bigint` is a first-class schema type
 * (the-structure/values/number/bigint.md; schema-definition-language/data-types/number).
 */
describe('R2 — bigint inference (loadInferred)', () => {
  test('scalar bigint does not throw and round-trips as bigint', () => {
    const doc: any = loadInferred({ big: 42n });
    const out = stringify(doc, { includeHeader: true } as any);
    expect(out).toContain('big: bigint');   // inferred schema type
    expect(out).toContain('42n');           // value keeps the bigint suffix
  });

  test('bigint beyond Number.MAX_SAFE_INTEGER round-trips exactly', () => {
    const doc: any = loadInferred({ big: 9007199254740993n });
    expect(stringify(doc, { includeHeader: true } as any)).toContain('9007199254740993n');
  });

  test('array of bigints does not throw', () => {
    expect(() => loadInferred({ xs: [1n, 2n, 3n] })).not.toThrow();
  });

  test('a column mixing number and bigint widens (no throw)', () => {
    expect(() => loadInferred([{ v: 1 }, { v: 2n }])).not.toThrow();
  });
});
