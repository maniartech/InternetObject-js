import { describe, it, expect } from 'vitest';
import parseCore from '../../src/parser/index';
import parseDefinitions from '../../src/parser/parse-defs';
import IOObject from '../../src/core/internet-object';
import IOCollection from '../../src/core/collection';

/**
 * B4 — attaching a schema validates what is already there.
 *
 * Attaching was the fifth way data could enter a schema-bearing container unchecked. Parse, load,
 * write and insert were closed by B1 and B2; this closes the last one, and the invariant becomes
 * uncaveated:
 *
 *   A schema-bearing document always holds valid data.
 *
 * **Two forms, both atomic.** Without a sink it throws and nothing is attached. With a sink it
 * reports every mismatch and *still* changes nothing — which makes it the answer to
 * "does this data satisfy that schema?", a capability rather than a side effect.
 *
 * ⚠ This departs from PUBLIC-API-SPEC §4.3, which had the sink form attach anyway and embed error
 * nodes. That would leave a schema-bearing container holding data its own schema forbids — the one
 * thing the invariant exists to prevent — so the sink form checks instead.
 */
const SCHEMA = '~ $person: {name: string, age: int}';
const schemaOf = (src = SCHEMA, name = '$person') => (parseDefinitions(src) as any).getV(name);
const defsOf = (src = SCHEMA) => parseDefinitions(src) as any;

describe('attach validates a record (B4)', () => {
  it('a record that fits gets the schema', () => {
    const rec = new IOObject<any>();
    rec.set('name', 'Alice');
    rec.set('age', 30);
    rec.attachSchema(schemaOf(), defsOf());
    expect(rec.getSchema()).toBeTruthy();
    expect(rec.toObject()).toEqual({ name: 'Alice', age: 30 });
  });

  it('a record that does not throws, and nothing is attached', () => {
    const rec = new IOObject<any>();
    rec.set('name', 'Alice');
    rec.set('age', 'not-an-int');
    expect(() => rec.attachSchema(schemaOf(), defsOf())).toThrow();
    expect(rec.getSchema()).toBeNull();
    expect(rec.get('age')).toBe('not-an-int');    // untouched
  });

  it('a MISSING required member is caught too', () => {
    const rec = new IOObject<any>();
    rec.set('name', 'Alice');
    expect(() => rec.attachSchema(schemaOf(), defsOf())).toThrow();
    expect(rec.getSchema()).toBeNull();
  });

  it('with a sink it is a check: errors reported, nothing changed', () => {
    const rec = new IOObject<any>();
    rec.set('name', 'Alice');
    rec.set('age', 'not-an-int');
    const sink: Error[] = [];
    rec.attachSchema(schemaOf(), defsOf(), sink);
    expect(sink.length).toBeGreaterThan(0);
    expect(rec.getSchema()).toBeNull();
    expect(rec.get('age')).toBe('not-an-int');
  });

  it('an empty record is attached without a check — that is what the parser does', () => {
    const rec = new IOObject<any>();
    expect(() => rec.attachSchema(schemaOf(), defsOf())).not.toThrow();
    expect(rec.getSchema()).toBeTruthy();
  });

  it('attaching takes the values the LOAD produced, not merely its verdict', () => {
    // Visible where the schema supplies something the object did not have: a default is filled in,
    // so what is attached is the record the schema describes and not the one that was handed over.
    const withDefault = '~ $p: {name: string, tier?: {string, default: basic}}';
    const rec = new IOObject<any>();
    rec.set('name', 'Alice');
    rec.attachSchema(schemaOf(withDefault, '$p'), defsOf(withDefault));
    expect(rec.toObject()).toEqual({ name: 'Alice', tier: 'basic' });
  });

  it('a string where the schema says int is REJECTED, not quietly coerced', () => {
    const rec = new IOObject<any>();
    rec.set('name', 'Alice');
    rec.set('age', '30');
    expect(() => rec.attachSchema(schemaOf(), defsOf())).toThrow(
      expect.objectContaining({ errorCode: 'expected-integer' })
    );
  });

  it('and the writes that follow are checked, because the schema is really on', () => {
    const rec = new IOObject<any>();
    rec.set('name', 'Alice');
    rec.set('age', 30);
    rec.attachSchema(schemaOf(), defsOf());
    expect(() => rec.set('age', 'nope')).toThrow();
  });

  it('detaching is unaffected — null still just stops the rule', () => {
    const rec = new IOObject<any>();
    rec.set('name', 'Alice');
    rec.set('age', 30);
    rec.attachSchema(schemaOf(), defsOf()).attachSchema(null);
    expect(rec.getSchema()).toBeNull();
    expect(() => rec.set('age', 'anything')).not.toThrow();
  });
});

describe('attach validates a collection (B4)', () => {
  const collectionOf = (items: any[]) => new IOCollection<any>(items.map((i) => new IOObject(i)));

  it('every record fitting means the schema goes on', () => {
    const rows = collectionOf([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]);
    rows.attachSchema(schemaOf(), defsOf());
    expect(rows.getSchema()).toBeTruthy();
    expect(rows.toObject()).toEqual([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]);
  });

  it('one bad record throws, and the collection is untouched', () => {
    const rows = collectionOf([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 'no' }]);
    expect(() => rows.attachSchema(schemaOf(), defsOf())).toThrow();
    expect(rows.getSchema()).toBeNull();
    expect(rows.getAt(1).get('age')).toBe('no');
  });

  it('with a sink, EVERY bad record is reported — not just the first', () => {
    const rows = collectionOf([
      { name: 'Alice', age: 'no' }, { name: 'Bob', age: 30 }, { name: 'Cara', age: 'nope' },
    ]);
    const sink: Error[] = [];
    rows.attachSchema(schemaOf(), defsOf(), sink);
    expect(sink.length).toBe(2);
    expect(rows.getSchema()).toBeNull();
  });

  it('records become the ones the load produced — defaults and all', () => {
    const withDefault = '~ $p: {name: string, tier?: {string, default: basic}}';
    const rows = collectionOf([{ name: 'Alice' }]);
    rows.attachSchema(schemaOf(withDefault, '$p'), defsOf(withDefault));
    expect(rows.toObject()).toEqual([{ name: 'Alice', tier: 'basic' }]);
  });

  it('and insertions afterwards are adopted, because the schema is really on', () => {
    const rows = collectionOf([{ name: 'Alice', age: 30 }]);
    rows.attachSchema(schemaOf(), defsOf());
    expect(() => rows.push({ name: 'Bad', age: 'no' } as any)).toThrow();
    rows.push({ name: 'Dev', age: 41 } as any);
    expect(rows.length).toBe(2);
  });

  it('an empty collection attaches without a check', () => {
    const rows = new IOCollection<any>();
    expect(() => rows.attachSchema(schemaOf(), defsOf())).not.toThrow();
    expect(rows.getSchema()).toBeTruthy();
  });
});

describe('the fifth door is closed', () => {
  it('parsing does not pay for it — the parser declares, it does not re-check', () => {
    // `declareSchema` is the internal route: the parser and loader validate as they build, and
    // checking again on attach would validate every parsed record twice.
    const doc: any = parseCore('name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25');
    expect(doc.toObject()).toEqual([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]);
    expect(doc.sections.get(0).data.getSchema()).toBeTruthy();
  });

  it('no route reaches a schema-bearing container holding data it forbids', () => {
    const rows = new IOCollection<any>();
    rows.attachSchema(schemaOf(), defsOf());
    expect(() => rows.push({ name: 'X', age: 'no' } as any)).toThrow();       // insert
    rows.push({ name: 'X', age: 1 } as any);
    expect(() => rows.getAt(0).set('age', 'no')).toThrow();                   // write
    expect(() => rows.attachSchema(schemaOf('~ $person: {name: string, age: string}'), defsOf()))
      .toThrow();                                                             // attach
    expect(rows.toObject()).toEqual([{ name: 'X', age: 1 }]);
  });
});
