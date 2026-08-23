/**
 * 02 — Collections: many records, without repeating yourself
 *
 * Run me:  npx tsx examples/02-collections/index.ts
 */
import { parse } from '../../src/index';

// ── The problem ───────────────────────────────────────────────────────────────

// In JSON, every record repeats every key. Three records, nine key repetitions:
const json = `[
  { "id": 1, "name": "Alice", "email": "alice@example.com" },
  { "id": 2, "name": "Bob",   "email": "bob@example.com" },
  { "id": 3, "name": "Carol", "email": "carol@example.com" }
]`;

// In Internet Object you name the fields once, on the first line, then list values.
// `---` ends the header. Each `~` line is one record.
const io = `id: int, name: string, email: email
---
~ 1, Alice, alice@example.com
~ 2, Bob,   bob@example.com
~ 3, Carol, carol@example.com`;

console.log('JSON gives you:', JSON.parse(json));
console.log('IO gives you  :', parse(io).toObject());

// Identical data. Compare the sizes:
const saving = Math.round((1 - io.length / json.length) * 100);
console.log(`\nJSON ${json.length} bytes · IO ${io.length} bytes · ${saving}% smaller`);

// The saving grows with the row count, because JSON repeats the keys every time
// and Internet Object never does.
const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, name: `User ${i + 1}`, email: `u${i + 1}@example.com` }));
const bigJson = JSON.stringify(rows(100));
const bigIo =
  'id: int, name: string, email: email\n---\n' +
  rows(100).map((r) => `~ ${r.id}, ${r.name}, ${r.email}`).join('\n');
console.log(`100 records: JSON ${bigJson.length} · IO ${bigIo.length} · ` +
            `${Math.round((1 - bigIo.length / bigJson.length) * 100)}% smaller`);

// ── One record or many? ───────────────────────────────────────────────────────

// The `~` is what makes a collection — not the number of rows.
console.log('\nWith    ~ :', parse('name: string\n---\n~ Alice').toObject()); // array of one
console.log('Without ~ :', parse('name: string\n---\nAlice').toObject());    // a single object

// ── Reading them ──────────────────────────────────────────────────────────────

const people = parse(io).toObject() as Array<{ name: string; email: string }>;
for (const p of people) console.log(`  ${p.name} <${p.email}>`);
