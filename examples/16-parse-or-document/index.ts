/**
 * 16 — `parse` or `parseDocument`?
 *
 * Two entry points, one parser. They validate identically and differ only in what they hand back.
 * The rule is short: **take `parse` unless you need the document as a document.**
 *
 * Run me:  npx tsx examples/16-parse-or-document/index.ts
 */
import io, { parse, parseDocument, safeParse, safeParseDocument, section, sections, header, isError, node } from '../../src/index';

const h1 = (s: string) => console.log(`\n${'═'.repeat(74)}\n  ${s}\n${'═'.repeat(74)}`);
const h2 = (s: string) => console.log(`\n── ${s} ${'─'.repeat(Math.max(0, 68 - s.length))}`);

const TEAM = `
~ $person: {name: string, age: int}
--- employees: $person
~ Alice, 30
~ Bob, 25
--- managers: $person
~ Carol, 41
`;

// ═════════════════════════════════════════════════════════════════════════════
h1('1 · parse gives you plain JavaScript');
// ═════════════════════════════════════════════════════════════════════════════

const data: any = parse(TEAM);
console.log(JSON.stringify(data, null, 2));

// It is genuinely plain — no wrapper, nothing to unwrap, and every check a utility
// library makes about "is this a plain object?" passes.
h2('plain all the way down');
console.log('  constructor    :', data.employees[0].constructor === Object);
console.log('  Object.keys    :', Object.keys(data.employees[0]));
console.log('  structuredClone:', !!structuredClone(data));

// This is the shape the playground's JSON panel shows. Paste a document there, read
// the panel, write your code against it — that agreement is a contract, not a habit.

h2('and values keep their real types');
const typed: any = parse("born: date, pay: decimal, big: bigint\n---\nborn: d'1994-03-01', pay: 10.50m, big: 42n");
console.log('  born :', typed.born.constructor.name);
console.log('  pay  :', typed.pay.constructor.name);
console.log('  big  :', typeof typed.big);
// `toJSON()` is the spelling for the wire, where a Date has to be a string.

// ═════════════════════════════════════════════════════════════════════════════
h1('2 · parseDocument gives you the document');
// ═════════════════════════════════════════════════════════════════════════════

const doc: any = parseDocument(TEAM);

h2('reachable by name, then by index, then by member');
console.log('  employees[0].name :', doc.sections.employees[0].name);
console.log('  managers[0].age   :', doc.sections.managers[0].age);
console.log("  ['employees'][1]  :", doc.sections['employees'][1].name);
console.log('  by position       :', doc.sections[0][0].name);

h2('and it is still a collection, with the whole array surface');
const rows = doc.sections.employees;
console.log('  map + join :', rows.map((r: any) => r.name).join(', '));
console.log('  filter     :', rows.filter((r: any) => r.age > 26).length, 'over 26');
console.log('  sorted     :', rows.toSorted((a: any, b: any) => a.age - b.age)[0].name);

h2('writes go through the schema');
doc.sections.employees[0].age = 31;
console.log('  after write:', doc.sections.employees[0].age);
try {
  doc.sections.employees[0].age = 'thirty-one';
} catch (e: any) {
  console.log('  refused    :', e.errorCode, '— see example 17');
}

// ═════════════════════════════════════════════════════════════════════════════
h1('3 · doc.data, and why it is not a special case');
// ═════════════════════════════════════════════════════════════════════════════

// A document that names none of its sections has one called `data` — the specification's
// rule, not an invention here. So `doc.data` is simply `doc.sections.data`.
const plain: any = parseDocument('name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25');
console.log('  doc.data[0].name    :', plain.data[0].name);
console.log('  same object         :', plain.data === plain.sections.data);
console.log('  on a NAMED document :', doc.data, '(use doc.sections.<name>)');

// ═════════════════════════════════════════════════════════════════════════════
h1('4 · When the data is named like the API');
// ═════════════════════════════════════════════════════════════════════════════

// Property access is shadowable by construction. A section really called `length`, or a
// member really called `get`, resolves to the DATA — exactly as an own property shadows a
// prototype method on any JavaScript object. That is the language's rule, not ours.
const awkward: any = parseDocument('~ $s: {get: string}\n--- length: $s\n~ shadowed');

h2('the data wins, as it would on any object');
console.log('  sections.length[0].get :', awkward.sections.length[0].get);

h2('and the functional forms cannot be shadowed');
console.log('  io.sections(doc) keys  :', Object.keys(sections(awkward)));
console.log('  how many sections      :', Object.keys(sections(awkward)).length);
console.log('  io.node(rec).get(...)  :', node(awkward.sections.length[0]).get('get'));

h2('io.section gives the section OBJECT; property access gives its DATA');
console.log('  section(doc, "employees").name       :', section(doc, 'employees')!.name);
console.log('  section(doc, "employees").schemaName :', section(doc, 'employees')!.schemaName);

h2('io.sections is always keyed — the escape from the unwrapping hazard');
// `toObject()` unwraps a lone section, which is what application code wants and what the
// playground shows. Code that must not change shape the day a second section appears
// takes `io.sections()` instead.
const one: any = parseDocument('name: string\n---\n~ Alice');
console.log('  toObject()   :', JSON.stringify(one.toObject()));
console.log('  io.sections():', JSON.stringify(Object.keys(sections(one))));

h2('io.header reaches what the projection deliberately does not carry');
const withHeader: any = parseDocument('~ $p: {name: string}\n~ @env: prod\n--- users: $p\n~ Alice');
console.log('  @env         :', header(withHeader)!.definitions!.getValue('@env'));
console.log('  in toObject? :', JSON.stringify(withHeader.toObject()));

// ═════════════════════════════════════════════════════════════════════════════
h1('5 · Errors, on either path');
// ═════════════════════════════════════════════════════════════════════════════

// Whether you pass a sink is the whole of the fail-fast question. There is no `strict`
// option because there is nothing left for it to decide.
h2('no sink: the first error throws');
try { parse('age: int\n---\nage: abc'); } catch (e: any) { console.log('  threw :', e.errorCode); }

h2('an array sink: parsing continues, the bad record is embedded');
const bag: Error[] = [];
const withErrors: any = parse('age: int\n---\n~ 30\n~ abc\n~ 40', null, bag);
console.log('  collected  :', bag.map((e: any) => e.errorCode));
console.log('  records    :', withErrors.length, '(the good ones survive)');
console.log('  io.isError :', withErrors.map((r: any) => isError(r)));
console.log('  good rows  :', JSON.stringify(withErrors.filter((r: any) => !isError(r))));

h2('a function sink, if you would rather stream them');
parse('age: int\n---\n~ abc', null, (e: any) => console.log('  reported   :', e.errorCode));

h2('skipErrors asks a different question: what should the RESULT hold?');
console.log('  default     :', JSON.stringify(parse('age: int\n---\n~ 30\n~ abc', null, [])));
console.log('  skipErrors  :', JSON.stringify(parse('age: int\n---\n~ 30\n~ abc', null, [], { skipErrors: true })));

h2('or take the safe pair — the data and the errors in ONE result');
// safeParse never throws. Because the errors come back in the same value as the data, they cannot
// be discarded separately — a sink array can be thrown away, this cannot.
const safe = safeParse<any[]>('age: int\n---\n~ 30\n~ abc');
console.log('  ok          :', safe.ok);
console.log('  data        :', JSON.stringify(safe.data));
console.log('  errors      :', safe.errors.map((e: any) => `${e.errorCode}@${e.collectionIndex}`).join(', '));
console.log('  safeParseDocument :', safeParseDocument('age: int\n---\n~ 30\n~ abc').ok, '(same idea, the document under `doc`)');

// ═════════════════════════════════════════════════════════════════════════════
h1('6 · One pipeline, two shapes');
// ═════════════════════════════════════════════════════════════════════════════

console.log('  parse(text) deep-equals parseDocument(text).toObject() :',
  JSON.stringify(parse(TEAM)) === JSON.stringify(parseDocument(TEAM).toObject()));

// The same two entry points exist as TAGS, for text you write rather than receive.
// `TEAM` above is a variable, which is exactly why this example uses the functions:
// a tag can only be written against a literal.
h2('the same pair, written inline');
console.log('  io``     :', JSON.stringify(io`name: string, age: int
---
~ Alice, 30`));
console.log('  io.doc`` :', io.doc`name: string, age: int
---
~ Alice, 30`.constructor.name);

console.log(`
  Take parse when the data is going into your code, across a worker boundary, or
  into JSON. Take parseDocument when you need the header, the sections, writes that
  are checked, or a round trip back to Internet Object text.`);
