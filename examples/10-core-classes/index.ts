/**
 * 10 — The core classes: IOObject and IOCollection
 *
 * Run me:  npx tsx examples/10-core-classes/index.ts
 */
import io, { parseDocument, loadObject, parseDefinitions } from '../../src/index';

// `toObject()` gives you plain JavaScript and is all most code needs. Underneath
// are two small classes worth knowing, because they preserve something plain
// objects cannot: ORDER, and access by position.

const defs = io.defs`~ $schema: {name: string, age: int, city?: string}`;
const person = loadObject({ city: 'NYC', age: 30, name: 'Alice' }, defs);

// ── Read by key, or by position ───────────────────────────────────────────────

console.log('get("name") :', person.get('name'));
console.log('getAt(0)    :', person.getAt(0));
console.log('getAt(1)    :', person.getAt(1));
console.log('keyAt(2)    :', person.keyAt(2));
console.log('length      :', person.length);

// ── Position follows the SCHEMA, not the input ────────────────────────────────

// Note the object above was built with its keys in the order city, age, name.
// The schema declares name, age, city — and that is the order you get.
const order: string[] = [];
for (let i = 0; i < person.length; i++) order.push(String(person.keyAt(i)));
console.log('\ninput order  : city, age, name');
console.log('actual order :', order.join(', '), ' <- the schema decides');

// That is what makes getAt(1) mean the same thing everywhere: parsed from text,
// loaded from JavaScript, or built one set() at a time.

// ── Collections ───────────────────────────────────────────────────────────────

const people = io.doc`name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25\n~ Carol, 28`;
const rows: any = (people as any).sections.get(0).data;
console.log('\nrecords     :', rows.length);
console.log('first record:', rows.getAt(0).get('name'));

// An IOCollection is not a thin wrapper you have to escape from. The array methods
// you already use are on it, and it is iterable.
//
// map and filter return an IOCollection, not an Array -- they stay in the collection
// so you can keep chaining, and the collection now has the full array surface, so
// `join`, `sort`, `slice`, `at` and the rest work directly on the result.
console.log('map         :', rows.map((r: any) => r.get('name')).join(', '));
console.log('filter      :', rows.filter((r: any) => r.get('age') > 26).length, 'over 26');
console.log('find        :', rows.find((r: any) => r.get('name') === 'Bob')?.get('age'));
console.log('sort        :', rows.toSorted((a: any, b: any) => a.get('age') - b.get('age')).getAt(0).get('name'));

for (const r of rows) { console.log('for..of     :', r.get('name'), r.get('age')); break; }

// So `toObject()` is a CONVERSION, for handing data to other code -- not a step you
// must take before you can read anything.
console.log('\nnever converted, still read it all:',
  rows.map((r: any) => `${r.get('name')}(${r.get('age')})`).join(' '));

// ── Two projections ───────────────────────────────────────────────────────────

// toObject() -> native values (Date, Decimal, byte arrays stay themselves)
// toJSON()   -> JSON-safe values (dates become strings, bytes become base64)
const typed = io.doc`when: dt"2026-08-24T09:00:00.000Z", data: b"SGVsbG8="`;
console.log('\ntoObject:', typed.toObject());
console.log('toJSON  :', typed.toJSON());

console.log(`
  get(key) / getAt(i) / keyAt(i)   read a record
  toObject()                       native JS values
  toJSON()                         JSON-safe values`);
