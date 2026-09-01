/**
 * 07 — Errors: what went wrong, and exactly where
 *
 * Run me:  npx tsx examples/07-errors/index.ts
 */
import io, { parse, safeParse, ErrorCodes } from '../../src/index';

// ── Three ways to receive an error ────────────────────────────────────────────

// 1. Throw — the default. With no sink the FIRST error is raised, and the complete list rides
//    along as `.errors`, so one run shows every problem.
try {
  io.doc`name: string, age: int\n---\n~ Alice, notanumber`;
} catch (e) {
  const err = e as any;
  console.log('threw    :', err.errorCode);
  console.log('message  :', err.message);
  console.log('all of it:', err.errors?.length, 'error(s) on .errors');
}

// 2. safeParse — never throws. The data and the errors come back in ONE result, so neither can
//    be lost: the good records intact, the failed one embedded in place.
const r = safeParse<any[]>('name: string, age: int\n---\n~ Alice, notanumber\n~ Bob, 25');
console.log('\nok      :', r.ok);
console.log('errors  :', r.errors.map((e: any) => e.errorCode));
for (const row of r.data ?? []) {
  console.log(io.isError(row)
    ? `   x ${(row as any).errorCode} at ${(row as any).position?.row}:${(row as any).position?.col}`
    : `   + ${JSON.stringify(row)}`);
}

// 3. Collect into a sink — the same recovery, when you want to route errors somewhere yourself.
// A sink goes in the same slot on a tag as on a function: `.with(defs, sink)`.
const errors: Error[] = [];
io.doc.with(null, errors)`name: string, age: int, email: email
---
~ Alice, notanumber, alice@example.com
~ Bob, 25, not-an-email
~ Carol, 28, carol@example.com`;

console.log(`\ncollected ${errors.length} problems, and still read the good rows:`);
for (const e of errors) {
  const err = e as any;
  console.log(`   ${err.errorCode.padEnd(18)} at ${err.position?.row}:${err.position?.col}`);
}

// ── An error tells you three things ───────────────────────────────────────────

const one: Error[] = [];
io.doc.with(null, one)`age: int\n---\n~ nope`;
const e = one[0] as any;
console.log('\ncode    ', e.errorCode, '  <- stable, safe to branch on');
console.log('fact    ', e.fact, '  <- for a human');
console.log('position', `row ${e.position?.row}, col ${e.position?.col}`, '  <- where to look');

// Branch on the CODE, never on the message. Messages are for people and may be
// reworded; codes are part of the contract.
if (e.errorCode === ErrorCodes.expectedInteger) console.log('\nMatched ErrorCodes.expectedInteger.');

// ── Codes you will meet ───────────────────────────────────────────────────────

// An error can reach you three ways, so a helper that only checks one will tell you
// "accepted" about a document that was plainly rejected. Check all three:
//
//   1. thrown          -- structural problems, when you did not pass a collector
//   2. the collector   -- most validation failures
//   3. on the VALUE    -- a bad literal replaces the record it appeared in
// This helper receives its text as an argument, so it uses the FUNCTION form. A tag can only
// be written inline, against a literal -- which is the whole difference between the two.
const codeOf = (src: string): string => {
  const collected: Error[] = [];
  let value: any;
  try {
    value = parse(src, null, collected);
  } catch (err) {
    return (err as any).errorCode;                                   // 1
  }
  if (collected.length) return (collected[0] as any).errorCode;      // 2
  const record = Array.isArray(value) ? value[0] : value;            // 3
  if (record?.errorCode) return record.errorCode;
  for (const member of Object.values(record ?? {})) {
    if (member && typeof member === 'object' && (member as any).errorCode) {
      return (member as any).errorCode;
    }
  }
  return 'accepted';
};
const show = (label: string, src: string) => console.log(`  ${label.padEnd(26)} ${codeOf(src)}`);
console.log('\nCommon codes:');
show('wrong type', 'age: int\n---\n~ nope');
show('missing required member', 'a: int, b: int\n---\n~ 1');
show('value below minimum', 'age: {int, min: 18}\n---\n~ 10');
show('not one of the choices', 'c: {string, choices: [x, y]}\n---\n~ z');
show('unclosed brace', 'a: object\n---\n~ {b: 1');
show('unterminated string', 'a: string\n---\n~ "oops');
show('impossible date', 'd: date\n---\n~ d"2026-02-30"');
show('duplicate member name', 'a: 1, a: 2');
