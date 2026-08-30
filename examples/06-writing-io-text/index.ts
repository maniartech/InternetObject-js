/**
 * 06 — Writing Internet Object text
 *
 * Run me:  npx tsx examples/06-writing-io-text/index.ts
 */
import { parseDocument, load, parseDefinitions, stringify, stringifyDocument } from '../../src/index';

// Parsing turns text into values. This is the other direction.

const defs = parseDefinitions('~ $schema: {name: string, age: int, city?: string}');
const doc = load({ name: 'Alice', age: 30, city: 'NYC' }, defs);

// ── The short version ─────────────────────────────────────────────────────────

console.log('stringify:', JSON.stringify(stringify(doc)));

// Only the values. The reader already knows the schema, so the names are not
// repeated on the wire — that is the whole point of the format.

// ── With the header ───────────────────────────────────────────────────────────

console.log('\nwith header:\n' + stringifyDocument(doc, { includeHeader: true }));

// Send this to someone who does NOT have the schema and it still makes sense.

// ── How much to spell out ─────────────────────────────────────────────────────

// `emitKeys` decides when a key is written next to its value.
const modes = ['none', 'extras', 'all'] as const;
for (const emitKeys of modes) {
  console.log(`\nemitKeys: ${emitKeys.padEnd(7)}`, JSON.stringify(stringifyDocument(doc, { emitKeys } as any)));
}

console.log(`
  none    leanest, and lossy if a name cannot be recovered
  extras  the default: a key only when the schema cannot supply the name
  all     fully self-describing, larger`);

// ── It round-trips ────────────────────────────────────────────────────────────

// Text -> values -> text should give you back what you started with.
const original = 'name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25';
const roundTripped = stringify(parseDocument(original));
console.log('\noriginal data :', JSON.stringify('~ Alice, 30\n~ Bob, 25'));
console.log('after a trip  :', JSON.stringify(roundTripped));
console.log('same?          ', roundTripped === '~ Alice, 30\n~ Bob, 25');
