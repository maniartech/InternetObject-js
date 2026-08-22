import { writeFileSync, mkdirSync } from 'fs';
import parse from '../../src/parser/index';
import { stringifyDocument } from '../../src/facade/stringify-document';

/**
 * Generate the `serializer/round-trip.io` corpus suite.
 *
 *   npx tsx tools/corpus/suites-roundtrip.ts
 *
 * The serializer suite had ZERO cases — and the serializer is where almost every defect of the past
 * week actually lived: a writer emitting text its own reader rejects, a section name that truncates,
 * `{}` re-serializing as `{*}`, a Decimal printed as its private fields. Round-trip behaviour was
 * pinned only by io-js2's own regression tests, which no port can run.
 *
 * Each case fixes three things at once:
 *
 *   1. `output`     — the CANONICAL text for this document. Two implementations that both "work"
 *                     but disagree on spelling produce diffs no one can review.
 *   2. re-parse     — `output` must decode to the same value as `input`. A writer that loses data
 *                     is the worst failure mode, because nothing errors.
 *   3. idempotence  — writing `output` again must produce `output`. Non-idempotence means the text
 *                     grows or flips on every round trip, as `{}` → `{*}` did.
 *
 * Expectations are OBSERVED, never authored — see suites-validation.ts for why.
 */

interface RtCase {
  name: string;
  /** An Internet Object document. */
  input: string;
  note?: string;
  group?: string;
  /** Pin current behaviour while flagging it as suspect. */
  review?: string;
}

const OUT_DIR = '../io-test-cases/serializer';

function ioText(s: string): string {
  const esc = s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  return esc.includes('"') ? `'${esc.replace(/'/g, "\\'")}'` : `"${esc}"`;
}

const CASES: RtCase[] = [
  { group: 'scalars round-trip unchanged', name: 'string_bare', input: 'hello' },
  { name: 'string_quoted_with_space', input: '"hello world"' },
  { name: 'string_that_looks_numeric', input: '"0"',
    note: 'must stay a STRING — writing it bare would read back as the number 0' },
  { name: 'string_with_leading_space', input: '"  padded"' },
  { name: 'number_integer', input: '42' },
  { name: 'number_negative', input: '-42' },
  { name: 'number_fractional', input: '3.14' },
  { name: 'bool_true', input: 'T' },
  { name: 'bool_false', input: 'F' },
  { name: 'bigint_value', input: '9007199254740993n' },
  { name: 'decimal_value', input: '12.50m',
    note: 'scale is significant — 12.50 must not collapse to 12.5' },
  { name: 'datetime_value', input: 'dt"2024-03-20T14:30:45.000Z"',
    note: 'seconds must survive the round trip' },
  { name: 'binary_value', input: 'b"SGVsbG8="' },

  { group: 'containers keep their SHAPE', name: 'empty_array', input: '[]' },
  { name: 'empty_object', input: '{}' },
  { name: 'array_of_scalars', input: '[1, 2, 3]' },
  { name: 'nested_arrays', input: '[[1, 2], [3, 4]]',
    note: 'an array is typeof object — a nested array must not print as {"0": …}' },
  { name: 'array_of_objects', input: '[{a: 1}, {a: 2}]' },
  { name: 'object_with_nested_object', input: '{a: {b: {c: 1}}}' },
  { name: 'array_containing_empty_array', input: '[[], [1]]' },
  { name: 'mixed_array', input: '[1, "two", T, N]' },

  { group: 'keys that need quoting', name: 'key_with_colon', input: '{"a:b": 1}' },
  { name: 'key_with_comma', input: '{"a,b": 1}' },
  { name: 'key_with_space', input: '{"has space": 1}' },
  { name: 'key_with_leading_space', input: '{" lead": 1}' },
  { name: 'key_that_is_numeric', input: '{"10": 1}' },
  { name: 'key_containing_separator', input: '{"a---b": 1}',
    note: 'a bare key containing --- would read as a section separator and split the document' },

  { group: 'strings that could be read as something else', name: 'string_true', input: '"true"' },
  { name: 'string_null', input: '"null"' },
  { name: 'string_with_separator', input: '"x --- y"' },
  { name: 'string_with_comma', input: '"a,b"' },
  { name: 'string_with_braces', input: '"{a}"' },
  { name: 'string_with_backslash', input: r_backslash() },

  { group: 'documents with a header', name: 'header_and_record',
    input: '~ $schema: {name: string, age: int}\n---\n~ John, 30' },
  { name: 'header_collection',
    input: '~ $schema: {name: string, age: int}\n---\n~ John, 30\n~ Jane, 25' },
  { name: 'header_optional_member',
    input: '~ $schema: {name: string, age?: int}\n---\n~ John' },
  { name: 'header_nullable_member',
    input: '~ $schema: {name: string, age: {int, "null": T}}\n---\n~ John, N' },
  { name: 'header_open_schema',
    input: '~ $schema: {name: string, *}\n---\n~ John, extra: 1' },
  { name: 'header_nested_schema_ref',
    input: '~ $address: {city: string}\n~ $schema: {name: string, addr: $address}\n---\n~ John, {NYC}' },

  { group: 'root values that are not records', name: 'root_array_of_scalars', input: '[1, 2, 3]' },
  { name: 'root_scalar_number', input: '42' },
  { name: 'root_scalar_string', input: 'hello' },
];

/** A string containing a literal backslash, written without one appearing in this source line. */
function r_backslash(): string {
  return '"a' + String.fromCharCode(92) + String.fromCharCode(92) + 'b"';
}

function main(): void {
  const rows: string[] = [];
  rows.push('# Serializer · ROUND-TRIP');
  rows.push('# Authoritative: outcomes produced by running io-js2.');
  rows.push('#');
  rows.push('# Each case pins THREE properties at once:');
  rows.push('#   output       the canonical text for this document');
  rows.push('#   re-parse     `output` decodes to the same value as `input` (no data loss)');
  rows.push('#   idempotent   writing `output` again yields `output` (the text does not drift)');
  rows.push('#');
  rows.push('# A runner MUST check all three. Comparing values alone misses a writer that changes');
  rows.push('# the SHAPE of the data, and comparing text alone misses one that changes the value.');
  rows.push('#');
  rows.push('# GENERATED by io-js2 tools/corpus/suites-roundtrip.ts — edit the case table there.');
  rows.push('~ version: 1.0');
  rows.push('~ description: "Serializer round-trip — canonical output, value preservation, idempotence"');
  rows.push('~ $schema: { name: string, input: string, output: string }');
  rows.push('---');

  let lastGroup = '';
  let ok = 0;
  const problems: string[] = [];

  for (const c of CASES) {
    if (c.group && c.group !== lastGroup) {
      rows.push('');
      rows.push(`# ── ${c.group} ${'─'.repeat(Math.max(0, 84 - c.group.length))}`);
      lastGroup = c.group;
    }
    if (c.note) rows.push(`# ${c.note}`);
    if (c.review) rows.push(`# REVIEW: ${c.review}`);

    const opts = { includeHeader: true, includeTypes: true };
    let output: string;
    try {
      const doc: any = parse(c.input, null);
      const errs = (doc.getErrors?.() ?? []).map((e: any) => e.errorCode);
      if (errs.length) { problems.push(`${c.name}: input does not parse — ${errs.join(', ')}`); continue; }
      output = stringifyDocument(doc, opts);

      // Property 2: the output must decode to the same value.
      const back: any = parse(output, null);
      const backErrs = (back.getErrors?.() ?? []).map((e: any) => e.errorCode);
      if (backErrs.length) { problems.push(`${c.name}: OUTPUT DOES NOT REPARSE — ${backErrs.join(', ')}`); continue; }
      const a = JSON.stringify(doc.toJSON());
      const b = JSON.stringify(back.toJSON());
      if (a !== b) { problems.push(`${c.name}: VALUE CHANGED\n    in  ${a}\n    out ${b}`); continue; }

      // Property 3: writing it again must not change it.
      const again = stringifyDocument(back, opts);
      if (again !== output) { problems.push(`${c.name}: NOT IDEMPOTENT\n    1st ${JSON.stringify(output)}\n    2nd ${JSON.stringify(again)}`); continue; }
    } catch (e: any) {
      problems.push(`${c.name}: THREW ${e?.errorCode ?? e?.message}`);
      continue;
    }

    rows.push(`~ ${c.name}, ${ioText(c.input)}, ${ioText(output)}`);
    ok++;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(`${OUT_DIR}/round-trip.io`, rows.join('\n') + '\n', 'utf8');
  console.log(`${OUT_DIR}/round-trip.io: ${ok} cases`);
  if (problems.length) {
    console.log(`\n${problems.length} case(s) NOT emitted — each is a real round-trip defect:`);
    for (const p of problems) console.log(`  ${p}`);
  }
}

main();
