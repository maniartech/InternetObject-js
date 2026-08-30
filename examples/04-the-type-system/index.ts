/**
 * 04 — The type system: what JSON never had
 *
 * Run me:  npx tsx examples/04-the-type-system/index.ts
 */
import { parseDocument } from '../../src/index';

// ── Numbers that keep their meaning ───────────────────────────────────────────

// JSON has one number type, a float. That loses money and large ids.
const nums = parseDocument(`
  count:   int,
  ratio:   number,
  price:   decimal,
  bigId:   bigint
---
~ 42, 3.14, 19.99m, 9007199254740993n`).toObject() as any[];

const n = nums[0];
console.log('int     ', n.count, `(${typeof n.count})`);
console.log('number  ', n.ratio, `(${typeof n.ratio})`);
console.log('decimal ', String(n.price), '(exact — no floating point drift)');
console.log('bigint  ', String(n.bigId), '(every digit survives)');

// The classic float problem, and the fix:
console.log('\n0.1 + 0.2 as JS floats  =', 0.1 + 0.2);
console.log('as decimals it stays exact — see example 11.');

// ── Dates and times are values, not strings ───────────────────────────────────

const when = parseDocument(`
  day:  date,
  time: time,
  at:   datetime
---
~ d"2026-08-24", t"14:30:00", dt"2026-08-24T14:30:00.000Z"`).toObject() as any[];
console.log('\ndate    ', when[0].day instanceof Date ? when[0].day.toISOString().slice(0, 10) : when[0].day);
console.log('datetime', when[0].at instanceof Date ? when[0].at.toISOString() : when[0].at);

// An impossible date is rejected rather than silently rolled forward to 2 March:
// A bad literal replaces the record it appeared in, and the record carries the code.
const febThirty = parseDocument('day: date\n---\n~ d"2026-02-30"').toObject() as any[];
console.log('30 February ->', febThirty[0]?.errorCode ?? 'accepted');

// ── Strings with a shape ──────────────────────────────────────────────────────

// Note the quotes around the URL. Unquoted, its `:` would read as a key separator --
// quote any value containing `:` or `,` and it is taken literally.
const contact = parseDocument(`
  email: email,
  site:  url
---
~ alice@example.com, "https://example.com"`).toObject() as any[];
console.log('\nemail   ', contact[0].email);
console.log('url     ', contact[0].site);

// ── Bytes ─────────────────────────────────────────────────────────────────────

// Bytes are written as a base64 literal with a `b` prefix. There is no `binary` type
// NAME to declare in a schema -- the literal carries its own kind.
const bin = parseDocument('data: b"SGVsbG8="').toObject() as any;
console.log('\nbytes   ', new TextDecoder().decode(bin.data), '(decoded from base64)');

// ── Containers ────────────────────────────────────────────────────────────────

const nested = parseDocument(`
  tags:    [string],
  scores:  [int],
  address: {street: string, city: string}
---
~ [red, green], [10, 20], {Main St, NYC}`).toObject() as any[];
console.log('\narray of string ', nested[0].tags);
console.log('array of int    ', nested[0].scores);
console.log('nested object   ', nested[0].address);

// ── The full list ─────────────────────────────────────────────────────────────

// The names you may write in a schema. Deliberately short.
console.log('\nEvery type name:', [
  'string', 'number', 'int', 'decimal', 'bigint', 'bool',
  'date', 'time', 'datetime', 'email', 'url',
  'array', 'object', 'any',
].join(', '));
