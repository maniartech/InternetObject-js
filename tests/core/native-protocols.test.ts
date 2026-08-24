import { describe, it, expect } from 'vitest';
import parse from '../../src/parser/index';

/**
 * The native protocol contract: our objects must work with plain JavaScript without a conversion
 * call first (spec `.private/docs/REACTIVE-CORE-SPEC.md` §2.5).
 *
 * These tests pin the half of the contract that holds TODAY. The rest arrives with the Draft and
 * Snapshot surfaces; each one gets a test here as it lands.
 *
 * The leak tests are the important ones. `IOObject` always defined its internals non-enumerable,
 * but `IOCollection` and `IODocument` used plain `private` fields — enumerable at runtime — so
 * `{ ...collection }` and `structuredClone(document)` handed back machinery (`_items`, `_header`)
 * where a caller expected data. Nothing threw, so nothing caught it.
 */
const DOC = 'name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25';

describe('native protocols', () => {
  describe('internals never leak through a key walk', () => {
    it('a collection exposes no private fields', () => {
      const coll: any = (parse(DOC) as any).sections.get(0).data;
      expect(Object.keys(coll)).toEqual([]);
      expect(Object.keys({ ...coll })).toEqual([]);
      expect(structuredClone(coll)).toEqual({});
    });

    it('a document exposes no private fields', () => {
      const doc: any = parse(DOC);
      expect(Object.keys(doc)).toEqual([]);
      expect(Object.keys({ ...doc })).toEqual([]);
    });

    it('a record exposes no private fields', () => {
      const rec: any = (parse(DOC) as any).sections.get(0).data.getAt(0);
      expect(Object.keys(rec)).toEqual([]);
    });

    it('errors stay publicly readable — non-enumerable is not private', () => {
      const doc: any = parse(DOC);
      expect(Array.isArray(doc.errors)).toBe(true);
      expect(Array.isArray((doc.sections.get(0).data as any).errors)).toBe(true);
    });
  });

  describe('protocols that already work', () => {
    it('JSON.stringify projects data, not machinery', () => {
      expect(JSON.stringify(parse(DOC))).toBe('[{"name":"Alice","age":30},{"name":"Bob","age":25}]');
    });

    it('a collection is iterable and spreadable', () => {
      const coll: any = (parse(DOC) as any).sections.get(0).data;
      expect([...coll]).toHaveLength(2);
      expect(Array.from(coll)).toHaveLength(2);
      expect(coll.length).toBe(2);
    });

    it('a record iterates as [key, value] entries', () => {
      const rec: any = (parse(DOC) as any).sections.get(0).data.getAt(0);
      expect([...rec]).toEqual([['name', 'Alice'], ['age', 30]]);
    });
  });
});
