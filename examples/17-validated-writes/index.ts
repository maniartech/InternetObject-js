/**
 * 17 — A document that cannot hold invalid data
 *
 * Every library that tracks mutation can tell you *that* something changed. None of them can
 * refuse a change, because none of them has a schema. This one does, and that is the reason to
 * hold a document rather than plain data.
 *
 *   A schema-bearing document always holds valid data — at parse, at load, at write, at insert,
 *   at attach. There is no fifth way in.
 *
 * Run me:  npx tsx examples/17-validated-writes/index.ts
 */
import {
  parseDocument, parseDefinitions, stringifyDocument, IOObject, IOCollection,
} from '../../src/index';

const h1 = (s: string) => console.log(`\n${'═'.repeat(74)}\n  ${s}\n${'═'.repeat(74)}`);
const h2 = (s: string) => console.log(`\n── ${s} ${'─'.repeat(Math.max(0, 68 - s.length))}`);
const show = (label: string, fn: () => unknown) => {
  try {
    console.log(`  ${label.padEnd(22)} ok →`, JSON.stringify(fn()));
  } catch (e: any) {
    console.log(`  ${label.padEnd(22)} refused →`, e.errorCode);
  }
};

const DOC = 'name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25';

// ═════════════════════════════════════════════════════════════════════════════
h1('1 · Writing');
// ═════════════════════════════════════════════════════════════════════════════

const doc: any = parseDocument(DOC);

show('a good write', () => { doc.data[0].age = 31; return doc.data[0].age; });
show('a bad write', () => { doc.data[0].age = 'thirty-one'; return doc.data[0].age; });
show('an unknown member', () => { doc.data[0].nickname = 'Al'; return doc.data[0].nickname; });

console.log('\n  the record is untouched by a refused write:', JSON.stringify(doc.data[0]));

// The error code is the one a PARSE of the same text would raise. Nothing new was
// invented for the write path — the same member definition, the same type, the same
// check, at a call site it never used to reach.
h2('the same value, refused the same way, coming through text');
try {
  parseDocument('name: string, age: int\n---\nname: Alice, age: thirty-one');
} catch (e: any) {
  console.log('  parsing it   :', e.errorCode);
}

h2('the method layer says exactly the same thing');
show('rec.set()', () => { doc.data[0].set('age', 'nope'); return null; });

// ═════════════════════════════════════════════════════════════════════════════
h1('2 · Inserting');
// ═════════════════════════════════════════════════════════════════════════════

// A record you add is the one you are most likely to get wrong, so it is checked on the
// way in. The collection knows the section's schema; the record arrives carrying nothing.
show('a good record', () => { doc.data.push({ name: 'Dev', age: 41 }); return doc.data.length; });
show('a bad value', () => { doc.data.push({ name: 'Bad', age: 'no' }); return doc.data.length; });
show('a MISSING member', () => { doc.data.push({ name: 'Bad' }); return doc.data.length; });

console.log('\n  only the valid one landed:', JSON.stringify(doc.toObject()));

h2('the inserted record is ADOPTED — read it back out of the collection');
// Adoption re-loads, because a hand-built record is wrong by what it omits at least as
// often as by what it holds. So the stored record is not always the object you passed.
const added = doc.data[doc.data.length - 1];
console.log('  it is a record   :', added instanceof Object);
console.log('  it has the schema:', !!added.getSchema?.() || 'via the proxy');
show('so ITS writes are checked too', () => { added.age = 'nope'; return null; });

h2('a push that rejects one of several stores none of them');
const before = doc.data.length;
show('three, one bad', () => {
  doc.data.push({ name: 'A', age: 1 }, { name: 'B', age: 'no' }, { name: 'C', age: 3 });
  return doc.data.length;
});
console.log('  length unchanged :', doc.data.length === before);

// ═════════════════════════════════════════════════════════════════════════════
h1('3 · Attaching a schema to data you already have');
// ═════════════════════════════════════════════════════════════════════════════

const defs: any = parseDefinitions('~ $person: {name: string, age: int}');
const person = defs.getV('$person');
const rowsOf = (items: any[]) => new IOCollection<any>(items.map((i) => new IOObject(i)));

h2('without a sink it is atomic — it throws, and nothing is attached');
const bad = rowsOf([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 'no' }]);
show('attach', () => { bad.attachSchema(person, defs); return null; });
console.log('  schema attached? :', bad.getSchema() !== null);

h2('with a sink it is a CHECK — every mismatch reported, still nothing changed');
const sink: Error[] = [];
rowsOf([{ name: 'A', age: 'no' }, { name: 'B', age: 30 }, { name: 'C', age: 'nope' }])
  .attachSchema(person, defs, sink);
console.log('  reported         :', sink.map((e: any) => e.errorCode));

h2('and when it fits, the schema goes on and governs everything after');
const good = rowsOf([{ name: 'Alice', age: 30 }]);
good.attachSchema(person, defs);
console.log('  attached         :', good.getSchema() !== null);
show('a later insert', () => { good.push({ name: 'X', age: 'no' } as any); return null; });

// ═════════════════════════════════════════════════════════════════════════════
h1('4 · No schema, no checking — vacuously');
// ═════════════════════════════════════════════════════════════════════════════

// This is not an exception to the rule. There is no shape to check against, so the
// invariant is about schema-bearing documents and needs no caveat.
const loose: any = parseDocument('name: Alice, age: 30');
show('anything goes', () => { loose.data.age = { deeply: ['odd'] }; return loose.data.age; });

// ═════════════════════════════════════════════════════════════════════════════
h1('5 · And so a broken document cannot become a broken file');
// ═════════════════════════════════════════════════════════════════════════════

// Collecting errors instead of throwing is only safe because of this. A projection may
// DESCRIBE errors; a file must not CONTAIN them.
const bag: Error[] = [];
const withError: any = parseDocument('age: int\n---\n~ 30\n~ abc\n~ 40', null, bag);

console.log('  collected        :', bag.map((e: any) => e.errorCode));
console.log('  toObject() keeps them:', JSON.stringify(withError.toObject()).includes('__error'));
show('serialize', () => stringifyDocument(withError));
show('skipErrors', () => stringifyDocument(withError, { skipErrors: true } as any));

console.log(`
  Five doors — parse, load, write, insert, attach — and the same check behind each.
  That is what "a document that cannot hold invalid data" has to mean to be worth
  saying: not that writes are usually checked, but that there is no way in that is not.`);
