import { describe, it, expect } from 'vitest';
import io, { ioParse, ioDocument } from '../../src/index';
import IODocument from '../../src/core/document';
import { parse, parseDocument } from '../../src/facade/parse';

/**
 * The bare `io` tag.
 *
 * The API's rule is *plain by default, the document when you ask for it by name*, and `parse` /
 * `parseDocument` honour it. The tags did not: every one of them returned a node type, and `io`
 * itself was not callable at all — `` io`name: Alice` `` threw `io is not a function`.
 *
 * So the pairing these tests pin is:
 *
 *     io``      ≡  parse(text)          → plain JavaScript
 *     io.doc``  ≡  parseDocument(text)  → the proxied document
 *
 * Both halves were broken. The first did not exist; the second existed but called the *core*
 * parser, so `` io.doc`…`.data `` was `undefined` where `parseDocument(…).data` gave the section.
 */
const TEXT = 'name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25';
const ROWS = [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }];

describe('the bare io tag', () => {
  describe('io`` is parse in tag form', () => {
    it('is callable — the whole point, and what used to throw', () => {
      expect(typeof io).toBe('function');
    });

    it('hands back plain JavaScript, not a node', () => {
      const rows: any = io`name: string, age: int
---
~ Alice, 30
~ Bob, 25`;
      expect(rows).toEqual(ROWS);
      expect(rows[0].constructor).toBe(Object);
    });

    it('a single record stays an object', () => {
      expect(io`name: string, age: int
---
Alice, 30`).toEqual({ name: 'Alice', age: 30 });
    });

    it('agrees with parse() exactly — one pipeline, not two', () => {
      expect(io`name: string, age: int
---
~ Alice, 30
~ Bob, 25`).toEqual(parse(TEXT));
    });

    it('writes an interpolated value AS a value, never as source', () => {
      const name = 'Smith, John';
      // Spliced in as source this is two members; as a value it is one string.
      expect(io`name: string, qty: string
---
${name}, ${'1,000'}`).toEqual({ name: 'Smith, John', qty: '1,000' });
    });
  });

  describe('io.doc`` is parseDocument in tag form', () => {
    it('returns the PROXIED document — `.data` reaches the section', () => {
      const doc: any = io.doc`name: string, age: int
---
Alice, 30`;
      expect(doc.data.name).toBe('Alice');
    });

    it('is writable in place, and the write validates', () => {
      const doc: any = io.doc`name: string, age: int
---
Alice, 30`;
      doc.data.age = 31;
      expect(doc.data.age).toBe(31);
      expect(() => { doc.data.age = 'not-an-int'; }).toThrow();
    });

    it('projects to what the bare tag returns', () => {
      const doc: any = io.doc`name: string, age: int
---
~ Alice, 30
~ Bob, 25`;
      expect(doc.toObject()).toEqual(ROWS);
      expect(doc.toObject()).toEqual(io`name: string, age: int
---
~ Alice, 30
~ Bob, 25`);
    });

    it('reports its class, and reports it stably', () => {
      const doc: any = io.doc`name: Alice`;
      // `member()` used to bind this into a fresh arrow per access, so a same-type comparison
      // between two documents — or between a document and itself — was false.
      expect(doc.constructor).toBe(IODocument);
      expect(doc.constructor).toBe(doc.constructor);
      expect(doc.constructor).toBe((parseDocument('name: Alice') as any).constructor);
    });
  });

  describe('.with(defs, sink) — the same slots as every other tag (§2.5)', () => {
    it('applies a schema, and returns what the bare tag returns', () => {
      const person = io.schema`{name: string, age: int}`;
      expect(io.with(person)`Alice, 30`).toEqual({ name: 'Alice', age: 30 });
    });

    it('takes an array sink in slot two', () => {
      const sink: Error[] = [];
      const out: any = io.with(null, sink)`name: string, age: int
---
Alice, notanint`;
      expect(sink).toHaveLength(1);
      expect((sink[0] as any).errorCode).toBe('expected-integer');
      expect(out.name).toBe('Alice');
    });

    it('takes a function sink in the same slot', () => {
      const seen: string[] = [];
      io.with(null, (e: any) => seen.push(e.errorCode))`name: string, age: int
---
Alice, notanint`;
      expect(seen).toEqual(['expected-integer']);
    });

    it('throws on the first error when no sink is given', () => {
      expect(() => io.with(null)`name: string, age: int
---
Alice, notanint`).toThrow();
    });
  });

  describe('the named export', () => {
    it('ioParse is the same tag as the default export', () => {
      expect(ioParse`name: Alice`).toEqual(io`name: Alice`);
    });

    it('carries only `.with` — the facade members hang off `io`, not off the tag', () => {
      // `io` is `Object.assign(wrapper, {…40 members})`. Assigning onto `ioParse` itself would
      // give everyone importing it by name a function with `ioParse.stringify` on it.
      expect(Object.keys(ioParse)).toEqual(['with']);
    });

    it('the other four tags are untouched', () => {
      expect(typeof ioDocument).toBe('function');
      expect(io.doc).toBe(ioDocument);
      expect(io.parse('name: Alice')).toEqual({ name: 'Alice' });
    });
  });
});
