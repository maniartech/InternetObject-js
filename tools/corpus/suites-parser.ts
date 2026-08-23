import { emit, assertUniqueNames, type Case, type SuiteSpec } from './generate-parse';

/**
 * Case tables for the `parser/` corpus suites.
 *
 *   npx tsx tools/corpus/suites-parser.ts
 *
 * These ADD to the six hand-authored parser suites (arrays, collections, errors, header, objects,
 * sections) rather than replacing them. Where `document/` asks what a whole document projects to,
 * `parser/` asks what a piece of TEXT denotes: which value a literal produces, which key a token
 * becomes, and which code a malformed construct reports.
 *
 * The cases are CHOSEN by hand; their outcomes are OBSERVED by running io-js2.
 */

const OUT = '../io-test-cases/parser';

// ---------------------------------------------------------------------------------------------
// Values — every literal form, as the parser decodes it
// ---------------------------------------------------------------------------------------------
const values: Case[] = [
  { group: 'integers', name: 'plain_integer', input: 'v: 42' },
  { name: 'negative_integer', input: 'v: -42' },
  { name: 'explicit_plus_integer', input: 'v: +42' },
  { name: 'zero', input: 'v: 0' },
  { name: 'negative_zero', input: 'v: -0' },
  { name: 'max_safe_integer', input: 'v: 9007199254740991' },
  { name: 'beyond_max_safe_integer', input: 'v: 9007199254740993',
    note: 'past 2^53 a double cannot hold every integer — this is why bigint exists' },

  { group: 'floats and exponents', name: 'simple_float', input: 'v: 3.14' },
  { name: 'negative_float', input: 'v: -0.5' },
  { name: 'leading_dot_float', input: 'v: .5' },
  { name: 'trailing_dot_float', input: 'v: 5.' },
  { name: 'exponent_positive', input: 'v: 1e10' },
  { name: 'exponent_negative', input: 'v: 1e-10' },
  { name: 'exponent_explicit_plus', input: 'v: 1e+10' },
  { name: 'exponent_capital', input: 'v: 1E10' },
  { name: 'float_with_exponent', input: 'v: 1.5e3' },

  { group: 'radix forms', name: 'hex_lower', input: 'v: 0xff' },
  { name: 'hex_upper', input: 'v: 0xFF' },
  { name: 'hex_prefix_upper', input: 'v: 0XFF' },
  { name: 'octal', input: 'v: 0o17' },
  { name: 'binary', input: 'v: 0b1010' },
  { name: 'hex_negative', input: 'v: -0xFF' },

  { group: 'special numerics', name: 'nan', input: 'v: NaN' },
  { name: 'infinity', input: 'v: Inf' },
  { name: 'negative_infinity', input: 'v: -Inf' },

  { group: 'precise numerics', name: 'bigint', input: 'v: 123n' },
  { name: 'bigint_negative', input: 'v: -123n' },
  { name: 'bigint_large', input: 'v: 9007199254740993n' },
  { name: 'decimal', input: 'v: 1.5m' },
  { name: 'decimal_trailing_zero_kept', input: 'v: 1.50m',
    note: 'scale is significant — 1.50 is not 1.5' },
  { name: 'decimal_integer', input: 'v: 12m' },

  { group: 'booleans and null', name: 'bool_T', input: 'v: T' },
  { name: 'bool_F', input: 'v: F' },
  { name: 'bool_true', input: 'v: true' },
  { name: 'bool_false', input: 'v: false' },
  { name: 'null_N', input: 'v: N' },
  { name: 'null_word', input: 'v: null' },

  { group: 'temporal', name: 'datetime', input: 'v: dt"2024-03-20T14:30:45.000Z"' },
  { name: 'date', input: 'v: d"2024-03-20"' },
  { name: 'time', input: 'v: t"14:30:45.000"' },
  { name: 'datetime_malformed', input: 'v: dt"notadate"' },
  { name: 'date_impossible_month', input: 'v: d"2024-13-01"' },

  { group: 'binary', name: 'binary_literal', input: 'v: b"SGVsbG8="' },
  { name: 'binary_empty', input: 'v: b""' },
  { name: 'binary_invalid', input: 'v: b"!!!"' },

  { group: 'strings', name: 'open_string', input: 'v: hello' },
  { name: 'regular_string', input: 'v: "hello world"' },
  { name: 'single_quoted_string', input: "v: 'hello'" },
  { name: 'raw_string', input: "v: r'a\\nb'" },
  { name: 'string_with_escape', input: 'v: "a\\nb"' },
  { name: 'string_with_unicode_escape', input: 'v: "\\u0041"' },
  { name: 'empty_string', input: 'v: ""' },
];

// ---------------------------------------------------------------------------------------------
// Keys — what may name a member
// ---------------------------------------------------------------------------------------------
const keys: Case[] = [
  { group: 'plain identifiers', name: 'simple_key', input: 'name: 1' },
  { name: 'key_with_underscore', input: 'my_key: 1' },
  { name: 'key_with_digits', input: 'key2: 1' },
  { name: 'key_starting_with_underscore', input: '_key: 1' },
  { name: 'single_letter_key', input: 'a: 1' },
  { name: 'unicode_key', input: 'ключ: 1' },
  { name: 'key_with_hyphen', input: 'my-key: 1' },
  { name: 'key_with_dot', input: 'my.key: 1' },

  { group: 'quoted keys', name: 'quoted_key', input: '"a key": 1' },
  { name: 'quoted_key_with_colon', input: '"a:b": 1' },
  { name: 'quoted_key_with_comma', input: '"a,b": 1' },
  { name: 'quoted_key_empty', input: '"": 1' },
  { name: 'quoted_numeric_key', input: '"10": 1' },
  { name: 'single_quoted_key', input: "'a key': 1" },

  { group: 'keys a parser must reject', name: 'null_as_key', input: 'null: 1' },
  { name: 'N_as_key', input: 'N: 1' },
  { name: 'true_as_key', input: 'true: 1' },
  { name: 'T_as_key', input: 'T: 1' },
  { name: 'false_as_key', input: 'false: 1' },
  { name: 'number_as_key', input: '1: 2',
    note: 'a bare number as a key — accepted or rejected is the rule this row pins' },
  { name: 'array_as_key', input: '[a]: 1' },
  { name: 'object_as_key', input: '{a}: 1' },

  // OPEN-DECISIONS D5, DECIDED 2026-08-23 by Aamir: "throw duplicate member error, period, even
  // when no schema". Until then the schemaless path silently kept the last value, so `a: 1, a: 2`
  // loaded as `{a: 2}` and the first value was gone with no diagnostic — while the SAME document
  // under a schema reported `duplicate-member`. The specification had always stated the rule
  // unconditionally ("a member name appears more than once"); only the schemaless path missed it.
  { group: 'a duplicate member name is an error, schema or no schema (D5)',
    name: 'duplicate_key', input: 'a: 1, a: 2' },
  { name: 'duplicate_key_quoted_and_bare', input: 'a: 1, "a": 2',
    note: 'quoting does not make it a different key' },
  { name: 'duplicate_key_nested', input: 'o: {a: 1, a: 2}' },
  { name: 'duplicate_key_under_schema', input: '~ $schema: {a: int}\n---\n~ a: 1, a: 2',
    note: 'the CONTRAST: with a schema in force, the same duplicate IS reported' },
  { name: 'duplicate_key_under_open_schema', input: '~ $schema: {a: int, *}\n---\n~ a: 1, a: 2' },
  { name: 'duplicate_header_definition', input: '~ x: 1\n~ x: 2\n---\na: 1' },
  { name: 'duplicate_schema_definition', input: '~ $A: {x: int}\n~ $A: {y: int}\n---\na: 1' },
  { name: 'distinct_keys', input: 'a: 1, b: 2', note: 'the control' },
];

// ---------------------------------------------------------------------------------------------
// Malformed documents
// ---------------------------------------------------------------------------------------------
const errors: Case[] = [
  { group: 'unbalanced containers', name: 'unclosed_object', input: 'a: {b: 1' },
  { name: 'unclosed_array', input: 'a: [1, 2' },
  { name: 'unclosed_nested', input: 'a: {b: [1}' },
  { name: 'extra_closing_brace', input: 'a: 1}' },
  { name: 'extra_closing_bracket', input: 'a: 1]' },
  { name: 'mismatched_brace_bracket', input: 'a: {1]' },
  { name: 'mismatched_bracket_brace', input: 'a: [1}' },

  { group: 'missing values', name: 'key_with_no_value', input: 'a:' },
  { name: 'key_with_no_value_among_others', input: 'a: 1, b:' },
  { name: 'colon_with_no_key', input: ': 1' },
  { name: 'lone_colon', input: ':' },

  { group: 'separator problems', name: 'leading_comma', input: '[,1]' },
  { name: 'double_comma_in_array', input: '[1,,2]' },
  { name: 'trailing_comma_in_array', input: '[1,]' },
  { name: 'leading_comma_in_object', input: '{,a: 1}' },
  { name: 'double_comma_in_object', input: '{a: 1,, b: 2}' },
  { name: 'trailing_comma_in_object', input: '{a: 1,}' },

  { group: 'malformed strings', name: 'unterminated_regular_string', input: 'a: "unclosed' },
  { name: 'unterminated_single_quoted', input: "a: 'unclosed" },
  { name: 'unterminated_raw_string', input: "a: r'unclosed" },
  { name: 'unterminated_binary', input: 'a: b"SGVsbG8=' },
  { name: 'bad_unicode_escape', input: 'a: "\\uZZZZ"' },

  { group: 'malformed numerics', name: 'hex_with_bad_digit', input: 'a: 0x12G' },
  { name: 'octal_with_bad_digit', input: 'a: 0o19' },
  { name: 'binary_with_bad_digit', input: 'a: 0b102' },
  { name: 'radix_with_no_digits', input: 'a: 0x' },
  { name: 'fractional_bigint', input: 'a: 1.5n' },

  { group: 'header and section problems', name: 'definition_with_no_key', input: '~ : 1\n---\na: 1' },
  { name: 'duplicate_section_name', input: '--- s\n~ 1\n--- s\n~ 2' },
  { name: 'section_selector_unknown_schema', input: '--- $Nope\n~ 1' },
  { name: 'undefined_variable_reference', input: '---\na: @nope' },
  { name: 'undefined_schema_reference', input: '~ $schema: {a: $Nope}\n---\n~ 1' },
];

// ---------------------------------------------------------------------------------------------

const COMMON = 'GENERATED by io-js2 tools/corpus/suites-parser.ts — edit the case table there.';

const SUITES: SuiteSpec[] = [
  {
    file: 'values',
    description: 'Every literal form and the value the parser decodes it to',
    header: [
      'Parser · VALUES',
      'Authoritative: values produced by running io-js2 parse() then doc.toObject().',
      'One row per literal form. The precise numerics matter most: a decimal keeps its SCALE',
      '(1.50m is not 1.5m) and a bigint keeps every digit past 2^53, so an implementation that',
      'decodes either into a double fails here and nowhere else.',
      COMMON,
    ],
    cases: values,
  },
  {
    file: 'keys',
    description: 'What may name a member — identifiers, quoted keys, rejected keys, duplicates',
    header: [
      'Parser · KEYS',
      'Authoritative: outcomes produced by running io-js2 parse() then doc.toObject().',
      'A bare keyword (null / N / true / T / false / F) is NOT a key: it is a value, and using',
      'one as a key is an error. Quoting makes it a key like any other.',
      COMMON,
    ],
    cases: keys,
  },
  {
    file: 'errors-extended',
    description: 'Malformed documents and the designated codes they report',
    header: [
      'Parser · MALFORMED DOCUMENTS (extended)',
      'Authoritative: codes produced by running io-js2 parse() on each input.',
      'DESIGNATED CODES ONLY. io-js2 THROWS most structural errors rather than accumulating',
      'them, so a runner catches the thrown error and asserts its `.errorCode`; the assertion is',
      'the same either way — the listed code(s) must be what surfaces.',
      COMMON,
    ],
    cases: errors,
  },
];

let total = 0;
for (const spec of SUITES) {
  assertUniqueNames(spec);
  total += emit(`${OUT}/${spec.file}.io`, spec);
}
console.log(`\n${SUITES.length} suites, ${total} cases generated`);
