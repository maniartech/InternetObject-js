import { describe, it, expect } from 'vitest';
import parse from '../../src/parser/index';
import { load, loadObject, loadCollection, parseDefinitions } from '../../src/index';
import InternetObject from '../../src/core/internet-object';

/**
 * A member the schema declares sits where the SCHEMA puts it, not where it arrived.
 *
 * The rule, in full:
 *
 *   - a member the schema declares is at the schema's position for it, whatever order the values
 *     came in;
 *   - a member the schema does not declare — the extras an open (`*`) schema permits — follows the
 *     declared members, in arrival order;
 *   - with NO schema attached there is no guarantee at all, and members stay in insertion order.
 *     That is not a gap; it is the only order anybody could mean when no shape was declared.
 *
 * Why it matters: `getAt(1)` has to mean the same thing however the object was built. Before this,
 * it did not. `parse()` kept document order while `load()` kept schema order, so the identical
 * data reached two different layouts depending only on which door it came through — and `set()`
 * after construction appended, so an object could not even be assembled into its own shape.
 *
 * The suite of 5,034 did not notice, and neither did the 478-case both-paths gate. The gate
 * compares the two routes order-sensitively; it simply had no case that wrote keyed members out
 * of schema order. Hence `keyed_out_of_schema_order` in the corpus, and hence this file.
 */

const SCHEMA = '~ $schema: {name?: string, age?: int, email?: email, city?: string}';
const OPEN_SCHEMA = '~ $schema: {name?: string, age?: int, email?: email, city?: string, *}';
const OPEN = '~ $schema: {name?: string, age?: int, *}';

/** The member names, in the order the object actually holds them. */
function order(o: any): (string | undefined)[] {
  const out: (string | undefined)[] = [];
  for (let i = 0; i < o.length; i++) out.push(o.keyAt(i));
  return out;
}

/** The record an unnamed single-section document parsed or loaded to. */
const recordOf = (doc: any) => doc.sections.get(0).data;

/**
 * Member names of a nested value, whichever shape the route produced it in — an `IOObject` from
 * the text route, a plain object from the native one. See the pinning case at the bottom.
 */
function memberNames(value: any): (string | undefined)[] {
  return typeof value?.keyAt === 'function' ? order(value) : Object.keys(value ?? {});
}

describe('members sit where the schema puts them', () => {
  describe('every route agrees, whatever order the values arrive in', () => {
    const expected = ['name', 'age', 'city'];

    it('parse() — keyed members written out of schema order', () => {
      const doc = parse(`${SCHEMA}\n---\ncity: NYC, age: 30, name: Alice`, null);
      expect(order(recordOf(doc))).toEqual(expected);
    });

    it('load() — JavaScript keys in reverse schema order', () => {
      const doc = load({ city: 'NYC', age: 30, name: 'Alice' }, parseDefinitions(SCHEMA));
      expect(order(recordOf(doc))).toEqual(expected);
    });

    it('loadObject()', () => {
      expect(order(loadObject({ city: 'NYC', age: 30, name: 'Alice' }, parseDefinitions(SCHEMA))))
        .toEqual(expected);
    });

    it('loadCollection() — every record, independently', () => {
      const col: any = loadCollection(
        [{ city: 'NYC', age: 30, name: 'Alice' }, { age: 25, name: 'Bob' }],
        parseDefinitions(SCHEMA)
      );
      expect(order(col.getAt(0))).toEqual(expected);
      expect(order(col.getAt(1))).toEqual(['name', 'age']);
    });

    it('the text route and the native route reach the SAME layout', () => {
      const viaText = recordOf(parse(`${SCHEMA}\n---\ncity: NYC, age: 30, name: Alice`, null));
      const viaLoad = recordOf(load({ city: 'NYC', age: 30, name: 'Alice' }, parseDefinitions(SCHEMA)));
      expect(order(viaText)).toEqual(order(viaLoad));
    });
  });

  describe('positional access means one thing', () => {
    it('getAt() follows the schema, not the document', () => {
      const rec: any = recordOf(parse(`${SCHEMA}\n---\ncity: NYC, age: 30, name: Alice`, null));
      expect(rec.getAt(0)).toBe('Alice');
      expect(rec.getAt(1)).toBe(30);
      expect(rec.getAt(2)).toBe('NYC');
    });

    it('keyAt() agrees with getAt()', () => {
      const rec: any = recordOf(parse(`${SCHEMA}\n---\ncity: NYC, name: Alice`, null));
      expect(rec.keyAt(0)).toBe('name');
      expect(rec.keyAt(1)).toBe('city');
    });

    it('get() still finds every member after the move', () => {
      const rec: any = recordOf(parse(`${SCHEMA}\n---\ncity: NYC, age: 30, name: Alice`, null));
      expect(rec.get('name')).toBe('Alice');
      expect(rec.get('age')).toBe(30);
      expect(rec.get('city')).toBe('NYC');
      expect(rec.indexOfKey('city')).toBe(2);
    });
  });

  describe('extras follow the declared members', () => {
    it('parse() with an open schema', () => {
      const doc = parse(`${OPEN}\n---\nzzz: 1, age: 30, extra: 2, name: Alice`, null);
      expect(order(recordOf(doc))).toEqual(['name', 'age', 'zzz', 'extra']);
    });

    it('load() with an open schema', () => {
      const doc = load({ zzz: 1, age: 30, extra: 2, name: 'Alice' }, parseDefinitions(OPEN));
      expect(order(recordOf(doc))).toEqual(['name', 'age', 'zzz', 'extra']);
    });

    it('extras keep their own arrival order among themselves', () => {
      const doc = parse(`${OPEN}\n---\nzzz: 1, extra: 2, name: Alice`, null);
      expect(order(recordOf(doc))).toEqual(['name', 'zzz', 'extra']);
    });
  });

  describe('set() and push() place, rather than append', () => {
    const shaped = () => loadObject({ name: 'Alice' }, parseDefinitions(SCHEMA));

    it('a declared member lands at its slot however late it is set', () => {
      const o: any = shaped();
      o.set('city', 'NYC');
      o.set('age', 30);
      expect(order(o)).toEqual(['name', 'age', 'city']);
      expect(o.getAt(1)).toBe(30);
    });

    it('the LAST declared member set first still ends up last', () => {
      const o: any = shaped();
      o.set('city', 'NYC');
      o.set('email', 'a@b.com');
      o.set('age', 30);
      expect(order(o)).toEqual(['name', 'age', 'email', 'city']);
    });

    it('push([key, value]) places the same way', () => {
      const o: any = shaped();
      o.push(['city', 'NYC']);
      o.push(['age', 30]);
      expect(order(o)).toEqual(['name', 'age', 'city']);
    });

    it('an undeclared member appends, and stays behind the declared ones', () => {
      const o: any = loadObject({ name: 'Alice' }, parseDefinitions(OPEN));
      o.set('zzz', 1);
      o.set('age', 30);
      expect(order(o)).toEqual(['name', 'age', 'zzz']);
    });

    it('updating an existing member does not move it', () => {
      const o: any = shaped();
      o.set('age', 30);
      o.set('name', 'Bob');
      expect(order(o)).toEqual(['name', 'age']);
      expect(o.get('name')).toBe('Bob');
    });
  });

  describe('no schema, no guarantee — insertion order stands', () => {
    it('parse() without a schema keeps document order', () => {
      const doc = parse('city: NYC, age: 30, name: Alice', null);
      expect(order(recordOf(doc))).toEqual(['city', 'age', 'name']);
    });

    it('a bare IOObject appends, as it always did', () => {
      const o = new InternetObject();
      o.set('city', 'NYC');
      o.set('name', 'Alice');
      expect(order(o)).toEqual(['city', 'name']);
      expect(o.getSchema()).toBeNull();
    });

    it('applySchemaOrder() is a no-op with nothing attached', () => {
      const o = new InternetObject();
      o.set('city', 'NYC');
      o.set('name', 'Alice');
      o.applySchemaOrder();
      expect(order(o)).toEqual(['city', 'name']);
    });
  });

  describe('attachSchema() declares; applySchemaOrder() rearranges', () => {
    const schemaOf = (src: string) => (parseDefinitions(src) as any).getV('$schema');

    it('attaching alone leaves the members where they are', () => {
      const o = new InternetObject();
      o.set('city', 'NYC');
      o.set('name', 'Alice');
      o.attachSchema(schemaOf(SCHEMA));
      // Deliberate: a setter that silently rearranges an object you just handed it is a surprise.
      expect(order(o)).toEqual(['city', 'name']);
    });

    it('applySchemaOrder() is the voluntary step that rearranges', () => {
      const o = new InternetObject();
      o.set('city', 'NYC');
      o.set('name', 'Alice');
      o.attachSchema(schemaOf(SCHEMA)).applySchemaOrder();
      expect(order(o)).toEqual(['name', 'city']);
    });

    it('but writes AFTER attaching are placed immediately', () => {
      const o = new InternetObject();
      o.attachSchema(schemaOf(SCHEMA));
      o.set('city', 'NYC');
      o.set('name', 'Alice');
      expect(order(o)).toEqual(['name', 'city']);
    });

    it('applySchemaOrder() puts extras after the declared members', () => {
      // The extra has to be one the schema PERMITS. B4 made attaching a check, so a closed schema
      // now refuses an object carrying a member it does not declare -- which is the same
      // `unknown-member` a parse of that text would raise.
      const o = new InternetObject();
      o.set('zzz', 1);
      o.set('city', 'NYC');
      o.set('name', 'Alice');
      o.attachSchema(schemaOf(OPEN_SCHEMA)).applySchemaOrder();
      expect(order(o)).toEqual(['name', 'city', 'zzz']);
    });

    it('and a closed schema refuses an object that carries an undeclared member', () => {
      const o = new InternetObject();
      o.set('zzz', 1);
      expect(() => o.attachSchema(schemaOf(SCHEMA))).toThrow(
        expect.objectContaining({ errorCode: 'unknown-member' })
      );
      expect(o.getSchema()).toBeNull();     // atomic: nothing attached
    });

    it('detaching stops the rule without undoing what it already did', () => {
      const o = new InternetObject();
      o.attachSchema(schemaOf(SCHEMA));
      o.set('city', 'NYC');
      o.set('name', 'Alice');
      o.attachSchema(null);
      o.set('age', 30);
      expect(o.getSchema()).toBeNull();
      expect(order(o)).toEqual(['name', 'city', 'age']);
    });

    it('a keyless member has no name to place it by, so it appends', () => {
      const o = new InternetObject();
      o.attachSchema(schemaOf(SCHEMA));
      o.pushValue(99);
      o.set('name', 'Alice');
      // `name` is declared, so it goes ahead of the unplaceable value rather than behind it.
      expect(order(o)).toEqual(['name', undefined]);
      expect(o.getAt(1)).toBe(99);
    });
  });

  describe('what must not break', () => {
    it('delete() then set() keeps the schema slot', () => {
      const o: any = loadObject({ name: 'Alice', age: 30 }, parseDefinitions(SCHEMA));
      o.delete('name');
      o.set('name', 'Bob');
      o.compact();
      expect(order(o)).toEqual(['name', 'age']);
      expect(o.get('name')).toBe('Bob');
    });

    it('nested objects are ordered by their own schema, on both routes', () => {
      const src = '~ $addr: {street?: string, city?: string}\n~ $schema: {name?: string, addr?: $addr}';

      const viaLoad: any = recordOf(load({ addr: { city: 'NYC', street: 'Main' }, name: 'Alice' }, parseDefinitions(src)));
      expect(order(viaLoad)).toEqual(['name', 'addr']);
      expect(memberNames(viaLoad.get('addr'))).toEqual(['street', 'city']);

      const viaText: any = recordOf(parse(`${src}\n---\nname: Alice, addr: {city: NYC, street: Main}`, null));
      expect(order(viaText)).toEqual(['name', 'addr']);
      expect(memberNames(viaText.get('addr'))).toEqual(['street', 'city']);
    });

    it('a nested member is an IOObject from parse() and a plain object from load()', () => {
      // Pinned as OBSERVED, not endorsed. The two routes agree on member ORDER, which is what this
      // file is about, but they disagree on the TYPE they hand back one level down. That asymmetry
      // predates the ordering work and is deliberately not changed here; this case exists so it
      // cannot drift unnoticed, and so the next person to look at it finds it written down.
      const src = '~ $addr: {street?: string, city?: string}\n~ $schema: {name?: string, addr?: $addr}';
      const viaLoad: any = recordOf(load({ addr: { city: 'NYC', street: 'Main' }, name: 'Alice' }, parseDefinitions(src)));
      const viaText: any = recordOf(parse(`${src}\n---\nname: Alice, addr: {city: NYC, street: Main}`, null));
      expect(viaLoad.get('addr')).toBeInstanceOf(Object);
      expect(viaLoad.get('addr')).not.toBeInstanceOf(InternetObject);
      expect(viaText.get('addr')).toBeInstanceOf(InternetObject);
    });

    it('toObject() reflects the same order', () => {
      const doc = parse(`${SCHEMA}\n---\ncity: NYC, age: 30, name: Alice`, null);
      expect(Object.keys(doc.toObject() as object)).toEqual(['name', 'age', 'city']);
    });
  });
});
