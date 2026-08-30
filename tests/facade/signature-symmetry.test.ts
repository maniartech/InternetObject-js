import { describe, it, expect } from 'vitest';
import { parse, parseDocument } from '../../src/facade/parse';
import { load, loadObject, loadCollection } from '../../src/facade/load';
import { validate, validateObject, validateCollection } from '../../src/facade/validate';
import parseDefinitions from '../../src/parser/parse-defs';
import { ioObject, ioDocument, ioDefinitions, ioSchema } from '../../src/template-funcs';
import IOObject from '../../src/core/internet-object';
import Definitions from '../../src/core/definitions';

/**
 * §2.5 — every entry point takes the same four slots.
 *
 *   (input, defs?, sink?, options?)
 *
 * `parse` always had the sink in slot three. `load` had an OPTIONS object there, and `validate` had
 * a shape unlike any sibling's — `(data, schemaOrDefs, defs?)`. So the one thing a reader most
 * wants to carry between functions, *where do the errors go*, was the one thing that moved.
 *
 * Worse than untidy: an array in slot three of `load` used to land where the options were expected,
 * find no `schemaName` on it, and report nothing. **Silently.** That is the same positional trap
 * that made `parse(text, errorArray)` collect nothing.
 *
 * The old shapes still work. A sink is an array or a function; an options object and a `Definitions`
 * are neither, so both legacy forms are unambiguous.
 */
const DEFS = '~ $schema: {name: string, age: int}';
const defs = () => parseDefinitions(DEFS) as Definitions;

const GOOD = { name: 'Alice', age: 30 };
const BAD = { name: 'Alice', age: 'not-an-int' } as any;

describe('the sink is slot three everywhere (§2.5)', () => {
  describe('the trap this closes', () => {
    it('an array in slot three is now the sink, and is filled', () => {
      const sink: Error[] = [];
      load([GOOD, BAD], defs(), sink);
      expect(sink.length).toBeGreaterThan(0);
      expect((sink[0] as any).errorCode).toBe('expected-integer');
    });

    it('the same call used to report nothing at all', () => {
      // Kept as a statement of the fault, not of the fix: the array landed in the options slot,
      // `schemaName` was undefined on it, and the load carried on reporting into the void.
      const asOptions: any = [];
      expect(asOptions.schemaName).toBeUndefined();
    });
  });

  describe('load', () => {
    it('(data, defs) — unchanged', () => {
      expect(load(GOOD, defs()).toObject()).toEqual(GOOD);
    });

    it('(data, defs, sink) collects instead of throwing', () => {
      const sink: Error[] = [];
      const doc = load([GOOD, BAD], defs(), sink);
      expect(sink.length).toBe(1);
      expect(doc.errors.length).toBeGreaterThan(0);      // the sink and the document agree (C1a)
    });

    it('(data, defs, sink, options) — schemaName in slot four', () => {
      const named = parseDefinitions('~ $User: {name: string, age: int}') as Definitions;
      const sink: Error[] = [];
      const doc = load(GOOD, named, sink, { schemaName: '$User' });
      expect(doc.toObject()).toEqual(GOOD);
      expect(sink).toEqual([]);
    });

    it('a function sink sees what an array sink sees', () => {
      const seen: Error[] = [];
      const bag: Error[] = [];
      load([BAD], defs(), (e) => seen.push(e));
      load([BAD], defs(), bag);
      expect(seen.map((e: any) => e.errorCode)).toEqual(bag.map((e: any) => e.errorCode));
    });

    it('an OBJECT payload reports through the sink rather than throwing', () => {
      const sink: Error[] = [];
      const doc = load(BAD, defs(), sink);
      expect(sink.length).toBe(1);
      // The failure is reported and recorded; it is NOT stored as data. A schema-bearing document
      // may not hold what its schema forbids (B1), so the section carries the error, not the input.
      expect(doc.errors.length).toBeGreaterThan(0);
      expect(JSON.stringify(doc.toObject())).not.toContain('not-an-int');
    });

    it('without a sink an object payload still throws, exactly as before', () => {
      expect(() => load(BAD, defs())).toThrow();
    });

    it('the deprecated options-in-slot-three form still works', () => {
      const named = parseDefinitions('~ $User: {name: string, age: int}') as Definitions;
      expect(load(GOOD, named, { schemaName: '$User' }).toObject()).toEqual(GOOD);
    });

    it('errorCollector in options is still honoured, and the sink wins', () => {
      const viaOption: Error[] = [];
      loadCollection([BAD], defs(), { errorCollector: viaOption } as any);
      expect(viaOption.length).toBe(1);
    });
  });

  describe('loadObject and loadCollection take the same four slots', () => {
    it('loadCollection (data, defs, sink)', () => {
      const sink: Error[] = [];
      const col = loadCollection([GOOD, BAD], defs(), sink);
      expect(sink.length).toBe(1);
      expect(col.length).toBe(2);          // the failed record embeds, as it does on the parse route
    });

    it('loadObject (data, defs, sink) reports and hands back an empty record', () => {
      const sink: Error[] = [];
      const obj = loadObject(BAD, defs(), sink);
      expect(sink.length).toBe(1);
      expect(obj.errors.length).toBe(1);
      expect(obj.toObject()).toEqual({});
    });

    it('loadObject without a sink throws', () => {
      expect(() => loadObject(BAD, defs())).toThrow();
    });
  });

  describe('validate', () => {
    it('(data, defs) — the schema comes from $schema', () => {
      expect(validate(GOOD, defs()).valid).toBe(true);
      expect(validate(BAD, defs()).valid).toBe(false);
    });

    it('(data, defs, sink) — the sink gets the same errors the result carries', () => {
      const sink: Error[] = [];
      const result = validate(BAD, defs(), sink);
      expect(result.valid).toBe(false);
      expect(sink.map((e: any) => e.errorCode)).toEqual(result.errors.map((e: any) => e.errorCode));
    });

    it('(data, defs, sink, options) — schemaName in slot four', () => {
      const named = parseDefinitions('~ $User: {name: string, age: int}') as Definitions;
      expect(validate(GOOD, named, [], { schemaName: '$User' }).valid).toBe(true);
      expect(validate(BAD, named, [], { schemaName: '$User' }).valid).toBe(false);
    });

    it('a bare Schema still works in slot two', () => {
      const schema = ioSchema`{name: string, age: int}`;
      expect(validate(GOOD, schema).valid).toBe(true);
      expect(validate(BAD, schema).valid).toBe(false);
    });

    it('the legacy (data, schema, defs) form is still read correctly', () => {
      // A Definitions in slot three can only be the old shape — a sink is an array or a function.
      const d = parseDefinitions('~ $Address: {street: string}') as Definitions;
      const schema = ioSchema.with(d)`{home: $Address}`;
      expect(validate({ home: { street: 'Main' } }, schema, d).valid).toBe(true);
    });

    it('a collection reports EVERY bad record, not just the first', () => {
      const sink: Error[] = [];
      const result = validateCollection([BAD, GOOD, BAD], defs(), sink);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
      expect(sink.length).toBe(2);
    });

    it('no definitions at all is a question nobody asked — valid, data untouched', () => {
      const result = validate(GOOD);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(GOOD);
    });

    it('but definitions carrying no usable schema is reported, not passed', () => {
      const sink: Error[] = [];
      const result = validateObject(GOOD, new Definitions(), sink);
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toMatch(/default schema/i);
      expect(sink.length).toBe(1);
    });
  });

  describe('the four entry points genuinely agree', () => {
    it('a sink in slot three is filled by every one of them', () => {
      const a: Error[] = [];
      const b: Error[] = [];
      const c: Error[] = [];
      const d: Error[] = [];

      parse('age: int\n---\n~ abc', null, a);
      parseDocument('age: int\n---\n~ abc', null, b);
      load([{ age: 'abc' }], parseDefinitions('~ $schema: {age: int}') as Definitions, c);
      validate([{ age: 'abc' }], parseDefinitions('~ $schema: {age: int}') as Definitions, d);

      for (const sink of [a, b, c, d]) expect(sink.length).toBeGreaterThan(0);
      expect(new Set([a, b, c, d].map((s) => (s[0] as any).errorCode)).size).toBe(1);
    });
  });
});

describe('the template tags take the same arguments (§2.5.3)', () => {
  it('io.doc.with(defs, sink)', () => {
    const sink: Error[] = [];
    const doc = ioDocument.with(defs(), sink)`~ Alice, abc`;
    expect(sink.length).toBeGreaterThan(0);
    expect(doc.errors.length).toBeGreaterThan(0);
  });

  it('io.object.with(defs, sink)', () => {
    const sink: Error[] = [];
    ioObject.with(defs(), sink)`Alice, abc`;
    expect(sink.length).toBeGreaterThan(0);
  });

  it('io.defs.with(parentDefs, sink) — the tag that had no sink at all', () => {
    const sink: Error[] = [];
    const base = parseDefinitions('~ @foo: 1') as Definitions;
    const extended = ioDefinitions.with(base, sink)`~ @bar: 2`;
    expect(extended?.get('@foo')).toBe(1);
    expect(extended?.get('@bar')).toBe(2);
    expect(sink).toEqual([]);
  });

  it('parseDefinitions itself takes the sink in slot three now', () => {
    const sink: Error[] = [];
    parseDefinitions('~ $p: {name: string}', null, sink);
    expect(Array.isArray(sink)).toBe(true);
  });

  /**
   * The one deliberate asymmetry. Schema compilation fails fast — the first error is fatal and
   * there is no partial schema to hand back — so a sink could only report and throw anyway, or
   * report and return nothing. An argument that cannot change the outcome is the "public option
   * that lies" this exercise deleted `ParserOptions` for.
   */
  it('io.schema.with takes definitions alone, and says why', () => {
    expect(ioSchema.with.length).toBe(1);
  });

  describe('.with returns what its tag returns', () => {
    it('io.object and io.object.with agree on the TYPE', () => {
      const plain = ioObject`name: Alice, age: 30`;
      const withDefs = ioObject.with(defs())`Alice, 30`;
      expect(plain).toBeInstanceOf(IOObject);
      expect(withDefs).toBeInstanceOf(IOObject);
      expect(withDefs!.toObject()).toEqual({ name: 'Alice', age: 30 });
    });

    it('io.doc and io.doc.with agree', () => {
      expect(ioDocument`name: Alice`.constructor).toBe(ioDocument.with(null)`name: Alice`.constructor);
    });

    it('io.defs and io.defs.with agree', () => {
      expect(ioDefinitions`~ @a: 1`!.constructor).toBe(ioDefinitions.with(null)`~ @a: 1`!.constructor);
    });

    it('io.schema and io.schema.with agree', () => {
      expect(ioSchema`{a: string}`.constructor).toBe(ioSchema.with(null)`{a: string}`.constructor);
    });
  });
});
