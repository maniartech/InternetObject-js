import { describe, it, expect } from 'vitest';
import io, { parse, load, IOErrorItem } from '../../src/index';

/**
 * The embedded error is a class, and `isError` checks the class.
 *
 * The plain `{ __error: true, … }` shape was forgeable: `__error` is a perfectly legal member
 * name, so a document whose schema declares one produced records that `isError()` reported as
 * failures — and that `{ skipErrors: true }` silently DROPPED. Data loss on well-formed input,
 * from nothing but an unlucky field name.
 *
 * `instanceof IOErrorItem` is the check a document cannot write.
 */
const IMPOSTOR = '__error: bool, msg: string\n---\n~ T, hello\n~ F, world';

describe('IOErrorItem', () => {
  describe('a real failure is one', () => {
    it('parse route: the embedded item is an instance, and isError says so', () => {
      const rows: any = parse('age: int\n---\n~ 30\n~ abc', null, []);
      expect(rows[1]).toBeInstanceOf(IOErrorItem);
      expect(io.isError(rows[1])).toBe(true);
      expect(io.isError(rows[0])).toBe(false);
    });

    it('load route: the embedded item is the same class', () => {
      const sink: Error[] = [];
      const defs: any = io.defs`~ $schema: {name: string, age: int}`;
      const coll: any = load([{ name: 'A', age: 1 }, { name: 'B', age: 'x' }], defs, sink);
      const items: any = coll.toObject();
      expect(io.isError(items[1])).toBe(true);
      expect(items[1]).toBeInstanceOf(IOErrorItem);
    });

    it('keeps the wire shape byte-identical — __error and friends are enumerable', () => {
      const rows: any = parse('age: int\n---\n~ abc', null, []);
      const json = JSON.parse(JSON.stringify(rows[0]));
      expect(json.__error).toBe(true);
      expect(json.errorCode).toBe('expected-integer');
      expect(json.position).toBeDefined();
      // spread sees the same fields JSON does
      expect({ ...rows[0] }.__error).toBe(true);
    });
  });

  describe('data cannot forge one', () => {
    it('a legal __error member parses as data, and isError says false', () => {
      const rows: any = parse(IMPOSTOR, null, []);
      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ __error: true, msg: 'hello' });
      expect(io.isError(rows[0])).toBe(false);
      expect(rows[0]).not.toBeInstanceOf(IOErrorItem);
    });

    it('skipErrors keeps the impostor — the silent-drop bug this class exists to fix', () => {
      const rows: any = parse(IMPOSTOR, null, [], { skipErrors: true });
      expect(rows).toHaveLength(2);
      expect(rows[0].msg).toBe('hello');
    });

    it('while a genuine failure is still skipped, and reported with its index', () => {
      const sink: Error[] = [];
      const rows: any = parse('age: int\n---\n~ 30\n~ abc\n~ 40', null, sink, { skipErrors: true });
      expect(rows).toEqual([{ age: 30 }, { age: 40 }]);
      expect(sink).toHaveLength(1);
      expect((sink[0] as any).collectionIndex).toBe(1);
    });
  });

  describe('the accepted trade-off, pinned so nobody discovers it in production', () => {
    it('structuredClone strips the prototype — same as Decimal in the same projection', () => {
      const rows: any = parse('age: int\n---\n~ abc', null, []);
      const cloned = structuredClone(rows);
      // The clone keeps the enumerable shape but loses the class, so isError answers false.
      // Test for errors on the side of the boundary that parsed.
      expect(cloned[0].__error).toBe(true);
      expect(io.isError(cloned[0])).toBe(false);
    });
  });
});
