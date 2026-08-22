import { emitSchemaSuite, assertUniqueSchemaNames, type SchemaCase, type SchemaSuiteSpec } from './generate-schema';

/**
 * Case tables for the `schema/` corpus suites.
 *
 *   npx tsx tools/corpus/suites-schema.ts
 *
 * These files ADD to the four hand-authored suites already in `schema/` (primitives, memberdef,
 * nested, errors) rather than replacing them — those carry prose worth keeping, and they pass.
 * What is added here is the breadth a hand-written file does not sustain: every constraint key on
 * every type that accepts it, every sized numeric name, and the array forms in depth.
 *
 * The cases are CHOSEN by hand; the compiled shapes are OBSERVED. Choosing well is the whole job:
 * a constraint is worth a case when it CHANGES the compiled memberdef, and a type name is worth
 * one when the compiler could plausibly fold it into another.
 */

const OUT = '../io-test-cases/schema';

// ---------------------------------------------------------------------------------------------
// Constraints — the keys a memberdef carries
// ---------------------------------------------------------------------------------------------
const constraints: SchemaCase[] = [
  { group: 'numeric bounds', name: 'int_min', schemaDef: 'n: {int, min: 0}', keys: ['min'] },
  { name: 'int_max', schemaDef: 'n: {int, max: 100}', keys: ['max'] },
  { name: 'int_min_and_max', schemaDef: 'n: {int, min: 0, max: 100}', keys: ['min', 'max'] },
  { name: 'int_negative_bounds', schemaDef: 'n: {int, min: -10, max: -1}', keys: ['min', 'max'] },
  { name: 'number_fractional_bounds', schemaDef: 'n: {number, min: 0.5, max: 1.5}', keys: ['min', 'max'] },
  { name: 'number_multiple_of', schemaDef: 'n: {number, multipleOf: 5}', keys: ['multipleOf'] },
  { name: 'int_multiple_of', schemaDef: 'n: {int, multipleOf: 3}', keys: ['multipleOf'] },
  { name: 'bigint_bounds', schemaDef: 'n: {bigint, min: 0n, max: 100n}', keys: ['min', 'max'] },

  { group: 'decimal precision and scale', name: 'decimal_precision', schemaDef: 'd: {decimal, precision: 10}', keys: ['precision'] },
  { name: 'decimal_scale', schemaDef: 'd: {decimal, scale: 2}', keys: ['scale'] },
  { name: 'decimal_precision_and_scale', schemaDef: 'd: {decimal, precision: 10, scale: 2}', keys: ['precision', 'scale'] },

  { group: 'string length', name: 'string_len', schemaDef: 's: {string, len: 5}', keys: ['len'] },
  { name: 'string_min_len', schemaDef: 's: {string, minLen: 1}', keys: ['minLen'] },
  { name: 'string_max_len', schemaDef: 's: {string, maxLen: 10}', keys: ['maxLen'] },
  { name: 'string_min_and_max_len', schemaDef: 's: {string, minLen: 1, maxLen: 10}', keys: ['minLen', 'maxLen'] },
  { name: 'string_len_zero', schemaDef: 's: {string, len: 0}', keys: ['len'] },

  { group: 'string pattern', name: 'string_pattern', schemaDef: 's: {string, pattern: "^[a-z]+$"}', keys: ['pattern'] },
  { name: 'string_pattern_with_digits', schemaDef: 's: {string, pattern: "^[0-9]{3}$"}', keys: ['pattern'] },
  { name: 'string_pattern_anchored_alternation', schemaDef: 's: {string, pattern: "^(a|b)$"}', keys: ['pattern'] },

  { group: 'choices', name: 'string_choices', schemaDef: 'c: {string, choices: [red, green, blue]}', keys: ['choices'] },
  { name: 'int_choices', schemaDef: 'c: {int, choices: [1, 2, 3]}', keys: ['choices'] },
  { name: 'bool_choices', schemaDef: 'c: {bool, choices: [T]}', keys: ['choices'] },
  { name: 'single_choice', schemaDef: 'c: {string, choices: [only]}', keys: ['choices'] },

  { group: 'defaults', name: 'string_default', schemaDef: 's?: {string, default: hello}', keys: ['default'] },
  { name: 'int_default', schemaDef: 'n?: {int, default: 0}', keys: ['default'] },
  { name: 'bool_default', schemaDef: 'b?: {bool, default: T}', keys: ['default'] },
  { name: 'null_default', schemaDef: 'x?: {string, "null": T, default: N}', keys: ['default'] },
  { name: 'array_default', schemaDef: 'a?: {array, of: int, default: []}', keys: ['default'] },

  { group: 'constraints combine', name: 'string_all_constraints',
    schemaDef: 's?: {string, minLen: 1, maxLen: 10, pattern: "^[a-z]+$", default: abc}',
    keys: ['minLen', 'maxLen', 'pattern', 'default'] },
  { name: 'int_all_constraints', schemaDef: 'n: {int, min: 0, max: 10, multipleOf: 2}',
    keys: ['min', 'max', 'multipleOf'] },
  { name: 'constraints_on_two_members', schemaDef: 'a: {int, min: 0}, b: {string, maxLen: 3}',
    keys: ['min', 'maxLen'] },

  { group: 'constraints that do not apply to the type', name: 'minlen_on_int', schemaDef: 'n: {int, minLen: 2}', keys: ['minLen'] },
  { name: 'pattern_on_int', schemaDef: 'n: {int, pattern: "^1$"}', keys: ['pattern'] },
  { name: 'min_on_string', schemaDef: 's: {string, min: 1}', keys: ['min'] },
];

// ---------------------------------------------------------------------------------------------
// Sized numeric type names
// ---------------------------------------------------------------------------------------------
const sizedTypes: SchemaCase[] = [
  { group: 'signed integers compile to their own name', name: 'int8_member', schemaDef: 'n: int8' },
  { name: 'int16_member', schemaDef: 'n: int16' },
  { name: 'int32_member', schemaDef: 'n: int32' },
  { name: 'int64_member', schemaDef: 'n: int64',
    note: 'io-js2 does not support int64 at compile time — the row records what it reports' },

  { group: 'unsigned integers', name: 'uint_member', schemaDef: 'n: uint' },
  { name: 'uint8_member', schemaDef: 'n: uint8' },
  { name: 'uint16_member', schemaDef: 'n: uint16' },
  { name: 'uint32_member', schemaDef: 'n: uint32' },
  { name: 'uint64_member', schemaDef: 'n: uint64' },

  { group: 'floats', name: 'float_member', schemaDef: 'n: float' },
  { name: 'float32_member', schemaDef: 'n: float32' },
  { name: 'float64_member', schemaDef: 'n: float64' },

  { group: 'the sized names are distinct, not aliases', name: 'mixed_sized_members',
    schemaDef: 'a: int8, b: int16, c: int32, d: uint8',
    note: 'each compiles to its own `type` verbatim — a port must not fold them into `int`' },
  { name: 'sized_with_bounds', schemaDef: 'n: {int8, min: 0, max: 127}', keys: ['min', 'max'] },

  { group: 'string family names', name: 'email_member', schemaDef: 's: email' },
  { name: 'url_member', schemaDef: 's: url' },
  { name: 'email_with_constraints', schemaDef: 's: {email, maxLen: 50}', keys: ['maxLen'] },

  { group: 'temporal family names', name: 'datetime_member', schemaDef: 'd: datetime' },
  { name: 'date_member', schemaDef: 'd: date' },
  { name: 'time_member', schemaDef: 'd: time' },

  { group: 'structural names', name: 'any_member', schemaDef: 'x: any' },
  { name: 'object_member_bare', schemaDef: 'x: object' },
  { name: 'array_member_bare', schemaDef: 'x: array' },
];

// ---------------------------------------------------------------------------------------------
// Arrays in depth
// ---------------------------------------------------------------------------------------------
const arrays: SchemaCase[] = [
  { group: 'the bracket form', name: 'array_of_string', schemaDef: 'a: [string]' },
  { name: 'array_of_int', schemaDef: 'a: [int]' },
  { name: 'array_of_bool', schemaDef: 'a: [bool]' },
  { name: 'array_empty_brackets', schemaDef: 'a: []',
    note: 'no element type declared — the element is `any`' },
  { name: 'array_of_arrays', schemaDef: 'a: [[int]]' },
  { name: 'array_three_deep', schemaDef: 'a: [[[int]]]' },
  { name: 'array_of_object_body', schemaDef: 'a: [{id: int, name: string}]' },
  { name: 'array_of_object_body_nested', schemaDef: 'a: [{inner: {x: int}}]' },

  { group: 'the object form', name: 'array_object_form', schemaDef: 'a: {array, of: string}' },
  { name: 'array_object_form_with_len', schemaDef: 'a: {array, of: string, len: 3}', keys: ['len'] },
  { name: 'array_object_form_min_len', schemaDef: 'a: {array, of: int, minLen: 1}', keys: ['minLen'] },
  { name: 'array_object_form_max_len', schemaDef: 'a: {array, of: int, maxLen: 5}', keys: ['maxLen'] },
  { name: 'array_object_form_bounds', schemaDef: 'a: {array, of: int, minLen: 1, maxLen: 5}',
    keys: ['minLen', 'maxLen'] },
  { name: 'array_object_form_of_object', schemaDef: 'a: {array, of: {id: int}}' },

  { group: 'arrays beside other members', name: 'array_and_scalar_members',
    schemaDef: 'name: string, tags: [string], count: int' },
  { name: 'two_arrays', schemaDef: 'a: [int], b: [string]' },
  { name: 'optional_array', schemaDef: 'a?: [int]' },
  { name: 'nullable_array', schemaDef: 'a*: [int]' },
  { name: 'array_inside_nested_object', schemaDef: 'o: {tags: [string]}',
    note: 'the element path is dotted from the parent, like any nested member' },

  { group: 'arrays of references', name: 'array_of_typed_members',
    schemaDef: 'a: [{x: int, y: int}]' },
  { name: 'array_of_constrained_strings', schemaDef: 'a: [{string, maxLen: 3}]', keys: ['maxLen'] },
];

// ---------------------------------------------------------------------------------------------
// Malformed definitions
// ---------------------------------------------------------------------------------------------
const errors: SchemaCase[] = [
  { group: 'a member needs a type', name: 'member_with_no_type', schemaDef: 'name:' },
  { name: 'member_with_no_type_after_others', schemaDef: 'a: int, b:' },
  { name: 'optional_member_with_no_type', schemaDef: 'name?:' },

  { group: 'a type must be registered', name: 'unknown_type', schemaDef: 'n: nosuchtype' },
  { name: 'unknown_type_in_object_form', schemaDef: 'n: {nosuchtype}' },
  { name: 'unknown_type_capitalized', schemaDef: 'n: String',
    note: 'type names are lower-case; `String` is not `string`' },
  { name: 'unknown_type_boolean_spelled_out', schemaDef: 'b: boolean',
    note: 'the registered name is `bool`' },
  { name: 'unknown_type_in_array', schemaDef: 'a: [nosuchtype]' },

  { group: 'the additional-property marker', name: 'star_not_last', schemaDef: '*, name: string' },
  { name: 'star_in_the_middle', schemaDef: 'a: int, *, b: string' },
  { name: 'two_stars', schemaDef: 'a: int, *, *' },

  { group: 'structural malformations', name: 'unclosed_object_body', schemaDef: 'a: {x: int' },
  { name: 'unclosed_array', schemaDef: 'a: [int' },
  { name: 'stray_closing_brace', schemaDef: 'a: int}' },
  { name: 'empty_definition', schemaDef: ',' },
  { name: 'duplicate_member_name', schemaDef: 'a: int, a: string' },

  { group: 'a key must be a name', name: 'array_as_key', schemaDef: '[string]' },
  { name: 'number_as_key', schemaDef: '42' },
  { name: 'boolean_as_key', schemaDef: 'true' },
  { name: 'literal_in_object_body', schemaDef: 'a: {1}' },
];

// ---------------------------------------------------------------------------------------------

const SUITES: SchemaSuiteSpec[] = [
  {
    file: 'constraints',
    description: 'Constraint keys the compiler carries onto a memberdef, per type',
    header: [
      'Schema · CONSTRAINT KEYS',
      'Authoritative: compiled shapes produced by running io-js2\'s parseSchema().',
      'The compiler CARRIES constraints; it does not enforce them (that is validation/).',
      'A constraint declared for a type that has no use for it is recorded as observed —',
      'whether it is carried or rejected is exactly the sort of thing a port must match.',
    ],
    cases: constraints,
  },
  {
    file: 'sized-types',
    description: 'Every registered type name compiles verbatim — sized numerics, string and temporal families',
    header: [
      'Schema · TYPE NAMES',
      'Authoritative: compiled shapes produced by running io-js2\'s parseSchema().',
      'A sized name compiles to a memberdef with that `type` VERBATIM. A port that folds',
      '`int8` into `int` at compile time loses the bound and passes validation it should fail.',
      '',
      'The 64-bit names are RESERVED, not usable: `int64` reports `reserved-type` at COMPILE,',
      'while `uint64`/`float64` compile here and report `reserved-type` at VALIDATION instead.',
      'Same code, different stage — a port may reject at either (FINDINGS #21).',
    ],
    cases: sizedTypes,
  },
  {
    file: 'arrays',
    description: 'Array member definitions — bracket form, object form, nesting, and element paths',
    header: [
      'Schema · ARRAYS',
      'Authoritative: compiled shapes produced by running io-js2\'s parseSchema().',
      'An array\'s element definition lives under `of`. Both spellings — `[string]` and',
      '`{array, of: string}` — must compile to the same shape.',
    ],
    cases: arrays,
  },
  {
    file: 'errors-extended',
    description: 'Malformed schema definitions and the designated codes they produce',
    header: [
      'Schema · MALFORMED DEFINITIONS (extended)',
      'Authoritative: codes produced by running io-js2\'s parseSchema().',
      'Compilation fails fast, so each row lists exactly one code. An UNCODED error is flagged',
      'REVIEW rather than recorded: a port cannot assert on a bare message.',
    ],
    cases: errors,
  },
];

let total = 0;
for (const spec of SUITES) {
  assertUniqueSchemaNames(spec);
  total += emitSchemaSuite(`${OUT}/${spec.file}.io`, spec);
}
console.log(`\n${SUITES.length} suites, ${total} cases generated`);
