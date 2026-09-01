/**
 * 03 — Schemas: validation you get for free
 *
 * Run me:  npx tsx examples/03-schemas-and-validation/index.ts
 */
import io, { parseDocument } from '../../src/index';

// ── A schema is just the first line ───────────────────────────────────────────

// You have already written schemas in the previous example without noticing.
// `name: string, age: int` IS the schema. Naming the fields and typing them are
// the same act.
const good = io.doc`name: string, age: int
---
~ Alice, 30
~ Bob, 25`;
console.log('Valid data:', good.toObject());

// ── Wrong data is caught as it is read ────────────────────────────────────────

// No separate validation step to remember. Pass an array and errors collect into
// it instead of throwing.
const errors: Error[] = [];
io.doc.with(null, errors)`name: string, age: int
---
~ Alice, thirty
~ Bob, 25`;

for (const e of errors) console.log('\nCaught:', (e as any).errorCode, '—', e.message);

// ── Saying more than the type ─────────────────────────────────────────────────

// A member can carry rules. Wrap it in braces and add them by name.
const withRules = io`
  name:  {string, minLen: 2, maxLen: 40},
  age:   {int, min: 0, max: 130},
  email: email,
  role:  {string, choices: [admin, editor, viewer]}
---
~ Alice, 30, alice@example.com, admin`;
console.log('\nWith rules:', withRules);

// Each rule is checked for you. This helper receives its text as an argument, so it uses
// the FUNCTION form -- a tag can only be written inline, against a literal.
const show = (label: string, src: string) => {
  const errs: Error[] = [];
  parseDocument(src, null, errs);
  console.log(`  ${label.padEnd(22)} ${errs.length ? (errs[0] as any).errorCode : 'accepted'}`);
};
console.log('\nWhat the rules reject:');
show('age above max', `age: {int, max: 130}\n---\n~ 200`);
show('name too short', `name: {string, minLen: 2}\n---\n~ A`);
show('not a listed choice', `role: {string, choices: [admin, viewer]}\n---\n~ ghost`);
show('not an email', `email: email\n---\n~ not-an-email`);

// ── Optional and nullable ─────────────────────────────────────────────────────

// `?` means the member may be absent. `*` means its value may be null.
// They are different questions, so they are different marks.
console.log('\nOptional absent :', io`name: string, nickname?: string\n---\n~ Alice`);
console.log('Nullable null   :', io`name: string, manager*: string\n---\n~ Alice, N`);

// A default fills an optional member that was not supplied.
console.log('Default applied :', io`name: string, active?: {bool, default: T}\n---\n~ Alice`);
