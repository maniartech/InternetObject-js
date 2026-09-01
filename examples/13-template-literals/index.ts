/**
 * 13 — Writing Internet Object inline
 *
 * Run me:  npx tsx examples/13-template-literals/index.ts
 */
import io from '../../src/index';

// For tests, fixtures and small constants, writing the document straight into
// your code beats keeping a separate file in step with it.

// ── The bare tag ──────────────────────────────────────────────────────────────

// `io` is itself a tag, and it hands back plain JavaScript — the same thing
// `parse(text)` gives you, for text you write rather than receive.
const people = io`
  name: string, age: int
  ---
  ~ Alice, 30
  ~ Bob, 25
`;
console.log('io          :', people);

// ── The document form ─────────────────────────────────────────────────────────

// `io.doc` reads the same text and gives you the document instead — for the
// header, sections, validated writes, or a round trip back to IO text.
const doc = io.doc`
  name: string, age: int
  ---
  ~ Alice, 30
  ~ Bob, 25
`;
console.log('io.doc      :', doc.constructor.name, '->', doc.toObject());

// The pairing is exactly the one from example 16:
//
//   io``      is  parse(text)          -- plain JavaScript
//   io.doc``  is  parseDocument(text)  -- the document

// ── The other three ───────────────────────────────────────────────────────────

const obj = io.object`name: Alice, age: 30`;
console.log('io.object   :', obj.toObject());

const schema = io.schema`{name: string, age: int}`;
console.log('io.schema   :', schema.names.join(', '));

const defs = io.defs`~ $user: {name: string, age: int}`;
console.log('io.defs     :', defs ? 'parsed' : 'none');

// ── Bringing definitions to a tag ─────────────────────────────────────────────

// Every tag has a `.with(defs, sink)` form, so the schema can live in your code
// and the tagged text can carry data alone.
const person = io.schema`{name: string, age: int}`;
console.log('\nio.with(schema):', io.with(person)`Alice, 30`);

// ── Interpolation ─────────────────────────────────────────────────────────────

// Values interpolate, so a fixture can be built from real variables.
const city = 'NYC';
console.log('\ninterpolated:', io`name: Alice, city: ${city}`);

// ── Interpolated values are always VALUES ─────────────────────────────────────

// This is the part that matters. Real data is full of commas, colons and slashes,
// and every one of them is syntax in Internet Object. A `${...}` is serialized as
// a value before it reaches the parser, so none of it can change the structure.
const messy = 'Smith, John';
console.log('a comma      :', io`name: ${messy}`);            // ONE member

const qty = '1,000';
console.log('a quantity   :', io`qty: ${qty}`);               // the string, not 1

const site = 'https://example.com';
console.log('a URL        :', io`site: ${site}`);             // colons are fine

// You never have to quote or escape an interpolated value yourself, and you cannot
// forget to. The same holds for every tag, because they share one builder.

console.log(`
  io\`...\`           plain JavaScript   -- the same as parse(text)
  io.doc\`...\`       a whole document   -- the same as parseDocument(text)
  io.object\`...\`    a single object
  io.schema\`...\`    a schema
  io.defs\`...\`      header definitions

  ...and .with(defs, sink) on each, when the schema lives in your code.`);
