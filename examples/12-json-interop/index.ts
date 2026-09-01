/**
 * 12 — Working with JSON
 *
 * Run me:  npx tsx examples/12-json-interop/index.ts
 */
import io, { parseDocument, load, loadCollection, parseDefinitions, stringify, toJSON } from '../../src/index';

// You will have JSON on one side of most systems. Moving between the two is
// meant to be dull, and it is.

// ── JSON in ───────────────────────────────────────────────────────────────────

const fromApi = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
];

const defs = io.defs`~ $schema: {id: int, name: string, email: email}`;
const collection = loadCollection(fromApi, defs);

console.log('validated  :', collection.toObject());
console.log('as IO text :', JSON.stringify(stringify(collection as any)));

// Two things happened there that JSON.parse cannot do: the data was CHECKED
// against a schema, and the output is smaller because the keys are not repeated.

// ── JSON out ──────────────────────────────────────────────────────────────────

const doc = io.doc`name: string, joined: date, avatar: any
---
~ Alice, d"2026-08-24", b"SGVsbG8="`;

// toObject() keeps native values; toJSON() makes them JSON-safe.
console.log('\ntoObject   :', doc.toObject());
console.log('toJSON     :', doc.toJSON());
console.log('JSON.stringify:', JSON.stringify(doc.toJSON()));

// A Date becomes an ISO string, bytes become base64 — the portable spellings,
// identical in every runtime.

// ── The one thing to remember ─────────────────────────────────────────────────

// Use toJSON() when the value is leaving your program. Use toObject() when it
// is staying.
const helper = toJSON(io.doc`when: dt"2026-08-24T09:00:00.000Z"`);
console.log('\ntoJSON() helper:', JSON.stringify(helper));

console.log(`
  JSON -> IO   loadCollection(data, defs)  validates on the way in
  IO -> JSON   doc.toJSON()                portable values out`);
