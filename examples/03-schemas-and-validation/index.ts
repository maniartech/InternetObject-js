/**
 * 03 — Schemas: validation you get for free
 *
 * Run me:  npx tsx examples/03-schemas-and-validation/index.ts
 */
import { parseDocument } from '../../src/index';

// ── A schema is just the first line ───────────────────────────────────────────

// You have already written schemas in the previous example without noticing.
// `name: string, age: int` IS the schema. Naming the fields and typing them are
// the same act.
const good = parseDocument(`name: string, age: int
---
~ Alice, 30
~ Bob, 25`);
console.log('Valid data:', good.toObject());

// ── Wrong data is caught as it is read ────────────────────────────────────────

// No separate validation step to remember. Pass an array and errors collect into
// it instead of throwing.
const errors: Error[] = [];
parseDocument(`name: string, age: int
---
~ Alice, thirty
~ Bob, 25`, null, errors);

for (const e of errors) console.log('\nCaught:', (e as any).errorCode, '—', e.message);

// ── Saying more than the type ─────────────────────────────────────────────────

// A member can carry rules. Wrap it in braces and add them by name.
const rules = `
  name:  {string, minLen: 2, maxLen: 40},
  age:   {int, min: 0, max: 130},
  email: email,
  role:  {string, choices: [admin, editor, viewer]}
---
~ Alice, 30, alice@example.com, admin`;
console.log('\nWith rules:', parseDocument(rules).toObject());

// Each rule is checked for you:
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
console.log('\nOptional absent :', parseDocument('name: string, nickname?: string\n---\n~ Alice').toObject());
console.log('Nullable null   :', parseDocument('name: string, manager*: string\n---\n~ Alice, N').toObject());

// A default fills an optional member that was not supplied.
console.log('Default applied :', parseDocument('name: string, active?: {bool, default: T}\n---\n~ Alice').toObject());
