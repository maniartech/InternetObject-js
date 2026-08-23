/**
 * 01 — Hello, Internet Object
 *
 * Run me:  npx tsx examples/01-hello-internet-object/index.ts
 */
import { parse } from '../../src/index';

// ── The same data, two ways ───────────────────────────────────────────────────

const asJson = `{ "name": "Alice", "age": 30, "active": true }`;

const asIo = `name: Alice, age: 30, active: T`;

// JSON needs quotes around keys and strings. Internet Object does not — unless the
// value contains something that needs them.
console.log('From JSON:', JSON.parse(asJson));
console.log('From IO  :', parse(asIo).toObject());

// Both give you an ordinary JavaScript object. Nothing exotic:
const person = parse(asIo).toObject() as { name: string; age: number; active: boolean };
console.log(`\n${person.name} is ${person.age}.`);

// ── Quotes are still there when you want them ─────────────────────────────────

// Use quotes for anything with a comma, a colon, or leading/trailing spaces.
const quoted = parse(`title: "Hello, world", note: 'single quotes work too'`);
console.log('\nQuoted values:', quoted.toObject());

// ── That is the whole idea ────────────────────────────────────────────────────

// Same data model as JSON — objects, arrays, strings, numbers, booleans, null —
// with a lighter syntax. Everything else in these examples builds on this.
console.log('\nNull and booleans:', parse('a: N, b: T, c: F').toObject());
console.log('An array         :', parse('tags: [red, green, blue]').toObject());
console.log('Nested object    :', parse('user: {name: Bob, city: NYC}').toObject());
