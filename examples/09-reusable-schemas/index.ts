/**
 * 09 — Reusable schemas: define once, reference by name
 *
 * Run me:  npx tsx examples/09-reusable-schemas/index.ts
 */
import io, { load } from '../../src/index';

// ── Naming a shape ────────────────────────────────────────────────────────────

// A definition starting with `$` is a named schema. Reference it anywhere a type
// name would go.
const doc = io.doc`~ $address: {street: string, city: string}
~ $schema:  {name: string, home: $address, work?: $address}
---
~ Alice, {Main St, NYC}, {Broadway, NYC}`;
console.log('nested by reference:', doc.toObject());

// Write the shape once and use it twice. Change it once, too.

// ── Arrays of a named shape ───────────────────────────────────────────────────

const orders = io.doc`~ $item:   {sku: string, qty: int}
~ $schema: {id: int, items: [$item]}
---
~ 1001, [{A1, 2}, {B2, 1}]`;
console.log('\narray of a shape:', JSON.stringify(orders.toObject()));

// ── Variables: values, not shapes ─────────────────────────────────────────────

// `@name` defines a VALUE you can reuse. Handy for constants that would
// otherwise be repeated on every row.
const vars = io.doc`~ @currency: USD
~ $schema: {item: string, price: decimal, ccy: string}
---
~ Book, 12.99m, @currency
~ Pen,   1.50m, @currency`;
const rows = vars.toObject() as any[];
console.log('\nwith a variable:');
for (const r of rows) console.log(`   ${r.item.padEnd(5)} ${String(r.price).padStart(6)} ${r.ccy}`);

// ── Keeping the schema out of the document ────────────────────────────────────

// Definitions can live in your code and be passed in, so the payload carries
// only data. This is the normal shape of an API: schema at both endpoints,
// values on the wire.
const defs = io.defs`~ $schema: {name: string, age: int}`;
console.log('\ndata-only text  :', io.with(defs)`~ Alice, 30\n~ Bob, 25`);
console.log('same schema, JS :', load({ name: 'Carol', age: 28 }, defs).toObject());

console.log(`
  $name   a named SCHEMA   -- a shape
  @name   a named VALUE    -- a constant
  $schema the default schema for the data`);
