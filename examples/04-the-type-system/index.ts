/**
 * 04 — The type system: what JSON never had
 *
 * Run me:  npx tsx examples/04-the-type-system/index.ts
 */
import io from '../../src/index';

// The IO text here is written by us, not received, so it is written with the `io` tag --
// `io`...`` is `parse(text)`, and it hands back the same plain JavaScript. Example 13 covers
// the tag family; example 16 covers the functions to reach for when the text ARRIVES.

// ── Numbers that keep their meaning ───────────────────────────────────────────

// JSON has one number type, a float. That loses money and large ids.
const nums = io`
  count:   int,
  ratio:   number,
  price:   decimal,
  bigId:   bigint
---
~ 42, 3.14, 19.99m, 9007199254740993n` as any[];

const n = nums[0];
console.log('int     ', n.count, `(${typeof n.count})`);
console.log('number  ', n.ratio, `(${typeof n.ratio})`);
console.log('decimal ', String(n.price), '(exact — no floating point drift)');
console.log('bigint  ', String(n.bigId), '(every digit survives)');

// The classic float problem, and the fix:
console.log('\n0.1 + 0.2 as JS floats  =', 0.1 + 0.2);
console.log('as decimals it stays exact — see example 11.');

// ── Dates and times are values, not strings ───────────────────────────────────

const when = io`
  day:  date,
  time: time,
  at:   datetime
---
~ d"2026-08-24", t"14:30:00", dt"2026-08-24T14:30:00.000Z"` as any[];
console.log('\ndate    ', when[0].day instanceof Date ? when[0].day.toISOString().slice(0, 10) : when[0].day);
console.log('datetime', when[0].at instanceof Date ? when[0].at.toISOString() : when[0].at);

// An impossible date is rejected rather than silently rolled forward to 2 March.
// With no error sink the first problem is raised, so you hear about it while you are
// still the one writing the document:
try {
  io`day: date
---
~ d"2026-02-30"`;
  console.log('30 February -> accepted');
} catch (e: any) {
  console.log('30 February ->', e.errorCode);
}

// Pass a sink instead and the errors are reported while the good records survive --
// the bad one is replaced in place by an error node. Example 07 covers both routes.
const dates: Error[] = [];
const mixed = io.with(null, dates)`day: date
---
~ d"2026-08-24"
~ d"2026-02-30"` as any[];
console.log('with a sink ->', dates.map((e: any) => e.errorCode), '· good rows kept:', mixed.length);

// ── Strings with a shape ──────────────────────────────────────────────────────

// Note the quotes around the URL. Unquoted, its `:` would read as a key separator --
// quote any value containing `:` or `,` and it is taken literally.
const contact = io`
  email: email,
  site:  url
---
~ alice@example.com, "https://example.com"` as any[];
console.log('\nemail   ', contact[0].email);
console.log('url     ', contact[0].site);

// ── Bytes ─────────────────────────────────────────────────────────────────────

// Bytes are written as a base64 literal with a `b` prefix. There is no `binary` type
// NAME to declare in a schema -- the literal carries its own kind.
const bin = io`data: b"SGVsbG8="` as any;
console.log('\nbytes   ', new TextDecoder().decode(bin.data), '(decoded from base64)');

// ── Containers ────────────────────────────────────────────────────────────────

const nested = io`
  tags:    [string],
  scores:  [int],
  address: {street: string, city: string}
---
~ [red, green], [10, 20], {Main St, NYC}` as any[];
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
