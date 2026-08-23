import { describe, it, expect } from 'vitest';
import parse from '../../src/parser/index';

/**
 * A duplicate member name is an error, with or without a schema.
 *
 * OPEN-DECISIONS D5, decided by Aamir on 2026-08-23: *"throw duplicate member error, period, even
 * when no schema"*.
 *
 * Until then only the SCHEMA path enforced it. Without a schema the object was assembled with
 * `set()`, which overwrites, so `a: 1, a: 2` quietly loaded as `{a: 2}` — the first value gone with
 * no diagnostic, while the identical document under a schema reported `duplicate-member`.
 *
 * The specification had always stated the rule unconditionally:
 *
 *   > `duplicate-member` | a member name appears more than once
 *
 * and it qualifies when it means to — the row beside it reads "a **strict** schema was given a
 * member it does not declare". Only the schemaless path missed it.
 *
 * It was also a porting trap: a port that builds records into a map gets last-wins for free, so
 * the implementation doing the natural thing passed every corpus row and the one that bothered to
 * check failed them.
 */

/** The codes a document surfaces, however it surfaces them. */
function codes(src: string): string[] {
  try {
    const doc: any = parse(src, null);
    return (doc.getErrors?.() ?? []).map((e: any) => e.errorCode);
  } catch (e: any) {
    return [e?.errorCode ?? String(e?.message ?? e)];
  }
}

const value = (src: string) => parse(src, null).toObject();

describe('duplicate member names', () => {
  describe('rejected without a schema', () => {
    const cases: [string, string][] = [
      ['at the top level', 'a: 1, a: 2'],
      ['three of the same name', 'a: 1, a: 2, a: 3'],
      ['inside a nested object', 'o: {a: 1, a: 2}'],
      ['inside an array element', 'x: [{a: 1, a: 2}]'],
      ['inside a collection record', '~ a: 1, a: 2'],
      ['in braces at the top level', '{a: 1, a: 2}'],
    ];
    for (const [label, src] of cases) {
      it(label, () => expect(codes(src)).toEqual(['duplicate-member']));
    }

    it('quoting does not make it a different key', () => {
      // `a` and `"a"` are two spellings of one name. A port comparing SOURCE TEXT rather than
      // decoded keys passes every other row here and fails this one.
      expect(codes('a: 1, "a": 2')).toEqual(['duplicate-member']);
      expect(codes('"a": 1, a: 2')).toEqual(['duplicate-member']);
    });
  });

  describe('still rejected with a schema — the behaviour that was always correct', () => {
    it('under a strict schema', () => {
      expect(codes('~ $schema: {a: int}\n---\n~ a: 1, a: 2')).toEqual(['duplicate-member']);
    });
    it('under an extensible schema', () => {
      expect(codes('~ $schema: {a: int, *}\n---\n~ a: 1, a: 2')).toEqual(['duplicate-member']);
    });
  });

  describe('what must NOT be affected', () => {
    it('distinct keys load normally', () => {
      expect(value('a: 1, b: 2')).toEqual({ a: 1, b: 2 });
    });

    it('positional members are not duplicates of each other', () => {
      // Every positional member is keyless. Treating their indices as names would make any
      // multi-value record a duplicate.
      expect(value('1, 2, 3')).toEqual({ '0': 1, '1': 2, '2': 3 });
      expect(value('1, 1, 1')).toEqual({ '0': 1, '1': 1, '2': 1 });
    });

    it('mixed positional and keyed members load normally', () => {
      expect(value('1, b: 2')).toEqual({ '0': 1, b: 2 });
    });

    it('the same name at DIFFERENT depths is not a duplicate', () => {
      expect(value('a: 1, o: {a: 2}')).toEqual({ a: 1, o: { a: 2 } });
    });

    it('the same name in different records is not a duplicate', () => {
      expect(value('~ a: 1\n~ a: 2')).toEqual([{ a: 1 }, { a: 2 }]);
    });

    it('the same name in different array elements is not a duplicate', () => {
      expect(value('x: [{a: 1}, {a: 2}]')).toEqual({ x: [{ a: 1 }, { a: 2 }] });
    });
  });
});
