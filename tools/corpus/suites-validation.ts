import { generate, emit, type Case } from './generate-validation';

/**
 * Case tables for the `validation/` corpus suites.
 *
 *   npx tsx tools/corpus/suites-validation.ts
 *
 * The cases here are CHOSEN by hand; their outcomes are OBSERVED by running io-js2 (see
 * generate-validation.ts). Choosing well is the whole job: a boundary is worth a case, a midpoint
 * is not, and every constraint a type declares should have both a satisfying and a violating row so
 * the pair pins the boundary rather than just the failure.
 *
 * Coverage aim per type: acceptance · type mismatch · every declared constraint (satisfied AND
 * violated) · optionality · nullability · the interesting literal forms.
 */

const OUT = '../io-test-cases/validation';

// ---------------------------------------------------------------------------------------------
// Booleans
// ---------------------------------------------------------------------------------------------
const booleans: Case[] = [
  { group: 'acceptance — all four spellings are the same value', name: 'accepts_T', schema: 'b: bool', input: 'T' },
  { name: 'accepts_F', schema: 'b: bool', input: 'F' },
  { name: 'accepts_true', schema: 'b: bool', input: 'true' },
  { name: 'accepts_false', schema: 'b: bool', input: 'false' },

  { group: 'type mismatch', name: 'rejects_number', schema: 'b: bool', input: '1' },
  { name: 'rejects_string', schema: 'b: bool', input: '"yes"' },
  { name: 'rejects_quoted_true', schema: 'b: bool', input: '"true"',
    note: 'a QUOTED true is a string, not the boolean keyword' },
  { name: 'rejects_array', schema: 'b: bool', input: '[T]' },
  { name: 'rejects_object', schema: 'b: bool', input: '{x: T}' },

  { group: 'optional and nullable', name: 'optional_omitted', schema: 'b?: bool', input: '' },
  { name: 'required_omitted', schema: 'b: bool', input: '' },
  { name: 'null_rejected_by_default', schema: 'b: bool', input: 'N' },
  { name: 'null_allowed_when_declared', schema: 'b: {bool, "null": T}', input: 'N' },
  { name: 'optional_and_nullable', schema: 'b?: {bool, "null": T}', input: 'N' },

  { group: 'case sensitivity — the keywords are exact', name: 'rejects_uppercase_TRUE', schema: 'b: bool', input: 'TRUE' },
  { name: 'rejects_titlecase_True', schema: 'b: bool', input: 'True' },
];

// ---------------------------------------------------------------------------------------------
// Date and time
// ---------------------------------------------------------------------------------------------
const datetimes: Case[] = [
  { group: 'acceptance — the three annotated forms', name: 'accepts_datetime', schema: 'd: datetime', input: 'dt"2024-03-20T14:30:00.000Z"' },
  { name: 'accepts_date', schema: 'd: date', input: 'd"2024-03-20"' },
  { name: 'accepts_time', schema: 'd: time', input: 't"14:30:00"' },
  { name: 'accepts_datetime_with_seconds', schema: 'd: datetime', input: 'dt"2024-03-20T14:30:45.000Z"',
    note: 'seconds must survive — a regex group named `sec` read as `second` once dropped them silently' },

  { group: 'type mismatch', name: 'rejects_plain_string', schema: 'd: datetime', input: '"2024-03-20"' },
  { name: 'rejects_number', schema: 'd: datetime', input: '1710945000' },
  { name: 'rejects_bool', schema: 'd: datetime', input: 'T' },
  { name: 'rejects_object', schema: 'd: datetime', input: '{y: 2024}' },

  { group: 'malformed literals', name: 'rejects_malformed_datetime', schema: 'd: datetime', input: 'dt"not-a-date"',
    review: 'ISSUE-23 — the tokenizer raises `invalid-datetime` for this literal, but under a schema the later type check reports `expected-datetime` first and masks it. The root cause is the more useful code.' },
  { name: 'rejects_impossible_month', schema: 'd: datetime', input: 'dt"2024-13-01T00:00:00.000Z"' },
  { name: 'impossible_day_rolls_over', schema: 'd: date', input: 'd"2024-02-31"',
    review: 'ISSUE-22 — an impossible date is SILENTLY rolled over (2024-02-31 becomes 2024-03-02) with no error. Pinned as observed, not endorsed.' },

  { group: 'min / max bounds', name: 'within_bounds', schema: 'd: {datetime, min: dt"2024-01-01T00:00:00.000Z", max: dt"2024-12-31T00:00:00.000Z"}', input: 'dt"2024-06-01T00:00:00.000Z"' },
  { name: 'below_min', schema: 'd: {datetime, min: dt"2024-01-01T00:00:00.000Z"}', input: 'dt"2023-06-01T00:00:00.000Z"' },
  { name: 'above_max', schema: 'd: {datetime, max: dt"2024-12-31T00:00:00.000Z"}', input: 'dt"2025-06-01T00:00:00.000Z"' },

  { group: 'optional and nullable', name: 'optional_omitted', schema: 'd?: datetime', input: '' },
  { name: 'null_rejected_by_default', schema: 'd: datetime', input: 'N' },
  { name: 'null_allowed_when_declared', schema: 'd: {datetime, "null": T}', input: 'N' },
];

// ---------------------------------------------------------------------------------------------
// Decimal
// ---------------------------------------------------------------------------------------------
const decimals: Case[] = [
  { group: 'acceptance — the `m` suffix is what makes it a decimal', name: 'accepts_decimal', schema: 'd: decimal', input: '12.5m' },
  { name: 'accepts_negative', schema: 'd: decimal', input: '-12.5m' },
  { name: 'accepts_integer_decimal', schema: 'd: decimal', input: '42m' },
  { name: 'accepts_zero', schema: 'd: decimal', input: '0m' },
  { name: 'preserves_trailing_zero', schema: 'd: decimal', input: '1.50m',
    note: 'scale is significant for a decimal: 1.50 is not 1.5' },

  { group: 'type mismatch', name: 'rejects_plain_number', schema: 'd: decimal', input: '12.5',
    note: 'a bare number is NOT a decimal — the suffix is the type' },
  { name: 'rejects_string', schema: 'd: decimal', input: '"12.5"' },
  { name: 'rejects_bool', schema: 'd: decimal', input: 'T' },
  { name: 'rejects_object', schema: 'd: decimal', input: '{v: 1}' },
  { name: 'rejects_array', schema: 'd: decimal', input: '[1m]' },

  { group: 'precision and scale', name: 'within_precision_scale', schema: 'd: {decimal, precision: 5, scale: 2}', input: '123.45m' },
  { name: 'scale_violation', schema: 'd: {decimal, precision: 5, scale: 2}', input: '123.456m' },
  { name: 'precision_violation', schema: 'd: {decimal, precision: 4, scale: 2}', input: '12345.67m' },

  { group: 'min / max bounds', name: 'within_bounds', schema: 'd: {decimal, min: 0m, max: 100m}', input: '50m' },
  { name: 'below_min', schema: 'd: {decimal, min: 10m}', input: '5m' },
  { name: 'above_max', schema: 'd: {decimal, max: 10m}', input: '50m' },

  { group: 'multipleOf', name: 'multiple_of_ok', schema: 'd: {decimal, multipleOf: 5m}', input: '15m' },
  { name: 'multiple_of_violation', schema: 'd: {decimal, multipleOf: 5m}', input: '17m' },

  { group: 'optional and nullable', name: 'optional_omitted', schema: 'd?: decimal', input: '' },
  { name: 'null_rejected_by_default', schema: 'd: decimal', input: 'N' },
  { name: 'null_allowed_when_declared', schema: 'd: {decimal, "null": T}', input: 'N' },
];

// ---------------------------------------------------------------------------------------------
// BigInt
// ---------------------------------------------------------------------------------------------
const bigints: Case[] = [
  { group: 'acceptance — the `n` suffix', name: 'accepts_bigint', schema: 'b: bigint', input: '42n' },
  { name: 'accepts_negative', schema: 'b: bigint', input: '-42n' },
  { name: 'accepts_zero', schema: 'b: bigint', input: '0n' },
  { name: 'accepts_beyond_double_precision', schema: 'b: bigint', input: '9007199254740993n',
    note: 'past Number.MAX_SAFE_INTEGER — the point of the type' },
  { name: 'accepts_hex', schema: 'b: bigint', input: '0xffn' },

  { group: 'type mismatch', name: 'rejects_plain_number', schema: 'b: bigint', input: '42' },
  { name: 'rejects_string', schema: 'b: bigint', input: '"42"' },
  { name: 'rejects_decimal', schema: 'b: bigint', input: '42m' },
  { name: 'rejects_bool', schema: 'b: bigint', input: 'T' },
  { name: 'rejects_object', schema: 'b: bigint', input: '{v: 1n}' },

  { group: 'malformed literal', name: 'rejects_fractional_mantissa', schema: 'b: bigint', input: '12.3n' },

  { group: 'min / max bounds', name: 'within_bounds', schema: 'b: {bigint, min: 0n, max: 100n}', input: '50n' },
  { name: 'below_min', schema: 'b: {bigint, min: 10n}', input: '5n' },
  { name: 'above_max', schema: 'b: {bigint, max: 10n}', input: '50n' },

  { group: 'multipleOf', name: 'multiple_of_ok', schema: 'b: {bigint, multipleOf: 5n}', input: '15n' },
  { name: 'multiple_of_violation', schema: 'b: {bigint, multipleOf: 5n}', input: '17n' },
  { name: 'multiple_of_option_must_be_bigint', schema: 'b: {bigint, multipleOf: 5}', input: '15n',
    note: 'the OPTION value is type-checked too: a plain number is not a bigint bound' },

  { group: 'optional and nullable', name: 'optional_omitted', schema: 'b?: bigint', input: '' },
  { name: 'null_rejected_by_default', schema: 'b: bigint', input: 'N' },
  { name: 'null_allowed_when_declared', schema: 'b: {bigint, "null": T}', input: 'N' },
];

// ---------------------------------------------------------------------------------------------
// Type names — unknown vs reserved
// ---------------------------------------------------------------------------------------------
const typeNames: Case[] = [
  { group: 'reserved type names — named by the spec, not usable in this version',
    name: 'reserved_int64', schema: 'n: int64', input: '42' },
  { name: 'reserved_uint64', schema: 'n: uint64', input: '42' },
  { name: 'reserved_float32', schema: 'n: float32', input: '42' },
  { name: 'reserved_float64', schema: 'n: float64', input: '42' },

  { group: 'unknown type names — no such type (a typo)',
    name: 'unknown_type_typo', schema: 'n: strng', input: '"x"' },
  { name: 'unknown_type_nonsense', schema: 'n: nosuchtype', input: '42',
    note: 'must be DISTINGUISHABLE from a reserved name — the fixes differ' },

  { group: 'the registered sized integer types still work',
    name: 'int8_accepted', schema: 'n: int8', input: '42' },
  { name: 'int32_accepted', schema: 'n: int32', input: '42' },
  { name: 'uint8_accepted', schema: 'n: uint8', input: '42' },
];

// ---------------------------------------------------------------------------------------------
// any / null
// ---------------------------------------------------------------------------------------------
const anyNull: Case[] = [
  { group: '`any` accepts every value kind', name: 'any_accepts_string', schema: 'v: any', input: '"x"' },
  { name: 'any_accepts_number', schema: 'v: any', input: '42' },
  { name: 'any_accepts_bool', schema: 'v: any', input: 'T' },
  { name: 'any_accepts_array', schema: 'v: any', input: '[1, 2]' },
  { name: 'any_accepts_object', schema: 'v: any', input: '{a: 1}' },
  { name: 'any_accepts_datetime', schema: 'v: any', input: 'dt"2024-03-20T14:30:00.000Z"' },
  { name: 'any_accepts_decimal', schema: 'v: any', input: '12.5m' },
  { name: 'any_accepts_bigint', schema: 'v: any', input: '42n' },

  { group: 'null is still a declaration, even under `any`',
    name: 'any_rejects_null_by_default', schema: 'v: any', input: 'N' },
  { name: 'any_allows_null_when_declared', schema: 'v: {any, "null": T}', input: 'N' },

  { group: 'the null keyword and its spellings', name: 'null_keyword_N', schema: 'v: {any, "null": T}', input: 'N' },
  { name: 'null_keyword_lowercase', schema: 'v: {any, "null": T}', input: 'null' },
  { name: 'quoted_null_is_a_string', schema: 'v: string', input: '"null"',
    note: 'quoting means "this value, exactly" — a quoted null is the four-character string' },
  { name: 'uppercase_NULL_is_a_string', schema: 'v: {any, "null": T}', input: 'NULL',
    note: 'keywords are case-sensitive, so NULL is an open string rather than the null value' },
];

// ---------------------------------------------------------------------------------------------
// Sized integer boundaries — the arithmetic a port is most likely to get wrong
// ---------------------------------------------------------------------------------------------
const INT_BOUNDS: [string, string, string][] = [
  // type,    lowest legal,   highest legal
  ['int8',    '-128',         '127'],
  ['int16',   '-32768',       '32767'],
  ['int32',   '-2147483648',  '2147483647'],
  ['uint8',   '0',            '255'],
  ['uint16',  '0',            '65535'],
  ['uint32',  '0',            '4294967295'],
];

const intBounds: Case[] = INT_BOUNDS.flatMap(([type, lo, hi]) => ([
  { group: type, name: type + '_min_ok', schema: 'n: ' + type, input: lo },
  { name: type + '_max_ok', schema: 'n: ' + type, input: hi },
  { name: type + '_below_min', schema: 'n: ' + type, input: String(BigInt(lo) - 1n) },
  { name: type + '_above_max', schema: 'n: ' + type, input: String(BigInt(hi) + 1n) },
  { name: type + '_rejects_fraction', schema: 'n: ' + type, input: '1.5' },
] as Case[]));

// ---------------------------------------------------------------------------------------------
// String constraints, in depth
// ---------------------------------------------------------------------------------------------
const stringConstraints: Case[] = [
  { group: 'length boundaries are INCLUSIVE', name: 'minlen_at_boundary', schema: 's: {string, minLen: 3}', input: '"abc"' },
  { name: 'minlen_one_below', schema: 's: {string, minLen: 3}', input: '"ab"' },
  { name: 'maxlen_at_boundary', schema: 's: {string, maxLen: 3}', input: '"abc"' },
  { name: 'maxlen_one_above', schema: 's: {string, maxLen: 3}', input: '"abcd"' },
  { name: 'len_exact_match', schema: 's: {string, len: 3}', input: '"abc"' },
  { name: 'len_one_below', schema: 's: {string, len: 3}', input: '"ab"' },
  { name: 'len_one_above', schema: 's: {string, len: 3}', input: '"abcd"' },
  { name: 'empty_string_against_minlen', schema: 's: {string, minLen: 1}', input: '""' },
  { name: 'empty_string_allowed_by_default', schema: 's: string', input: '""' },

  { group: 'length counts CHARACTERS, not bytes', name: 'accented_char_length', schema: 's: {string, len: 4}', input: '"café"',
    note: 'e-acute is one character and two UTF-8 bytes — a byte-counting port fails here' },
  { name: 'emoji_is_one_code_point', schema: 's: {string, len: 1}', input: '"🙂"',
    note: 'ISSUE-24 RESOLVED: length is measured in CODE POINTS. One emoji is 1, not the 2 UTF-16 units JavaScript counts, nor the 4 UTF-8 bytes' },
  { name: 'emoji_length_2_rejected', schema: 's: {string, len: 2}', input: '"🙂"',
    note: 'the pair pins the unit: if this ACCEPTED, the implementation would be counting UTF-16 units' },
  { name: 'emoji_maxlen_boundary', schema: 's: {string, maxLen: 1}', input: '"🙂"' },
  { name: 'two_emoji_length', schema: 's: {string, len: 2}', input: '"🙂🙂"' },
  { name: 'mixed_bmp_and_astral', schema: 's: {string, len: 4}', input: '"a🙂b🙂"',
    note: 'two ASCII plus two astral characters is 4 code points and 6 UTF-16 units' },

  { group: 'pattern', name: 'pattern_match', schema: 's: {string, pattern: "^[a-z]+$"}', input: '"abc"' },
  { name: 'pattern_no_match', schema: 's: {string, pattern: "^[a-z]+$"}', input: '"ABC"' },
  { name: 'pattern_partial_is_not_enough', schema: 's: {string, pattern: "^[a-z]+$"}', input: '"abc1"' },

  { group: 'choices', name: 'choice_member', schema: 's: {string, choices: [red, green, blue]}', input: 'red' },
  { name: 'choice_non_member', schema: 's: {string, choices: [red, green, blue]}', input: 'yellow' },
  { name: 'choice_is_case_sensitive', schema: 's: {string, choices: [red, green, blue]}', input: 'Red' },

  { group: 'sub-formats', name: 'email_valid', schema: 's: email', input: '"a@b.com"' },
  { name: 'email_invalid', schema: 's: email', input: '"not-an-email"' },
  { name: 'url_valid', schema: 's: url', input: '"https://example.com"' },
  { name: 'url_invalid', schema: 's: url', input: '"not a url"' },
];

// ---------------------------------------------------------------------------------------------
// Arrays, in depth
// ---------------------------------------------------------------------------------------------
const arrayDepth: Case[] = [
  { group: 'element typing', name: 'typed_elements_ok', schema: 'a: [string]', input: '[a, b]' },
  { name: 'typed_element_mismatch', schema: 'a: [string]', input: '[a, 1]' },
  { name: 'untyped_array_accepts_mixed', schema: 'a: array', input: '[a, 1, T]' },
  { name: 'untyped_array_accepts_null_element', schema: 'a: array', input: '[a, N]' },
  { name: 'empty_array_ok', schema: 'a: array', input: '[]' },

  { group: 'size boundaries are INCLUSIVE', name: 'minlen_at_boundary', schema: 'a: {array, minLen: 2}', input: '[1, 2]' },
  { name: 'minlen_one_below', schema: 'a: {array, minLen: 2}', input: '[1]' },
  { name: 'maxlen_at_boundary', schema: 'a: {array, maxLen: 2}', input: '[1, 2]' },
  { name: 'maxlen_one_above', schema: 'a: {array, maxLen: 2}', input: '[1, 2, 3]' },

  { group: 'nesting keeps its shape', name: 'nested_arrays', schema: 'a: array', input: '[[1, 2], [3]]' },
  { name: 'array_of_objects', schema: 'a: array', input: '[{x: 1}, {x: 2}]' },
  { name: 'deeply_nested', schema: 'a: array', input: '[[[1]]]' },

  { group: 'type mismatch', name: 'rejects_scalar', schema: 'a: array', input: '42' },
  { name: 'rejects_object', schema: 'a: array', input: '{x: 1}' },
  { name: 'rejects_string', schema: 'a: array', input: '"[1,2]"' },
];

// ---------------------------------------------------------------------------------------------

const SUITES: [string, string, string[], Case[]][] = [
  ['booleans', 'Boolean validation — the four keyword spellings, type mismatch, optionality',
   ['Validation · BOOL type',
    'Authoritative: outcomes produced by running io-js2 parse() on a composed document',
    '  "~ $schema: { <schema> }\\n---\\n<input>\\n"  ->  doc.toObject()  OR  the surfaced code(s).',
    'GENERATED by tools/corpus/suites-validation.ts — edit the case table there, not this file.'],
   booleans],
  ['datetime', 'Date/time validation — dt/d/t literals, malformed literals, min/max bounds',
   ['Validation · DATETIME / DATE / TIME types',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'NOTE the seconds cases: a capture group named `sec` read as `second` once dropped every',
    'timestamp\'s seconds silently. Boundary cases exist to keep that fixed.',
    'GENERATED by tools/corpus/suites-validation.ts — edit the case table there, not this file.'],
   datetimes],
  ['decimals', 'Decimal validation — the `m` suffix, precision/scale, bounds, multipleOf',
   ['Validation · DECIMAL type',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'A decimal is NOT a number: the `m` suffix is the type, and scale is significant.',
    'GENERATED by tools/corpus/suites-validation.ts — edit the case table there, not this file.'],
   decimals],
  ['bigints', 'BigInt validation — the `n` suffix, precision beyond double, bounds, multipleOf',
   ['Validation · BIGINT type',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'GENERATED by tools/corpus/suites-validation.ts — edit the case table there, not this file.'],
   bigints],
  ['type-names', 'Type names — reserved (spec) vs unknown (typo), and the registered sized types',
   ['Validation · TYPE NAMES',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'A RESERVED name (int64/uint64/float32/float64) is named by the spec but not usable in this',
    'version; an UNKNOWN name does not exist at all. The fixes differ, so the codes differ.',
    'These previously reported the same code, decided by whether a given name happened to be in',
    'the implementation\'s type registry. See io-js2 ADR 0002 §3.',
    'GENERATED by tools/corpus/suites-validation.ts — edit the case table there, not this file.'],
   typeNames],
  ['integer-bounds', 'Sized integer boundaries — lowest legal, highest legal, and one step outside each',
   ['Validation · SIZED INTEGER BOUNDARIES',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'Every sized type is probed at its lowest legal value, its highest legal value, and one step',
    'outside each. That is where an off-by-one is observable and nowhere else, and it is the',
    'arithmetic a port is most likely to get wrong.',
    'GENERATED by tools/corpus/suites-validation.ts — edit the case table there, not this file.'],
   intBounds],
  ['strings-constraints', 'String constraints in depth — length boundaries, pattern, choices, sub-formats',
   ['Validation · STRING CONSTRAINTS (depth)',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'Length cases probe the BOUNDARY and one step past it, in both directions.',
    'LENGTH IS MEASURED IN CODE POINTS. The emoji cases pin that: one emoji is 1, not the 2 UTF-16',
    'units JavaScript counts nor the 4 UTF-8 bytes. Go should use utf8.RuneCountInString, Rust',
    '.chars().count(), Python len(); JavaScript needs an explicit spread, since .length is wrong.',
    'GENERATED by tools/corpus/suites-validation.ts — edit the case table there, not this file.'],
   stringConstraints],
  ['arrays-depth', 'Arrays in depth — element typing, size boundaries, nesting, type mismatch',
   ['Validation · ARRAYS (depth)',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'GENERATED by tools/corpus/suites-validation.ts — edit the case table there, not this file.'],
   arrayDepth],
  ['any-null', 'The `any` type and null handling — every value kind, and null as a declaration',
   ['Validation · ANY type and NULL handling',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'GENERATED by tools/corpus/suites-validation.ts — edit the case table there, not this file.'],
   anyNull],
];

let total = 0;
for (const [file, description, header, cases] of SUITES) {
  const content = generate(file, description, header, cases);
  emit(`${OUT}/${file}.io`, content, cases.length);
  total += cases.length;
}
console.log(`\n${SUITES.length} suites, ${total} cases generated`);
