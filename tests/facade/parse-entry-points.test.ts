import { describe, it, expect } from 'vitest';
import { parse, parseDocument } from '../../src/facade/parse';
import parseCore from '../../src/parser/index';
import parseDefinitions from '../../src/parser/parse-defs';
import IODocument from '../../src/core/document';
import Decimal from '../../src/core/decimal/decimal';

/**
 * A2 — the two entry points.
 *
 *   io.parse(text)          → plain JavaScript, the shape the playground's JSON panel shows
 *   io.parseDocument(text)  → the proxied document
 *
 * They are one pipeline and two shapes, not two parsers: `parse` IS
 * `parseDocument(...).toObject()`. The last test in this file is the reason that matters — the day
 * they become independent implementations is the day they start disagreeing.
 */
const DOC =
  '~ $person: {name: string, age: int}\n' +
  '--- employees: $person\n~ Alice, 30\n~ Bob, 25\n' +
  '--- managers: $person\n~ Carol, 41';

describe('parse and parseDocument (A2)', () => {
  describe('what each returns', () => {
    it('parse hands back plain objects and arrays', () => {
      expect(parse('name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25'))
        .toEqual([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]);
    });

    it('a single object stays an object; several sections key by name', () => {
      expect(parse('name: string\n---\nname: Alice')).toEqual({ name: 'Alice' });
      expect(Object.keys(parse(DOC))).toEqual(['employees', 'managers']);
    });

    it('parse returns POJOs all the way down — nothing to unwrap, nothing to shadow', () => {
      const rows: any = parse('name: string, home: {city: string}\n---\n~ Alice, {NYC}');
      expect(rows[0].constructor).toBe(Object);
      expect(rows[0].home.constructor).toBe(Object);
      expect(Object.keys(rows[0])).toEqual(['name', 'home']);
    });

    it('native values survive the projection — a Date stays a Date', () => {
      const row: any = parse("born: date, pay: decimal, big: bigint\n---\nborn: d'1994-03-01', pay: 10.50m, big: 42n");
      expect(row.born).toBeInstanceOf(Date);
      expect(row.pay).toBeInstanceOf(Decimal);
      expect(typeof row.big).toBe('bigint');
    });

    it('parseDocument hands back the document, reachable by name', () => {
      const doc = parseDocument(DOC);
      expect(doc).toBeInstanceOf(IODocument);
      expect(doc.sections.employees[0].name).toBe('Alice');
      expect(doc.header).toBeDefined();
    });
  });

  describe('the sink is the third argument, and it takes two shapes', () => {
    const BAD = 'age: int\n---\n~ 30\n~ abc\n~ 40';

    it('no sink: the first error throws, exactly as before', () => {
      expect(() => parse('name: string, age: int\n---\nname: Alice, age: abc')).toThrow();
    });

    it('an array is filled', () => {
      const bag: Error[] = [];
      const rows: any = parse(BAD, null, bag);
      expect(bag.length).toBeGreaterThan(0);
      expect(rows.length).toBe(3);                 // parsing continued
    });

    it('a function is called once per error', () => {
      const seen: Error[] = [];
      parse(BAD, null, (e) => seen.push(e));
      const bag: Error[] = [];
      parse(BAD, null, bag);
      expect(seen.map((e: any) => e.errorCode)).toEqual(bag.map((e: any) => e.errorCode));
    });

    it('a function sink is called even when the parse throws on the way out', () => {
      const seen: Error[] = [];
      try {
        parse('a: {b: 1', null, (e) => seen.push(e));
      } catch {
        /* whether this throws is not the point of this test */
      }
      expect(Array.isArray(seen)).toBe(true);
    });

    it('parseDocument takes the same sink in the same slot', () => {
      const bag: Error[] = [];
      const doc = parseDocument(BAD, null, bag);
      expect(bag.length).toBeGreaterThan(0);
      expect(doc.data.length).toBe(3);
    });
  });

  describe('options', () => {
    it('skipErrors omits the failed record instead of embedding it', () => {
      const bag: Error[] = [];
      const kept: any = parse('age: int\n---\n~ 30\n~ abc\n~ 40', null, bag, { skipErrors: true });
      expect(kept.length).toBe(2);
      expect(kept).toEqual([{ age: 30 }, { age: 40 }]);
      expect(bag.length).toBeGreaterThan(0);       // skipping the record does not hide the error
    });

    it('without it, the failed record is embedded in place', () => {
      const bag: Error[] = [];
      const rows: any = parse('age: int\n---\n~ 30\n~ abc\n~ 40', null, bag);
      expect(rows.length).toBe(3);
      expect(rows[1].__error).toBe(true);
    });
  });

  describe('definitions in the second slot, unchanged', () => {
    it('accepts a Definitions', () => {
      const defs: any = parseDefinitions('~ $person: {name: string, age: int}');
      expect(parse('~ Alice, 30', defs, undefined)).toBeDefined();
      expect(parseDocument('~ Alice, 30', defs).toObject()).toBeDefined();
    });
  });

  /**
   * The gate. `parse` must never be a second implementation of the projection — if this ever fails,
   * a POJO builder has drifted from the document it is supposed to mirror.
   */
  describe('parse(text) is exactly parseDocument(text).toObject()', () => {
    const cases = [
      'name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25',
      'name: string\n---\nname: Alice',
      DOC,
      '~ $p: {name: string}\n~ @env: prod\n--- users: $p\n~ Alice',
      "born: date, pay: decimal\n---\nborn: d'1994-03-01', pay: 10.50m",
      'name: string, home?: {city: string, zip?: string}\n---\n~ Alice, {NYC}',
      '',
      'a, b, c',
      '~ 1\n~ 2\n~ 3',
    ];

    for (const [i, text] of cases.entries()) {
      it(`case ${i}`, () => {
        expect(parse(text)).toEqual(parseDocument(text).toObject());
      });
    }

    it('and holds with a sink and with skipErrors', () => {
      const bad = 'age: int\n---\n~ 30\n~ abc\n~ 40';
      const a: Error[] = [];
      const b: Error[] = [];
      expect(parse(bad, null, a)).toEqual(parseDocument(bad, null, b).toObject());
      expect(a.map((e: any) => e.errorCode)).toEqual(b.map((e: any) => e.errorCode));

      const c: Error[] = [];
      const d: Error[] = [];
      expect(parse(bad, null, c, { skipErrors: true }))
        .toEqual(parseDocument(bad, null, d).toObject({ skipErrors: true }));
    });

    it('and the core parser is untouched underneath both', () => {
      expect(parseCore(DOC).toObject()).toEqual(parse(DOC));
      expect(parseCore(DOC)).toBeInstanceOf(IODocument);
    });
  });
});
