import { describe, it, expect } from 'vitest';
import parse from '../../src/parser/index';
import { proxyDocument, IO_NODE } from '../../src/proxy';
import { section, sections, header, isError, node } from '../../src/facade/accessors';
import IODocument from '../../src/core/document';
import IOObject from '../../src/core/internet-object';
import IOCollection from '../../src/core/collection';

/**
 * A4 — the proxied document.
 *
 * Five hops become two:
 *
 *   doc.sections.get(0).data.getAt(0).get('name')   →   doc.sections.employees[0].name
 *
 * The rule under all of it is JavaScript's own (§7.2): data is own and enumerable, methods are
 * prototype and non-enumerable, so data shadows a method on a direct read and a key walk never sees
 * a method at all. Everything below is that rule, checked.
 */
const proxied = (text: string) => proxyDocument(parse(text));

const TWO_SECTIONS =
  '~ $p: {name: string, age: int}\n' +
  '--- employees: $p\n~ Alice, 30\n~ Bob, 25\n' +
  '--- managers: $p\n~ Carol, 41';

describe('the proxied document (A4)', () => {
  describe('reaching a value', () => {
    const doc = proxied(TWO_SECTIONS);

    it('by section name, then by index, then by member name', () => {
      expect(doc.sections.employees[0].name).toBe('Alice');
      expect(doc.sections.employees[1].age).toBe(25);
      expect(doc.sections.managers[0].name).toBe('Carol');
    });

    it('dot and bracket are the same operation', () => {
      expect(doc.sections['employees'][0].name).toBe('Alice');
    });

    it('by position, for a section whose name is not a JS identifier or not known', () => {
      expect(doc.sections[0][0].name).toBe('Alice');
      expect(doc.sections[1][0].name).toBe('Carol');
    });

    it('an out-of-range index is undefined, not a throw', () => {
      expect(doc.sections.employees[99]).toBeUndefined();
      expect(doc.sections.nosuch).toBeUndefined();
    });
  });

  describe('doc.data is doc.sections.data — not a special case', () => {
    it('is the section a document gets when it names none', () => {
      const doc = proxied('name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25');
      expect(doc.data[0].name).toBe('Alice');
      expect(doc.data.length).toBe(2);
      expect(doc.data).toBe(doc.sections.data);
    });

    it('is undefined when the sections ARE named', () => {
      expect(proxied(TWO_SECTIONS).data).toBeUndefined();
    });

    it('holds the object directly when the document is a single object', () => {
      const doc = proxied('name: string, age: int\n---\nname: Alice, age: 30');
      expect(doc.data.name).toBe('Alice');
    });
  });

  describe('enumeration yields data only', () => {
    const doc = proxied(TWO_SECTIONS);

    it('on a collection: numeric keys, like an array', () => {
      expect(Object.keys(doc.sections.employees)).toEqual(['0', '1']);
      expect(doc.sections.employees.length).toBe(2);
    });

    it('on a record: the member names, in schema order', () => {
      expect(Object.keys(doc.sections.employees[0])).toEqual(['name', 'age']);
      expect({ ...doc.sections.employees[0] }).toEqual({ name: 'Alice', age: 30 });
    });

    it('on a section collection: the section names', () => {
      expect(Object.keys(doc.sections)).toEqual(['employees', 'managers']);
    });

    it('for..in and JSON.stringify agree with Object.keys', () => {
      const rec = doc.sections.employees[0];
      expect([...(function* () { for (const k in rec) yield k; })()]).toEqual(['name', 'age']);
      expect(JSON.parse(JSON.stringify(rec))).toEqual({ name: 'Alice', age: 30 });
    });

    it('the document keeps no enumerable own keys, exactly as it does today', () => {
      expect(Object.keys(doc)).toEqual([]);
      expect(Object.keys(parse(TWO_SECTIONS))).toEqual([]);
    });
  });

  describe('data shadows methods, and the functional forms do not', () => {
    // A section really called `length`, and a member really called `get`.
    const doc = proxied('~ $s: {get: string}\n--- length: $s\n~ shadowed');

    it('a section named `length` resolves to the section', () => {
      expect(doc.sections.length[0].get).toBe('shadowed');
    });

    it('io.sections() still answers the count', () => {
      expect(Object.keys(sections(doc)).length).toBe(1);
      expect(Object.keys(sections(doc))).toEqual(['length']);
    });

    it('a member named `get` resolves to the member', () => {
      const rec = doc.sections.length[0];
      expect(rec.get).toBe('shadowed');
      expect(typeof rec.get).toBe('string');           // not the method
    });

    it('io.node() reaches the method layer past the shadow', () => {
      const rec = doc.sections.length[0];
      expect(node(rec).get('get')).toBe('shadowed');
      expect(node(rec)).toBeInstanceOf(IOObject);
    });

    it('a method still resolves when no data shadows it', () => {
      const rows = proxied(TWO_SECTIONS).sections.employees;
      expect(typeof rows.getAt).toBe('function');
      expect(rows.getAt(0).name).toBe('Alice');
    });
  });

  describe('anything a proxy hands back is proxied', () => {
    const rows = () => proxied(TWO_SECTIONS).sections.employees;

    it('for..of yields proxies — the reason a write inside a loop reaches the node', () => {
      const names: string[] = [];
      for (const r of rows()) names.push(r.name);
      expect(names).toEqual(['Alice', 'Bob']);
    });

    it('callbacks receive proxies', () => {
      expect(rows().map((r: any) => r.name).join(', ')).toBe('Alice, Bob');
      expect(rows().filter((r: any) => r.age > 26).length).toBe(1);
      expect(rows().find((r: any) => r.name === 'Bob').age).toBe(25);
    });

    it('a method that returns a collection returns a proxied one — chaining survives', () => {
      expect(rows().filter((r: any) => r.age > 26)[0].name).toBe('Alice');
      expect(rows().slice(1)[0].name).toBe('Bob');
    });

    it('a proxy handed back in is unwrapped, so identity comparisons still work', () => {
      const r = rows();
      expect(r.indexOf(r[1])).toBe(1);
      expect(r.includes(r[0])).toBe(true);
    });

    it('proxies are memoized per node — the same object every time', () => {
      const doc = proxied(TWO_SECTIONS);
      expect(doc.sections.employees[0]).toBe(doc.sections.employees[0]);
      expect(doc.sections).toBe(doc.sections);
    });
  });

  describe('writing', () => {
    it('assignment delegates to IOObject.set()', () => {
      const doc = proxied(TWO_SECTIONS);
      doc.sections.employees[0].age = 31;
      expect(doc.sections.employees[0].age).toBe(31);
      expect(doc.toObject().employees[0].age).toBe(31);     // it reached the node, not a copy
    });

    it('a write inside for..of reaches the node', () => {
      const doc = proxied(TWO_SECTIONS);
      for (const r of doc.sections.employees) r.age = 40;
      expect(doc.toObject().employees.map((r: any) => r.age)).toEqual([40, 40]);
    });

    it('delete removes the member', () => {
      const doc = proxied(TWO_SECTIONS);
      delete doc.sections.employees[0].age;
      expect(Object.keys(doc.sections.employees[0])).toEqual(['name']);
    });

    it('replacing a record by index goes through setAt', () => {
      const doc = proxied(TWO_SECTIONS);
      doc.sections.employees[1] = new IOObject({ name: 'Dev', age: 41 });
      expect(doc.sections.employees[1].name).toBe('Dev');
    });
  });

  describe('the ecosystem checks that made a plain target necessary', () => {
    const doc = proxied(TWO_SECTIONS);

    it('a record passes the isPlainObject test every utility library makes', () => {
      const rec = doc.sections.employees[0];
      expect(rec.constructor).toBe(Object);
      expect(Object.getPrototypeOf(rec)).toBe(Object.prototype);
    });

    it('the containers still report their real prototype, so instanceof holds', () => {
      expect(doc).toBeInstanceOf(IODocument);
      expect(node(doc)).toBeInstanceOf(IODocument);
      expect(node(doc.sections.employees)).toBeInstanceOf(IOCollection);
    });

    it('`in` agrees with the key walk', () => {
      const rec = doc.sections.employees[0];
      expect('name' in rec).toBe(true);
      expect('nope' in rec).toBe(false);
      expect('employees' in doc.sections).toBe(true);
    });
  });

  describe('the functional forms', () => {
    const doc = proxied(TWO_SECTIONS);

    it('io.section() gives the section OBJECT, not its data', () => {
      expect(section(doc, 'employees')!.name).toBe('employees');
      expect(section(doc, 'employees')!.schemaName).toBe('$p');
      expect(section(doc, 0)!.name).toBe('employees');
      expect(section(doc, 'nosuch')).toBeUndefined();
    });

    it('io.sections() is always keyed — never unwrapped, whatever the count', () => {
      expect(Object.keys(sections(doc))).toEqual(['employees', 'managers']);
      const single = proxied('name: string\n---\n~ Alice');
      expect(Object.keys(sections(single))).toEqual(['data']);
      expect(single.toObject()).toEqual([{ name: 'Alice' }]);   // the projection DOES unwrap
    });

    it('io.header() reaches the header, which the projection does not carry', () => {
      const d = proxied('~ $p: {name: string}\n~ @env: prod\n--- users: $p\n~ Alice');
      expect(header(d)!.definitions!.getValue('@env')).toBe('prod');
      expect(d.toObject()).toEqual([{ name: 'Alice' }]);   // @env is nowhere in the projection
    });

    it('every functional form accepts a bare document as readily as a proxied one', () => {
      const raw = parse(TWO_SECTIONS);
      expect(section(raw, 'employees')!.name).toBe('employees');
      expect(Object.keys(sections(raw))).toEqual(['employees', 'managers']);
      expect(header(raw)).toBe(header(proxyDocument(raw)));
    });

    it('io.node() is the identity on something that is not a proxy', () => {
      const raw = parse(TWO_SECTIONS);
      expect(node(raw)).toBe(raw);
      expect(node(42)).toBe(42);
      expect(node(null)).toBe(null);
    });
  });

  describe('io.isError covers both shapes an error arrives in', () => {
    it('true for a failed record, false for a good one', () => {
      const bag: Error[] = [];
      const doc = proxyDocument(parse('age: int\n---\n~ 30\n~ abc\n~ 40', null, bag));
      const rows = doc.data;
      expect(isError(rows[0])).toBe(false);
      expect(isError(rows[1])).toBe(true);
      expect(rows.filter((r: any) => !isError(r)).length).toBe(2);
    });

    it('true for the projected shape too — and ONLY for the real class (ADR 0006 D4)', () => {
      // A plain `{ __error: true }` is writable as DATA (a schema may declare an `__error`
      // member), so the literal no longer counts. Only the class the library itself embeds does.
      const rows: any = parse('age: int\n---\n~ abc', null, []).toObject();
      expect(isError(rows[0])).toBe(true);
      expect(isError({ __error: true, message: 'x' })).toBe(false);
      expect(isError({ name: 'Alice' })).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError('nope')).toBe(false);
    });
  });

  describe('the node is always reachable', () => {
    it('through IO_NODE, on every proxy', () => {
      const doc = proxied(TWO_SECTIONS);
      expect(doc[IO_NODE]).toBeInstanceOf(IODocument);
      expect(doc.sections.employees[IO_NODE]).toBeInstanceOf(IOCollection);
      expect(doc.sections.employees[0][IO_NODE]).toBeInstanceOf(IOObject);
    });

    it('and toObject() still projects exactly what the bare document projects', () => {
      expect(proxied(TWO_SECTIONS).toObject()).toEqual(parse(TWO_SECTIONS).toObject());
      expect(proxied(TWO_SECTIONS).toJSON()).toEqual(parse(TWO_SECTIONS).toJSON());
    });
  });
});
