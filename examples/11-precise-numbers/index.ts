/**
 * 11 — Precise numbers: money and large ids
 *
 * Run me:  npx tsx examples/11-precise-numbers/index.ts
 */
import { parse, parseDocument, stringify } from '../../src/index';

// ── The problem, in one line ──────────────────────────────────────────────────

console.log('JS floats  : 0.1 + 0.2 =', 0.1 + 0.2);

// Every language with IEEE floats does this, JSON included, because JSON has
// exactly one number type and it is a float. For money that is not acceptable.

// ── decimal: exact, and it keeps its scale ────────────────────────────────────

const money = parse('a: 0.1m, b: 0.2m, price: 19.99m, padded: 1.50m') as any;
console.log('\ndecimal a  :', String(money.a));
console.log('decimal b  :', String(money.b));
console.log('price      :', String(money.price));

// Scale is part of the value: 1.50 is not the same as 1.5. A price list that
// says 1.50 still says 1.50 after a round trip.
console.log('1.50m stays:', String(money.padded), ' <- the trailing zero survives');

// ── bigint: every digit, past 2^53 ────────────────────────────────────────────

const ids = parse('safe: 9007199254740991, beyond: 9007199254740993n') as any;
console.log('\nNumber.MAX_SAFE_INTEGER  :', Number.MAX_SAFE_INTEGER);
console.log('as a plain number        :', ids.safe);
console.log('as a bigint              :', String(ids.beyond), ' <- exact');

// What JSON does to the same id:
console.log('via JSON.parse           :', JSON.parse('9007199254740993'), ' <- wrong by one');

// ── The marker is the point ───────────────────────────────────────────────────

// `m` means decimal, `n` means bigint. The suffix is not decoration: it is how
// the document says which kind of number it means, so the reader cannot guess
// wrong.
console.log('\n12    ->', typeof parse('v: 12').v);
console.log('12m   ->', parse('v: 12m').v.constructor.name);
console.log('12n   ->', typeof parse('v: 12n').v);

// ── It survives the round trip ────────────────────────────────────────────────

const src = 'total: 19.99m, id: 9007199254740993n';
console.log('\noriginal   :', src);
console.log('round trip :', stringify(parseDocument(src)));
