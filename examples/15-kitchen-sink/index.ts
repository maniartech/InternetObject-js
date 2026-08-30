/**
 * 15 — The kitchen sink
 *
 * Every concept in one file, in the order they build on each other. If you only
 * read one example, read this one — then go back to the numbered ones for depth.
 *
 * Run me:  npx tsx examples/15-kitchen-sink/index.ts
 */
import {
  parseDocument,
  parseDefinitions,
  parseSchema,
  validate,
  stringifyDocument,
  createStreamReader,
  IOObject,
} from '../../src/index';

const h1 = (s: string) => console.log(`\n${'═'.repeat(74)}\n  ${s}\n${'═'.repeat(74)}`);
const h2 = (s: string) => console.log(`\n── ${s} ${'─'.repeat(Math.max(0, 68 - s.length))}`);

// ═════════════════════════════════════════════════════════════════════════════
h1('1 · A document, and the shape it projects to');
// ═════════════════════════════════════════════════════════════════════════════

// The rule worth memorising, because it is also what the playground shows you:
// the JSON projection IS the shape your code sees. Paste a document into
// play.internetobject.org, read the JSON panel, write code against that.

h2('one section holding a collection → an array');
console.log(parseDocument('name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25').toObject());

h2('one section holding a single object → an object');
console.log(parseDocument('name: Alice, age: 30').toObject());

h2('several sections → keyed by section name');
const multi = parseDocument(
  '~ $person: {name: string, age: int}\n' +
    '~ $post: {title: string}\n' +
    '--- users: $person\n~ Alice, 30\n~ Bob, 25\n' +
    '--- posts: $post\n~ Hello\n~ World'
);
console.log(multi.toObject());

// A bare `---` names its section `data`. With only one section there is nothing
// to key against, so the projection unwraps — you never see `data` in the output.

// ═════════════════════════════════════════════════════════════════════════════
h1('2 · The type system');
// ═════════════════════════════════════════════════════════════════════════════

// The types JSON never had. Each is a real value in JavaScript, not a string.
const typed = parseDocument(
  'name: string, age: int, pay: decimal, big: bigint, ok: bool,\n' +
    "born: date, seen: datetime, mail: email, site: url, tags: [string]\n" +
    '---\n' +
    "~ Alice, 30, 1234.50m, 900719925474099100n, T, d'1994-03-01'," +
    " dt'2024-03-01T10:00:00Z', a@b.com, 'https://example.com', [x, y]"
);
// remember §1: one section holding a collection projects to an array
const t: any = (typed.toObject() as any)[0];
h2('parsed values, and what they actually are');
for (const [k, v] of Object.entries(t)) {
  const kind = typeof v === 'bigint' ? 'BigInt' : (v as any)?.constructor?.name ?? typeof v;
  console.log(`  ${k.padEnd(6)} ${String(v).slice(0, 30).padEnd(32)} ${kind}`);
}

h2('optional `?` and nullable `*` are different things');
console.log('note?: omitted   →', parseDocument('name: string, note?: string\n---\n~ Alice').toObject());
console.log('note*: set to N  →', parseDocument('name: string, note*: string\n---\n~ Alice, N').toObject());
// `?` means "may be absent". `*` means "may be null". Ask for both with `?*`.

// ═════════════════════════════════════════════════════════════════════════════
h1('3 · Schemas validate as the document is read');
// ═════════════════════════════════════════════════════════════════════════════

// The first line IS the schema. Validation is not a second pass you remember to
// run — bad data is caught at the moment it is read.

h2('it passes');
console.log(parseDocument('name: string, age: int\n---\n~ Alice, 30').toObject());

h2('it fails, with a code and a position');
// An object section throws. A collection puts the error in place instead — §4.
try {
  parseDocument('name: string, age: int\n---\nname: Alice, age: abc');
} catch (err: any) {
  console.log('  errorCode :', err.errorCode);
  console.log('  message   :', err.message);
}

// ═════════════════════════════════════════════════════════════════════════════
h1('4 · Three places an error can reach you');
// ═════════════════════════════════════════════════════════════════════════════

// Which one you get is a choice, and it is worth knowing all three exist.

h2('a) thrown — the default, like JSON.parse');
try { parseDocument('age: int\n---\nage: abc'); } catch (e: any) { console.log('  threw:', e.errorCode); }

h2('b) collected — pass an array and parsing continues');
const bag: Error[] = [];
const collected = parseDocument('age: int\n---\n~ 30\n~ abc\n~ 40', null, bag);
console.log('  errors collected :', bag.map((e: any) => e.errorCode));
console.log('  doc.errors       :', collected.errors.length);

h2('c) in place — the bad RECORD is replaced by an error node');
// Note it replaces the whole record, not just the offending member.
const rows0: any = (collected as any).sections.get(0).data;
console.log('  records          :', rows0.length, '(the good ones survive)');
console.log('  record 1 is an error node:', !!(rows0.getAt(1) as any)?.errorCode || 'see toObject');

// ═════════════════════════════════════════════════════════════════════════════
h1('5 · Definitions: schemas and variables');
// ═════════════════════════════════════════════════════════════════════════════

const doc = parseDocument(
  '~ $person: {name: string, age: int, home?: {city: string, zip?: string}}\n' +
    '~ @company: Acme\n' +
    '--- staff: $person\n' +
    "~ Alice, 30, {city: NYC, zip: '10001'}\n" +
    '~ Bob, 25, {city: LA}'
);
h2('$name defines a schema, @name defines a variable');
console.log('  definition keys :', (doc as any).header.definitions.keys);
console.log('  @company        :', (doc as any).header.definitions.getValue('@company'));
console.log('  data            :', JSON.stringify(doc.toObject()));

// Note: the header is NOT part of the JSON projection. Definitions describe the
// document; they are not members of it. `doc.toObject()` above has no header key.

// ═════════════════════════════════════════════════════════════════════════════
h1('6 · Reading a document without converting it');
// ═════════════════════════════════════════════════════════════════════════════

// `toObject()` is a conversion, not a required step. A document is usable as it is,
// and reading it directly keeps schema order, access by position, and native types.
const staff: any = (doc as any).sections.get(0).data;

h2('by key, by position, and the collection API');
console.log('  get("name")     :', staff.getAt(0).get('name'));
console.log('  getAt(0)        :', staff.getAt(0).getAt(0), '(schema position, not arrival order)');
console.log('  length          :', staff.length);
console.log('  map             :', staff.map((r: any) => r.get('name')).join(', '));
console.log('  filter          :', staff.filter((r: any) => r.get('age') > 26).length, 'over 26');
console.log('  find            :', staff.find((r: any) => r.get('name') === 'Bob')?.get('age'));
for (const r of staff) { console.log('  for..of         :', r.get('name')); break; }

// `map` and `filter` return an IOCollection, not an Array — they stay in the
// collection so you can keep chaining, and the collection carries the full array
// surface: join, sort, slice, at, includes, concat, flatMap, toSorted, toReversed.

// ═════════════════════════════════════════════════════════════════════════════
h1('7 · Mutating the data, then writing it back out');
// ═════════════════════════════════════════════════════════════════════════════

const editable = parseDocument('name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25');
const list: any = (editable as any).sections.get(0).data;

h2('set, push, delete');
list.getAt(0).set('age', 31);                       // update a member
list.push(new IOObject({ name: 'Dev', age: 41 }));  // append a record
console.log('  after set+push  :', JSON.stringify(editable.toObject()));

list.deleteAt(1);                                   // drop a record
console.log('  after deleteAt  :', JSON.stringify(editable.toObject()));

h2('and it round-trips back to Internet Object text');
console.log(stringifyDocument(editable));

h2('⚠ today, set() does NOT validate');
// The record knows its schema — but a raw `set` writes straight through, and the
// invalid value serializes back out as invalid IO text. Validating writes is the
// job of the reactive Draft surface (see .private/docs/REACTIVE-CORE-SPEC.md).
const loose = parseDocument('name: string, age: int\n---\n~ Alice, 30');
const rec: any = (loose as any).sections.get(0).data.getAt(0);
console.log('  record has a schema :', !!rec.schema);
rec.set('age', 'not-an-int');
console.log('  stored anyway       :', JSON.stringify(loose.toObject()));
console.log('  serializes to       :', JSON.stringify(stringifyDocument(loose)));

// ═════════════════════════════════════════════════════════════════════════════
h1('8 · Mutating the header');
// ═════════════════════════════════════════════════════════════════════════════

// The header is data too. Add a variable, and it is there when you serialize.
const hdoc = parseDocument('~ $p: {name: string}\n--- users: $p\n~ Alice');
h2('before');
console.log('  keys :', (hdoc as any).header.definitions.keys);
console.log(stringifyDocument(hdoc));

(hdoc as any).header.definitions.set('@env', 'prod');

h2('after adding @env');
console.log('  keys :', (hdoc as any).header.definitions.keys);
console.log(stringifyDocument(hdoc));

// ═════════════════════════════════════════════════════════════════════════════
h1('9 · toObject() vs toJSON()');
// ═════════════════════════════════════════════════════════════════════════════

// Both are conversions for a boundary. They differ in what they do to values
// JSON cannot carry.
const vals = parseDocument(
  'when: datetime, price: decimal, big: bigint\n---\n' +
    "when: dt'2024-03-01', price: 10.50m, big: 900719925474099100n"
);
const kinds = (x: any) =>
  Object.entries(x)
    .map(([k, v]: any) => `${k}=${typeof v === 'bigint' ? 'BigInt' : v?.constructor?.name}`)
    .join('  ');
console.log('  toObject :', kinds(vals.toObject()), '  ← exact, for your code');
console.log('  toJSON   :', kinds(vals.toJSON()), '  ← strings, for the wire');

// ═════════════════════════════════════════════════════════════════════════════
h1('10 · Validating plain JavaScript you already have');
// ═════════════════════════════════════════════════════════════════════════════

// You do not need IO text to use IO schemas. Point one at ordinary objects.
const defs: any = parseDefinitions('~ $person: {name: string, age: int}');
const personSchema = defs.getV('$person');

h2('a schema from definitions');
console.log('  valid   :', validate({ name: 'Zoe', age: 5 }, personSchema, defs).valid);
const bad = validate({ name: 'Zoe', age: 'nope' }, personSchema, defs);
console.log('  invalid :', bad.valid, '→', bad.errors.map((e: any) => e.errorCode));

h2('or a standalone schema, with no document at all');
console.log('  valid   :', validate({ name: 'A', age: 1 }, parseSchema('{name: string, age: int}') as any).valid);

// ═════════════════════════════════════════════════════════════════════════════
h1('11 · Streaming: records as they arrive');
// ═════════════════════════════════════════════════════════════════════════════

async function main() {
  // Chunk boundaries do not matter — a record split across chunks is reassembled.
  const chunks = [
    'name: string, age: int\n---\n',
    '~ Alice, 30\n',
    '~ Bo',
    'b, 25\n',
    '~ oops, notanint\n',
    '~ Carol, 28\n',
  ];

  for await (const item of createStreamReader(chunks) as any) {
    if (item.kind === 'record') {
      console.log(`  record ${item.recordIndex} :`, JSON.stringify(item.data.toObject()));
    } else {
      console.log(`  error  ${item.recordIndex} :`, item.error.errorCode, '— and the stream continues');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  h1('12 · The whole round trip');
  // ═══════════════════════════════════════════════════════════════════════════

  const original = '~ $p: {name: string, age: int}\n--- team: $p\n~ Alice, 30\n~ Bob, 25';
  const round = parseDocument(original);
  const team: any = (round as any).sections.get(0).data;
  team.getAt(1).set('age', 26);
  (round as any).header.definitions.set('@rev', '2');

  console.log('  in  :', JSON.stringify(original));
  console.log('  out :', JSON.stringify(stringifyDocument(round)));
  console.log('  json:', JSON.stringify(round.toObject()));

  console.log(`
  Text → parse → validate → read → mutate → serialize → text.
  Same data model as JSON, with types, schemas and sections that JSON has to
  bolt on. Nothing here needed a build step or a code generator.`);
}

main();
