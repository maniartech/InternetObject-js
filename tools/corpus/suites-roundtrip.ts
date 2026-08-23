import { writeFileSync, mkdirSync } from 'fs';
import { requireCorpusPath } from './sibling-repos'
import parse from '../../src/parser/index';
import { stringifyDocument } from '../../src/facade/stringify-document';

/**
 * Generate the `serializer/` corpus suites.
 *
 *   npx tsx tools/corpus/suites-roundtrip.ts
 *
 * The serializer suite had ZERO cases until 2026-08 — and the serializer is where almost every
 * defect of that period actually lived: a writer emitting text its own reader rejects, a section
 * name that truncates, `{}` re-serializing as `{*}`, a Decimal printed as its private fields.
 * Round-trip behaviour was pinned only by the reference implementation's own regression tests, which no port can run.
 *
 * Each case fixes three things at once:
 *
 *   1. `output`     — the CANONICAL text for this document. Two implementations that both "work"
 *                     but disagree on spelling produce diffs no one can review.
 *   2. re-parse     — `output` must decode to the same value as `input`. A writer that loses data
 *                     is the worst failure mode, because nothing errors.
 *   3. idempotence  — writing `output` again must produce `output`. Non-idempotence means the text
 *                     grows or flips on every round trip, as `{}` -> `{*}` did.
 *
 * Expectations are OBSERVED, never authored. This generator goes further than the others: it
 * CHECKS all three properties before writing a row, and REFUSES to emit one that fails. A case
 * that does not appear in the output is therefore a live defect, reported at the end of the run —
 * the corpus never silently records a broken round trip as correct.
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

interface RtSuite {
  file: string;
  description: string;
  header: string[];
  cases: RtCase[];
}

const OUT_DIR = requireCorpusPath('serializer');

function ioText(s: string): string {
  const esc = s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
  return esc.includes('"') ? `'${esc.replace(/'/g, "\\'")}'` : `"${esc}"`;
}

/** A literal backslash, built by code so no source line here contains one to be miscounted. */
const BS = String.fromCharCode(92);

// ---------------------------------------------------------------------------------------------
// Scalars
// ---------------------------------------------------------------------------------------------
const scalars: RtCase[] = [
  { group: 'strings', name: 'string_bare', input: 'hello' },
  { name: 'string_quoted_with_space', input: '"hello world"' },
  { name: 'string_with_leading_space', input: '"  padded"' },
  { name: 'string_with_trailing_space', input: '"padded  "' },
  { name: 'string_empty', input: '""' },
  { name: 'string_single_char', input: 'x' },
  { name: 'string_unicode', input: '"héllo wörld"' },
  { name: 'string_emoji', input: '"a 😀 b"' },
  { name: 'string_cjk', input: '"日本語"' },
  { name: 'string_with_tab', input: '"a\tb"' },
  { name: 'string_with_newline', input: '"a\nb"' },

  { group: 'numbers', name: 'number_integer', input: '42' },
  { name: 'number_zero', input: '0' },
  { name: 'number_negative', input: '-42' },
  { name: 'number_explicit_plus', input: '+42' },
  { name: 'number_fractional', input: '3.14' },
  { name: 'number_negative_fractional', input: '-0.5' },
  { name: 'number_leading_dot', input: '.5' },
  { name: 'number_exponent', input: '1e10' },
  { name: 'number_negative_exponent', input: '1.5e-10' },
  { name: 'number_capital_exponent', input: '2E5' },
  { name: 'number_max_safe_integer', input: '9007199254740991' },
  { name: 'number_hex', input: '0xFF' },
  { name: 'number_octal', input: '0o17' },
  { name: 'number_binary', input: '0b1010' },
  { name: 'number_nan', input: 'NaN' },
  { name: 'number_infinity', input: 'Inf' },
  { name: 'number_negative_infinity', input: '-Inf' },

  { group: 'precise numerics', name: 'bigint_value', input: '9007199254740993n' },
  { name: 'bigint_negative', input: '-9007199254740993n' },
  { name: 'bigint_zero', input: '0n' },
  { name: 'decimal_value', input: '12.50m',
    note: 'scale is significant — 12.50 must not collapse to 12.5' },
  { name: 'decimal_integer', input: '12m' },
  { name: 'decimal_negative', input: '-0.001m' },
  { name: 'decimal_many_places', input: '1.234567890123456789012345m' },

  { group: 'booleans and null', name: 'bool_true', input: 'T' },
  { name: 'bool_false', input: 'F' },
  { name: 'bool_true_spelled', input: 'true' },
  { name: 'bool_false_spelled', input: 'false' },
  { name: 'null_short', input: 'N' },
  { name: 'null_spelled', input: 'null' },

  { group: 'temporal', name: 'datetime_value', input: 'dt"2024-03-20T14:30:45.000Z"',
    note: 'seconds must survive the round trip' },
  { name: 'datetime_with_millis', input: 'dt"2024-03-20T14:30:45.123Z"' },
  { name: 'date_value', input: 'd"2024-03-20"' },
  { name: 'time_value', input: 't"14:30:45.000"' },

  { group: 'binary', name: 'binary_value', input: 'b"SGVsbG8="' },
  { name: 'binary_empty', input: 'b""' },
];

// ---------------------------------------------------------------------------------------------
// Containers
// ---------------------------------------------------------------------------------------------
const containers: RtCase[] = [
  { group: 'empties keep their shape', name: 'empty_array', input: '[]' },
  { name: 'empty_object', input: '{}' },
  { name: 'array_containing_empty_array', input: '[[], [1]]' },
  { name: 'array_containing_empty_object', input: '[{}, {a: 1}]' },
  { name: 'object_containing_empties', input: '{a: [], b: {}}' },

  { group: 'arrays', name: 'array_of_scalars', input: '[1, 2, 3]' },
  { name: 'array_single_element', input: '[1]' },
  { name: 'nested_arrays', input: '[[1, 2], [3, 4]]',
    note: 'an array is typeof object — a nested array must not print as {"0": …}' },
  { name: 'deeply_nested_arrays', input: '[[[[1]]]]' },
  { name: 'array_of_objects', input: '[{a: 1}, {a: 2}]' },
  { name: 'mixed_array', input: '[1, "two", T, N]' },
  { name: 'array_of_mixed_numerics', input: '[1, 1.5, 2n, 3.5m]' },
  { name: 'array_with_nulls', input: '[N, N, 1]' },

  { group: 'objects', name: 'object_single_member', input: '{a: 1}' },
  { name: 'object_with_nested_object', input: '{a: {b: {c: 1}}}' },
  { name: 'object_with_array_member', input: '{a: [1, 2]}' },
  { name: 'object_many_members', input: '{a: 1, b: 2, c: 3, d: 4, e: 5}' },
  { name: 'object_positional_members', input: '{1, 2, 3}' },
  { name: 'object_mixed_positional_and_keyed', input: '{1, b: 2}' },
  { name: 'array_of_objects_with_arrays', input: '[{a: [1]}, {a: [2]}]' },
];

// ---------------------------------------------------------------------------------------------
// Quoting — where a writer must add quotes its reader would otherwise misread
// ---------------------------------------------------------------------------------------------
const quoting: RtCase[] = [
  { group: 'keys that need quoting', name: 'key_with_colon', input: '{"a:b": 1}' },
  { name: 'key_with_comma', input: '{"a,b": 1}' },
  { name: 'key_with_space', input: '{"has space": 1}' },
  { name: 'key_with_leading_space', input: '{" lead": 1}' },
  { name: 'key_that_is_numeric', input: '{"10": 1}' },
  { name: 'key_containing_separator', input: '{"a---b": 1}',
    note: 'a bare key containing --- would read as a section separator and split the document' },
  { name: 'key_with_braces', input: '{"a{b": 1}' },
  { name: 'key_with_brackets', input: '{"a[b": 1}' },
  { name: 'key_with_tilde', input: '{"a~b": 1}' },
  { name: 'key_with_hash', input: '{"a#b": 1}' },
  { name: 'key_empty_string', input: '{"": 1}' },
  { name: 'key_unicode', input: '{"клавиша": 1}' },

  { group: 'strings a reader would take for a keyword', name: 'string_true', input: '"true"' },
  { name: 'string_false', input: '"false"' },
  { name: 'string_null', input: '"null"' },
  { name: 'string_T', input: '"T"' },
  { name: 'string_F', input: '"F"' },
  { name: 'string_N', input: '"N"' },
  { name: 'string_NaN', input: '"NaN"' },
  { name: 'string_Inf', input: '"Inf"' },

  { group: 'strings a reader would take for a number', name: 'string_that_looks_numeric', input: '"0"',
    note: 'must stay a STRING — writing it bare would read back as the number 0' },
  { name: 'string_negative_number', input: '"-1"' },
  { name: 'string_float', input: '"1.5"' },
  { name: 'string_exponent', input: '"1e5"' },
  { name: 'string_hex_prefix', input: '"0xFF"',
    note: 'a marker is a claim: bare 0xFF is a number, so the string form must be quoted' },
  { name: 'string_bigint_suffix', input: '"12n"' },
  { name: 'string_decimal_suffix', input: '"12m"' },
  { name: 'string_leading_zeros', input: '"007"' },
  { name: 'string_code_that_starts_with_digits', input: '"013ABSD"',
    note: 'NOT a number by rule 1 (all or nothing), so it is a valid OPEN string and needs no quotes' },

  { group: 'strings carrying structural characters', name: 'string_with_separator', input: '"x --- y"' },
  { name: 'string_with_comma', input: '"a,b"' },
  { name: 'string_with_colon', input: '"a:b"' },
  { name: 'string_with_braces', input: '"{a}"' },
  { name: 'string_with_brackets', input: '"[a]"' },
  { name: 'string_with_tilde', input: '"~a"' },
  { name: 'string_with_hash', input: '"a # b"' },
  { name: 'string_with_double_quote', input: "'say \"hi\"'" },
  { name: 'string_with_single_quote', input: '"it\'s"' },
  { name: 'string_with_backslash', input: '"a' + BS + BS + 'b"' },
  { name: 'string_only_whitespace', input: '"   "' },
];

// ---------------------------------------------------------------------------------------------
// Headers and schemas
// ---------------------------------------------------------------------------------------------
const headers: RtCase[] = [
  { group: 'a schema and its records', name: 'header_and_record',
    input: '~ $schema: {name: string, age: int}\n---\n~ John, 30' },
  { name: 'header_collection',
    input: '~ $schema: {name: string, age: int}\n---\n~ John, 30\n~ Jane, 25' },
  { name: 'header_single_member_schema',
    input: '~ $schema: {name: string}\n---\n~ John' },
  { name: 'header_many_members',
    input: '~ $schema: {a: int, b: string, c: bool, d: number}\n---\n~ 1, x, T, 2.5' },

  { group: 'member modifiers', name: 'header_optional_member',
    input: '~ $schema: {name: string, age?: int}\n---\n~ John' },
  { name: 'header_optional_member_supplied',
    input: '~ $schema: {name: string, age?: int}\n---\n~ John, 30' },
  { name: 'header_nullable_member',
    input: '~ $schema: {name: string, age: {int, "null": T}}\n---\n~ John, N' },
  { name: 'header_star_nullable_member',
    input: '~ $schema: {name: string, age*: int}\n---\n~ John, N' },
  { name: 'header_optional_and_nullable',
    input: '~ $schema: {name: string, age?*: int}\n---\n~ John, N' },
  { name: 'header_default_value',
    input: '~ $schema: {name: string, age?: {int, default: 18}}\n---\n~ John' },

  { group: 'open and closed schemas', name: 'header_open_schema',
    input: '~ $schema: {name: string, *}\n---\n~ John, extra: 1' },
  { name: 'header_typed_additional_props',
    input: '~ $schema: {name: string, *: int}\n---\n~ John, extra: 1' },
  { name: 'header_closed_schema_exact',
    input: '~ $schema: {name: string}\n---\n~ John' },

  { group: 'nested and referenced schemas', name: 'header_nested_schema_ref',
    input: '~ $address: {city: string}\n~ $schema: {name: string, addr: $address}\n---\n~ John, {NYC}' },
  { name: 'header_inline_nested_schema',
    input: '~ $schema: {name: string, addr: {city: string, zip: string}}\n---\n~ John, {NYC, "10001"}',
    note: 'the zip is QUOTED because the member is a string — bare 10001 would be a number' },
  { name: 'header_array_member',
    input: '~ $schema: {name: string, tags: [string]}\n---\n~ John, [a, b]' },
  { name: 'header_array_of_objects',
    input: '~ $schema: {items: [{id: int}]}\n---\n~ [{1}, {2}]' },
  { name: 'header_ref_used_twice',
    input: '~ $p: {x: int}\n~ $schema: {a: $p, b: $p}\n---\n~ {1}, {2}' },

  { group: 'constraints survive the round trip', name: 'header_choices',
    input: '~ $schema: {c: {string, choices: [red, green]}}\n---\n~ red' },
  { name: 'header_min_max',
    input: '~ $schema: {n: {int, min: 0, max: 10}}\n---\n~ 5' },
  { name: 'header_len_constraints',
    input: '~ $schema: {s: {string, minLen: 1, maxLen: 5}}\n---\n~ abc' },
  { name: 'header_pattern',
    input: '~ $schema: {s: {string, pattern: "^[a-z]+$"}}\n---\n~ abc' },

  { group: 'metadata and variables in the header', name: 'header_metadata',
    input: '~ page: 1\n~ $schema: {a: int}\n---\n~ 1' },
  { name: 'header_variable_used_in_data',
    input: '~ @co: ACME\n~ $schema: {name: string, employer: string}\n---\n~ John, @co' },
  { name: 'header_variable_in_choices',
    input: '~ @r: red\n~ $schema: {c: {string, choices: [@r]}}\n---\n~ red' },
  { name: 'header_metadata_only',
    input: '~ page: 1\n---\n~ a: 1' },
];

// ---------------------------------------------------------------------------------------------
// Documents — sections, collections, and shapes above the record
// ---------------------------------------------------------------------------------------------
const documents: RtCase[] = [
  { group: 'root values that are not records', name: 'root_array_of_scalars', input: '[1, 2, 3]' },
  { name: 'root_scalar_number', input: '42' },
  { name: 'root_scalar_string', input: 'hello' },
  { name: 'root_object', input: 'a: 1, b: 2' },
  { name: 'root_positional_object', input: '1, 2' },

  { group: 'collections', name: 'collection_two_records', input: '~ a: 1\n~ a: 2' },
  { name: 'collection_one_record', input: '~ a: 1' },
  { name: 'collection_of_scalars', input: '~ 1\n~ 2' },
  { name: 'collection_of_arrays', input: '~ [1]\n~ [2]' },
  { name: 'collection_ragged_records', input: '~ a: 1\n~ a: 1, b: 2' },

  { group: 'sections', name: 'two_named_sections', input: '--- one\n~ a: 1\n--- two\n~ b: 2' },
  { name: 'three_named_sections', input: '--- one\n~ a: 1\n--- two\n~ b: 2\n--- three\n~ c: 3' },
  { name: 'named_section_after_default', input: '---\n~ a: 1\n--- more\n~ b: 2' },
  { name: 'sections_with_schemas',
    input: '~ $P: {n: string}\n~ $Q: {m: int}\n--- $P\n~ a\n--- $Q\n~ 1' },
  { name: 'section_name_needing_quotes', input: '--- one\n~ a: 1\n--- two\n~ b: 2' },
];

// ---------------------------------------------------------------------------------------------

const SUITES: RtSuite[] = [
  {
    file: 'scalars',
    description: 'Round-trip of every scalar form — strings, numbers, precise numerics, temporal, binary',
    header: [
      'Serializer · ROUND-TRIP of SCALARS',
      'Every literal form a document can hold, written back out and read again.',
    ],
    cases: scalars,
  },
  {
    file: 'containers',
    description: 'Round-trip of containers — arrays, objects, nesting, and empties',
    header: [
      'Serializer · ROUND-TRIP of CONTAINERS',
      'An empty container and a nested one are where writers most often change the SHAPE:',
      '`{}` re-serialized as `{*}`, or a nested array printed as {"0": …}.',
    ],
    cases: containers,
  },
  {
    file: 'quoting',
    description: 'Round-trip of values and keys that must be quoted to read back correctly',
    header: [
      'Serializer · ROUND-TRIP and QUOTING',
      'The writer\'s hardest duty: a value whose bare spelling its own reader would read as',
      'something else MUST be quoted. A string of "0" written bare comes back as the number 0,',
      'and nothing errors — the document is simply wrong from then on.',
    ],
    cases: quoting,
  },
  {
    file: 'headers',
    description: 'Round-trip of headers — schemas, modifiers, constraints, refs, variables',
    header: [
      'Serializer · ROUND-TRIP of HEADERS',
      'A header must be rewritten so that it still governs the data the same way. A dropped',
      'constraint or a collapsed reference produces text that parses and validates differently.',
    ],
    cases: headers,
  },
  {
    file: 'documents',
    description: 'Round-trip of whole documents — root shapes, collections, and sections',
    header: [
      'Serializer · ROUND-TRIP of DOCUMENTS',
      'The shapes above the record: what the root is, how records collect, how sections are named.',
    ],
    cases: documents,
  },
];

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  let total = 0;
  const allProblems: string[] = [];

  for (const suite of SUITES) {
    const rows: string[] = [];
    rows.push(...suite.header.map(l => `# ${l}`));
    rows.push('#');
    rows.push('# Each case pins THREE properties at once:');
    rows.push('#   output       the canonical text for this document');
    rows.push('#   re-parse     `output` decodes to the same value as `input` (no data loss)');
    rows.push('#   idempotent   writing `output` again yields `output` (the text does not drift)');
    rows.push('#');
    rows.push('# A runner MUST check all three. Comparing values alone misses a writer that changes');
    rows.push('# the SHAPE of the data, and comparing text alone misses one that changes the value.');
    rows.push('#');
    rows.push('# GENERATED by the reference implementation tools/corpus/suites-roundtrip.ts — edit the case table there.');
    rows.push('# A case MISSING from this file failed one of the three properties and was refused:');
    rows.push('# the generator never records a broken round trip as if it were correct.');
    rows.push('~ version: 1.0');
    rows.push(`~ description: ${ioText(suite.description)}`);
    rows.push('~ $schema: { name: string, input: string, output: string }');
    rows.push('---');

    let lastGroup = '';
    let ok = 0;

    for (const c of suite.cases) {
      if (c.group && c.group !== lastGroup) {
        rows.push('');
        rows.push(`# ── ${c.group} ${'─'.repeat(Math.max(0, 84 - c.group.length))}`);
        lastGroup = c.group;
      }

      const opts = { includeHeader: true, includeTypes: true };
      let output: string;
      try {
        const doc: any = parse(c.input, null);
        const errs = (doc.getErrors?.() ?? []).map((e: any) => e.errorCode);
        if (errs.length) {
          allProblems.push(`${suite.file}/${c.name}: input does not parse — ${errs.join(', ')}`);
          continue;
        }
        output = stringifyDocument(doc, opts);

        // Property 2: the output must decode to the same value.
        const back: any = parse(output, null);
        const backErrs = (back.getErrors?.() ?? []).map((e: any) => e.errorCode);
        if (backErrs.length) {
          allProblems.push(`${suite.file}/${c.name}: OUTPUT DOES NOT REPARSE — ${backErrs.join(', ')}\n    out ${JSON.stringify(output)}`);
          continue;
        }
        const a = JSON.stringify(doc.toJSON());
        const b = JSON.stringify(back.toJSON());
        if (a !== b) {
          allProblems.push(`${suite.file}/${c.name}: VALUE CHANGED\n    in  ${a}\n    out ${b}`);
          continue;
        }

        // Property 3: writing it again must not change it.
        const again = stringifyDocument(back, opts);
        if (again !== output) {
          allProblems.push(`${suite.file}/${c.name}: NOT IDEMPOTENT\n    1st ${JSON.stringify(output)}\n    2nd ${JSON.stringify(again)}`);
          continue;
        }
      } catch (e: any) {
        allProblems.push(`${suite.file}/${c.name}: THREW ${e?.errorCode ?? e?.message}`);
        continue;
      }

      if (c.note) rows.push(`# ${c.note}`);
      if (c.review) rows.push(`# REVIEW: ${c.review}`);
      rows.push(`~ ${c.name}, ${ioText(c.input)}, ${ioText(output)}`);
      ok++;
    }

    writeFileSync(`${OUT_DIR}/${suite.file}.io`, rows.join('\n') + '\n', 'utf8');
    console.log(`${OUT_DIR}/${suite.file}.io: ${ok} cases (of ${suite.cases.length} attempted)`);
    total += ok;
  }

  console.log(`\n${SUITES.length} suites, ${total} cases emitted`);
  if (allProblems.length) {
    console.log(`\n${allProblems.length} case(s) NOT emitted — each is a real round-trip defect:`);
    for (const p of allProblems) console.log(`  ${p}`);
  }
}

main();
