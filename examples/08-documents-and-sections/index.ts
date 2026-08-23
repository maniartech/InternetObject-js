/**
 * 08 — Documents, headers and sections
 *
 * Run me:  npx tsx examples/08-documents-and-sections/index.ts
 */
import { parse } from '../../src/index';

// ── A document has two halves ─────────────────────────────────────────────────

// Everything before `---` is the HEADER: schemas, metadata, definitions.
// Everything after is the DATA.
const doc = parse(`~ version: 2
~ generated: dt"2026-08-24T09:00:00.000Z"
~ $schema: {name: string, age: int}
---
~ Alice, 30
~ Bob, 25`);

console.log('data  :', doc.toObject());

// Header metadata is read separately from the data. It travels with the document
// but is not part of it.
const meta = doc.header.toObject() as any;
console.log('metadata :', meta);
console.log('version  :', meta.version);

// ── More than one kind of record, in one file ─────────────────────────────────

// A named section starts with `--- name: $schema`. One file, several shapes.
const multi = parse(`~ $user:  {name: string, email: email}
~ $order: {id: int, total: decimal}
--- users: $user
~ Alice, alice@example.com
~ Bob, bob@example.com
--- orders: $order
~ 1001, 49.99m
~ 1002, 12.50m`);

const all = multi.toObject() as any;
console.log('\nsections :', Object.keys(all));
console.log('users    :', all.users);
console.log('orders   :', all.orders.map((o: any) => ({ id: o.id, total: String(o.total) })));

// Reach a section by name or by position:
console.log('\nby name  :', multi.sections.get('orders')?.name);
console.log('by index :', multi.sections.get(0)?.name);
console.log('how many :', multi.sections.length);

// ── Why sections ──────────────────────────────────────────────────────────────

// One request, one file, several related record types — without inventing a
// wrapper object whose only job is to hold the other three.
console.log(`
  header    schemas, definitions, metadata
  ---       the divider
  sections  one or more, each with its own schema`);
