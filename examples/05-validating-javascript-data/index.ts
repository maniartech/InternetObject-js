/**
 * 05 — Validating data you already have
 *
 * Run me:  npx tsx examples/05-validating-javascript-data/index.ts
 */
import { load, loadObject, loadCollection, validate, parseDefinitions, stringify } from '../../src/index';

// You do not need IO text to use the schema. If your data is already JavaScript —
// from an API, a form, a database — you can check it against a schema directly.

const schema = parseDefinitions(`~ $schema: {
  name:  {string, minLen: 2},
  age:   {int, min: 0, max: 130},
  email: email
}`);

// ── validate(): ask, do not throw ─────────────────────────────────────────────

// Best for form input, where an error is an expected outcome rather than a bug.
const good = validate({ name: 'Alice', age: 30, email: 'alice@example.com' }, schema);
console.log('valid   ->', good.valid);

const bad = validate({ name: 'A', age: 200, email: 'nope' }, schema);
console.log('invalid ->', bad.valid);
for (const e of bad.errors ?? []) console.log('   ', (e as any).errorCode, '—', (e as any).fact ?? e.message);

// ── load(): give me the document, or tell me why not ──────────────────────────

// Best when valid data is the only acceptable outcome.
try {
  const doc = load({ name: 'Alice', age: 30, email: 'alice@example.com' }, schema);
  console.log('\nloaded  ->', doc.toObject());
  console.log('as text ->', stringify(doc));
} catch (e) {
  console.log('load threw:', (e as any).errorCode);
}

try {
  load({ name: 'A', age: 200, email: 'nope' }, schema);
} catch (e) {
  console.log('bad data threw:', (e as any).errorCode);
}

// ── One object, or many ───────────────────────────────────────────────────────

const one = loadObject({ name: 'Bob', age: 25, email: 'bob@example.com' }, schema);
console.log('\nloadObject     ->', one.toObject());

const many = loadCollection([
  { name: 'Carol', age: 28, email: 'carol@example.com' },
  { name: 'Dave', age: 41, email: 'dave@example.com' },
], schema);
console.log('loadCollection ->', many.toObject());

// ── Which should I use? ───────────────────────────────────────────────────────

console.log(`
  validate(data, schema)        -> { valid, errors }   never throws
  load(data, schema)            -> IODocument          throws on bad data
  loadObject(data, schema)      -> IOObject            one record
  loadCollection(data, schema)  -> IOCollection        many records`);
