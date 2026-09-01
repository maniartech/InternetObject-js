import { describe, it, expect } from 'vitest';
import io, { parse, parseDocument } from '../../src/index';

/**
 * No sink means fail fast.
 *
 * `src/facade/error-sink.ts` has always said it — *"whether you pass one is the whole of the
 * fail-fast question: with no sink the first error throws, and with one, everything that can be
 * reported is"* — and it was only half true. A fatal error threw on its own, so a bad value in a
 * single record did raise. But a bad record inside a COLLECTION is recovered from, and the error
 * was pushed to the collector only `if (errorCollector)`. With no collector it was dropped, and
 * the caller got back an array holding an error node with nothing raised and nothing reported.
 *
 * That is the case these tests exist for: the author of a document, who wants to be told.
 */
const BAD_COLLECTION = 'age: int\n---\n~ 30\n~ abc\n~ 40';
const BAD_SINGLE = 'age: int\n---\nabc';

describe('no sink means fail fast', () => {
  describe('a bad record in a collection raises, where it used to come back as data', () => {
    it('parse', () => {
      expect(() => parse(BAD_COLLECTION)).toThrow();
      expect(() => parse(BAD_COLLECTION)).toThrowError(
        expect.objectContaining({ errorCode: 'expected-integer' })
      );
    });

    it('parseDocument', () => {
      expect(() => parseDocument(BAD_COLLECTION)).toThrow();
    });

    it('the io`` tag', () => {
      expect(() => io`age: int
---
~ 30
~ abc
~ 40`).toThrow();
    });

    it('the io.doc`` tag', () => {
      expect(() => io.doc`age: int
---
~ 30
~ abc
~ 40`).toThrow();
    });
  });

  describe('a single record already behaved this way, and still does', () => {
    it('parse', () => {
      expect(() => parse(BAD_SINGLE)).toThrow();
    });

    it('the tag', () => {
      expect(() => io`age: int
---
abc`).toThrow();
    });
  });

  describe('it is the FIRST error, carrying ALL of them (D2)', () => {
    it('raises the earliest failure, not the last', () => {
      let thrown: any;
      try { parse('age: int\n---\n~ abc\n~ nope'); } catch (e) { thrown = e; }
      expect(thrown.errorCode).toBe('expected-integer');
      expect(thrown.collectionIndex).toBe(0);
    });

    it('the thrown error carries the complete list as .errors', () => {
      let thrown: any;
      try { parse('age: int\n---\n~ abc\n~ 30\n~ nope'); } catch (e) { thrown = e; }
      expect(thrown.errors).toHaveLength(2);
      expect(thrown.errors[0]).toBe(thrown);
      expect(thrown.errors.map((e: any) => e.collectionIndex)).toEqual([0, 2]);
    });
  });

  describe('a sink is how you ask for recovery — that half is unchanged', () => {
    it('an array sink keeps the good records and reports the bad one', () => {
      const sink: Error[] = [];
      const rows: any = parse(BAD_COLLECTION, null, sink);
      expect(sink).toHaveLength(1);
      expect((sink[0] as any).errorCode).toBe('expected-integer');
      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual({ age: 30 });
      expect(rows[2]).toEqual({ age: 40 });
      expect(rows[1].__error).toBe(true);
    });

    it('a function sink does the same', () => {
      const seen: string[] = [];
      const rows: any = parse(BAD_COLLECTION, null, (e: any) => seen.push(e.errorCode));
      expect(seen).toEqual(['expected-integer']);
      expect(rows).toHaveLength(3);
    });

    it('an EMPTY array is still a sink — passing one is the whole opt-in', () => {
      expect(() => parse(BAD_COLLECTION, null, [])).not.toThrow();
    });

    it('and it works through a tag, in the same slot', () => {
      const sink: Error[] = [];
      const rows: any = io.with(null, sink)`age: int
---
~ 30
~ abc
~ 40`;
      expect(sink).toHaveLength(1);
      expect(rows).toHaveLength(3);
    });
  });

  describe('valid input is untouched', () => {
    it('parses without a sink, as it always did', () => {
      expect(parse('age: int\n---\n~ 30\n~ 40')).toEqual([{ age: 30 }, { age: 40 }]);
      expect(io`age: int
---
~ 30
~ 40`).toEqual([{ age: 30 }, { age: 40 }]);
    });
  });
});
