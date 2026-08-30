import { describe, it, expect } from 'vitest';
import { parseDocument } from '../../src/facade/parse';
import parseCore from '../../src/parser/index';
import { loadCollection } from '../../src/schema/load-processor';
import parseDefinitions from '../../src/parser/parse-defs';
import IOObject from '../../src/core/internet-object';
import IOCollection from '../../src/core/collection';
import { stringifyDocument } from '../../src/facade/stringify-document';

/**
 * B1 + B2 — a document that cannot hold invalid data.
 *
 * Parsing always validated; writing did not. A record knew its schema and `set('age', 'abc')` wrote
 * straight through, then serialized back out as invalid Internet Object text. Insertion had the same
 * hole from the other side: a pushed record carried no schema, so nothing checked it — and nothing
 * would check it later either.
 *
 * The two are one guarantee:
 *
 *   A schema-bearing document always holds valid data — at parse, load, write, insert and attach.
 *
 * Fixing only the write would leave every row the user ADDED unchecked, which is exactly the rows a
 * user is most likely to get wrong.
 */
const DOC = 'name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25';

describe('validated writes (B1)', () => {
  const record = () => (parseCore(DOC) as any).sections.get(0).data.getAt(0) as IOObject;

  it('a good write is stored and coerced exactly as parsing would', () => {
    const rec = record();
    rec.set('age', 31);
    expect(rec.get('age')).toBe(31);
  });

  it('a bad write throws, with the code a parse would have raised', () => {
    const rec = record();
    expect(() => rec.set('age', 'not-an-int')).toThrow(
      expect.objectContaining({ errorCode: 'expected-integer' })
    );
  });

  it('and leaves the record untouched — a refused write writes nothing', () => {
    const rec = record();
    try { rec.set('age', 'not-an-int'); } catch { /* expected */ }
    expect(rec.get('age')).toBe(30);
    expect(rec.toObject()).toEqual({ name: 'Alice', age: 30 });
  });

  it('the invalid value can no longer reach the serializer', () => {
    const doc: any = parseCore(DOC);
    const rec = doc.sections.get(0).data.getAt(0);
    try { rec.set('age', 'not-an-int'); } catch { /* expected */ }
    expect(stringifyDocument(doc)).toContain('Alice, 30');
  });

  it('a member the schema does not declare is refused on a closed schema', () => {
    expect(() => record().set('nickname', 'Al')).toThrow(
      expect.objectContaining({ errorCode: 'unknown-member' })
    );
  });

  it('an open schema accepts the extras it was told to accept', () => {
    const doc: any = parseCore('name: string, *\n---\n~ Alice');
    const rec = doc.sections.get(0).data.getAt(0);
    expect(() => rec.set('nickname', 'Al')).not.toThrow();
    expect(rec.get('nickname')).toBe('Al');
  });

  it('a schema-less object validates nothing — vacuously, not by exception', () => {
    const loose = new IOObject<any>();
    expect(loose.getSchema()).toBeNull();
    expect(() => loose.set('anything', { deeply: ['odd'] })).not.toThrow();
    expect(() => new IOObject({ a: 1, b: 'two' })).not.toThrow();
  });

  it('a member definition that names a variable is resolved on the write too', () => {
    // `choices: @sizes` has to mean the same thing at write time as at parse time; that needs the
    // definitions the schema was declared in, which is why the record keeps them.
    const doc: any = parseCore("~ @r: red\n~ $schema: {c: {string, choices: [@r]}}\n---\n~ c: red");
    const rec = doc.sections.get(0).data.getAt(0);
    expect(() => rec.set('c', 'red')).not.toThrow();
    expect(() => rec.set('c', 'blue')).toThrow();
  });

  it('setRaw is the internal way past it — and is what the loader uses', () => {
    const rec = record();
    expect(() => rec.setRaw('age', 'not-an-int' as any)).not.toThrow();
    expect(rec.get('age')).toBe('not-an-int');
  });

  it('the proxy inherits the check without knowing about it', () => {
    const doc = parseDocument(DOC);
    expect(() => { doc.data[0].age = 'not-an-int'; }).toThrow();
    expect(doc.data[0].age).toBe(30);
    doc.data[0].age = 31;
    expect(doc.data[0].age).toBe(31);
  });
});

describe('adopt on insert (B2)', () => {
  const rows = () => (parseCore(DOC) as any).sections.get(0).data as IOCollection<any>;

  it('a plain object is validated and becomes a record', () => {
    const list = rows();
    list.push({ name: 'Dev', age: 41 } as any);
    expect(list.length).toBe(3);
    expect(list.getAt(2)).toBeInstanceOf(IOObject);
    expect(list.getAt(2).toObject()).toEqual({ name: 'Dev', age: 41 });
  });

  it('an invalid one is refused at the point of insert', () => {
    const list = rows();
    expect(() => list.push({ name: 'Dev', age: 'nope' } as any)).toThrow();
    expect(list.length).toBe(2);
  });

  it('a record MISSING a required member is refused — not only a bad one', () => {
    // This is why adoption re-loads rather than checking member by member: a hand-built record is
    // wrong by what it omits at least as often as by what it holds.
    const list = rows();
    expect(() => list.push(new IOObject({ name: 'Dev' }) as any)).toThrow();
    expect(list.length).toBe(2);
  });

  it('the adopted record carries the schema — so its own writes are checked too', () => {
    const list = rows();
    list.push({ name: 'Dev', age: 41 } as any);
    const added = list.getAt(2);
    expect(added.getSchema()).toBe(list.getSchema());
    expect(() => added.set('age', 'nope')).toThrow();
  });

  it('a push that rejects one of several stores none of them', () => {
    const list = rows();
    expect(() => list.push(
      { name: 'A', age: 1 } as any,
      { name: 'B', age: 'no' } as any,
      { name: 'C', age: 3 } as any
    )).toThrow();
    expect(list.length).toBe(2);
  });

  it('setAt and insert adopt on the same terms as push', () => {
    const a = rows();
    a.setAt(0, { name: 'Zed', age: 9 } as any);
    expect(a.getAt(0).toObject()).toEqual({ name: 'Zed', age: 9 });
    expect(() => a.setAt(0, { name: 'Zed', age: 'no' } as any)).toThrow();

    const b = rows();
    b.insert(1, { name: 'Mid', age: 5 } as any);
    expect(b.getAt(1).toObject()).toEqual({ name: 'Mid', age: 5 });
    expect(() => b.insert(1, { name: 'Mid', age: 'no' } as any)).toThrow();
  });

  it('a schema-less collection adopts nothing and refuses nothing', () => {
    const loose = new IOCollection<any>();
    expect(loose.getSchema()).toBeNull();
    const item = { anything: true };
    loose.push(item as any);
    expect(loose.getAt(0)).toBe(item);           // stored as it is, identity intact
  });

  it('the loaded route gets the same guarantee as the parsed one', () => {
    const defs: any = parseDefinitions('~ $person: {name: string, age: int}');
    const list = loadCollection([{ name: 'Alice', age: 30 }], '$person', defs);
    expect(list.getSchema()).toBeTruthy();
    expect(() => list.push({ name: 'Bad', age: 'no' } as any)).toThrow();
  });

  it('records already in the collection are not re-validated on attach', () => {
    // Attaching happens after the parse loop, so the rows that were just built and checked are not
    // checked a second time. The observable form of that: parsing does not double-throw.
    expect(() => parseCore(DOC)).not.toThrow();
  });

  it('through the proxy, push reads the same way', () => {
    const doc = parseDocument(DOC);
    doc.data.push({ name: 'Dev', age: 41 });
    expect(doc.toObject()).toEqual([
      { name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }, { name: 'Dev', age: 41 },
    ]);
    expect(() => doc.data.push({ name: 'Dev', age: 'no' })).toThrow();
  });
});

describe('the invariant, end to end', () => {
  it('nothing serializes that was not validated first', () => {
    const doc = parseDocument(DOC);
    doc.data.push({ name: 'Dev', age: 41 });
    doc.data[0].age = 31;
    const text = stringifyDocument(doc);
    expect(text).toContain('Alice, 31');
    expect(text).toContain('Dev, 41');
    // and it round-trips
    expect(parseDocument(text).toObject()).toEqual(doc.toObject());
  });
});
