/**
 * 13 — Writing Internet Object inline
 *
 * Run me:  npx tsx examples/13-template-literals/index.ts
 */
import io, { ioObject, ioSchema, ioDefinitions } from '../../src/index';

// For tests, fixtures and small constants, writing the document straight into
// your code beats keeping a separate file in step with it.

// ── A whole document ──────────────────────────────────────────────────────────

const doc = io.doc`
  name: string, age: int
  ---
  ~ Alice, 30
  ~ Bob, 25
`;
console.log('io.doc     :', doc.toObject());

// ── Just an object ────────────────────────────────────────────────────────────

const obj = ioObject`name: Alice, age: 30`;
console.log('ioObject   :', obj.toObject());

// ── Just a schema, or a set of definitions ────────────────────────────────────

const schema = ioSchema`{name: string, age: int}`;
console.log('ioSchema   :', schema.names.join(', '));

const defs = ioDefinitions`~ $user: {name: string, age: int}`;
console.log('ioDefs     :', defs ? 'parsed' : 'none');

// ── Interpolation ─────────────────────────────────────────────────────────────

// Values interpolate, so a fixture can be built from real variables.
const city = 'NYC';
console.log('\ninterpolated:', io.doc`name: Alice, city: ${city}`.toObject());

console.log(`
  io.doc\`...\`         a whole document
  ioObject\`...\`       a single object
  ioSchema\`...\`       a schema
  ioDefinitions\`...\`  header definitions`);
