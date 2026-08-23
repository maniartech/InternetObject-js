import { generate, emit, type Case } from './generate-validation';

/**
 * Case tables for the `validation/` corpus suites — part two.
 *
 *   npx tsx tools/corpus/suites-validation-2.ts
 *
 * A separate file from `suites-validation.ts` purely so neither grows past the size at which a case
 * table stops being readable. These cover the areas the first file does not: the optionality
 * matrix, defaults, choices, the sub-formats (`email`/`url`), how a nested failure names its path,
 * how a closed schema reacts to a surplus member, and what happens when several members fail at
 * once.
 *
 * The cases are CHOSEN by hand; their outcomes are OBSERVED by running io-js2. Coverage aim: every
 * rule gets a SATISFYING and a VIOLATING row, so the pair pins the boundary rather than just the
 * failure — a suite of failures alone cannot tell a correct implementation from one that rejects
 * everything.
 */

const OUT = '../io-test-cases/validation';

// ---------------------------------------------------------------------------------------------
// Optionality — the four-way matrix of optional × nullable, present × absent × null
// ---------------------------------------------------------------------------------------------
const optionality: Case[] = [
  // ABSENCE is expressed by a record that EXISTS and lacks the member — `~` is the empty record.
  // An empty INPUT is an empty document: there is no record, so the schema is never applied and
  // the result is null whatever the modifiers say. Rows written that way assert nothing, which is
  // how this table read on its first draft.
  { group: 'required, not nullable — the default', name: 'required_present', schema: 'a: int', input: '1' },
  { name: 'required_absent', schema: 'a: int', input: '~' },
  { name: 'required_absent_of_two', schema: 'a: int, b: int', input: '~ b: 2' },
  { name: 'required_null', schema: 'a: int', input: 'N' },
  { name: 'no_record_at_all', schema: 'a: int', input: '',
    note: 'the CONTROL: an empty document has no record, so the schema never applies' },

  { group: 'optional (?), not nullable', name: 'optional_present', schema: 'a?: int', input: '1' },
  { name: 'optional_absent', schema: 'a?: int', input: '~' },
  { name: 'optional_absent_of_two', schema: 'a: int, b?: int', input: '~ 1' },
  { name: 'optional_null', schema: 'a?: int', input: 'N',
    note: 'optional governs ABSENCE, not null — an explicit null is still a value' },

  { group: 'nullable (*), required', name: 'nullable_present', schema: 'a*: int', input: '1' },
  { name: 'nullable_absent', schema: 'a*: int', input: '~' },
  { name: 'nullable_null', schema: 'a*: int', input: 'N' },

  { group: 'optional AND nullable', name: 'optional_nullable_present', schema: 'a?*: int', input: '1' },
  { name: 'optional_nullable_absent', schema: 'a?*: int', input: '~' },
  { name: 'optional_nullable_null', schema: 'a?*: int', input: 'N' },
  { name: 'nullable_optional_order_swapped', schema: 'a*?: int', input: 'N',
    note: 'the two modifiers commute — `?*` and `*?` mean the same thing' },

  { group: 'the object form of nullability', name: 'object_form_nullable', schema: 'a: {int, "null": T}', input: 'N' },
  { name: 'object_form_not_nullable', schema: 'a: {int, "null": F}', input: 'N' },
  { name: 'object_form_nullable_with_value', schema: 'a: {int, "null": T}', input: '5' },

  { group: 'optionality among several members', name: 'trailing_optional_omitted',
    schema: 'a: int, b?: int', input: '~ 1' },
  { name: 'middle_optional_omitted_positionally', schema: 'a: int, b?: int, c: int', input: '~ 1, 2',
    note: 'positional records fill left to right, so omitting a MIDDLE optional shifts the rest' },
  { name: 'middle_optional_supplied_by_name', schema: 'a: int, b?: int, c: int', input: '~ a: 1, c: 3' },
  { name: 'all_optional_all_omitted', schema: 'a?: int, b?: int', input: '~' },
  { name: 'all_optional_first_supplied', schema: 'a?: int, b?: int', input: '~ 1' },

  { group: 'optionality per type', name: 'optional_string_omitted', schema: 'a?: string', input: '~' },
  { name: 'optional_bool_omitted', schema: 'a?: bool', input: '~' },
  { name: 'optional_array_omitted', schema: 'a?: [int]', input: '~' },
  { name: 'optional_object_omitted', schema: 'a?: {x: int}', input: '~' },
  { name: 'optional_nested_object_present', schema: 'a?: {x: int}', input: '~ a: {x: 5}' },
];

// ---------------------------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------------------------
const defaults: Case[] = [
  { group: 'a default fills an omitted optional member', name: 'default_applied_when_absent',
    schema: 'a?: {int, default: 7}', input: '~' },
  { name: 'default_not_applied_when_present', schema: 'a?: {int, default: 7}', input: '~ 1' },
  { name: 'default_string', schema: 'a?: {string, default: hello}', input: '~' },
  { name: 'default_bool_true', schema: 'a?: {bool, default: T}', input: '~' },
  { name: 'default_bool_false', schema: 'a?: {bool, default: F}', input: '~' },
  { name: 'default_zero', schema: 'a?: {int, default: 0}', input: '~',
    note: 'zero is a value, not an absence — it must survive as 0' },
  { name: 'default_empty_string', schema: 'a?: {string, default: ""}', input: '~' },
  { name: 'default_null', schema: 'a?: {string, "null": T, default: N}', input: '~' },
  { name: 'default_decimal', schema: 'a?: {decimal, default: 1.50m}', input: '~' },
  { name: 'default_bigint', schema: 'a?: {bigint, default: 9n}', input: '~' },

  { group: 'a default on a REQUIRED member', name: 'default_on_required_absent',
    schema: 'a: {int, default: 7}', input: '~',
    note: 'required means the member must be supplied — whether a default excuses that is the rule this row pins' },
  { name: 'default_on_required_present', schema: 'a: {int, default: 7}', input: '~ 1' },

  { group: 'a default that violates its own constraints', name: 'default_below_min',
    schema: 'a?: {int, min: 10, default: 1}', input: '~' },
  { name: 'default_too_long', schema: 'a?: {string, maxLen: 2, default: toolong}', input: '~' },
  { name: 'default_not_a_choice', schema: 'a?: {string, choices: [x], default: y}', input: '~' },
  { name: 'default_wrong_type', schema: 'a?: {int, default: notanumber}', input: '~' },

  { group: 'defaults among several members', name: 'two_defaults_both_applied',
    schema: 'a?: {int, default: 1}, b?: {int, default: 2}', input: '~' },
  { name: 'two_defaults_one_supplied', schema: 'a?: {int, default: 1}, b?: {int, default: 2}', input: '~ 9' },
  { name: 'default_after_required', schema: 'a: int, b?: {int, default: 2}', input: '~ 1' },
  { name: 'default_in_nested_object', schema: 'o: {x?: {int, default: 3}}', input: '~ o: {}' },
];

// ---------------------------------------------------------------------------------------------
// Choices
// ---------------------------------------------------------------------------------------------
const choices: Case[] = [
  { group: 'string choices', name: 'choice_first', schema: 'c: {string, choices: [red, green, blue]}', input: 'red' },
  { name: 'choice_middle', schema: 'c: {string, choices: [red, green, blue]}', input: 'green' },
  { name: 'choice_last', schema: 'c: {string, choices: [red, green, blue]}', input: 'blue' },
  { name: 'choice_not_listed', schema: 'c: {string, choices: [red, green, blue]}', input: 'yellow' },
  { name: 'choice_wrong_case', schema: 'c: {string, choices: [red]}', input: 'Red',
    note: 'choices are compared exactly — case included' },
  { name: 'choice_empty_string_listed', schema: 'c: {string, choices: [""]}', input: '""' },
  { name: 'choice_quoted_matches_bare', schema: 'c: {string, choices: [red]}', input: '"red"',
    note: 'quoting is a spelling of the same string, so it must satisfy the same choice' },
  { name: 'choice_single_option', schema: 'c: {string, choices: [only]}', input: 'only' },
  { name: 'choice_single_option_violated', schema: 'c: {string, choices: [only]}', input: 'other' },

  { group: 'numeric choices', name: 'int_choice_listed', schema: 'c: {int, choices: [1, 2, 3]}', input: '2' },
  { name: 'int_choice_not_listed', schema: 'c: {int, choices: [1, 2, 3]}', input: '4' },
  { name: 'int_choice_zero', schema: 'c: {int, choices: [0, 1]}', input: '0' },
  { name: 'int_choice_negative', schema: 'c: {int, choices: [-1, 1]}', input: '-1' },
  { name: 'number_choice_fractional', schema: 'c: {number, choices: [0.5, 1.5]}', input: '1.5' },

  // `choices` is NOT a key a bool memberdef accepts — the compiler reports `unknown-member`, so
  // these rows pin that rather than any choice behaviour. Kept because "which types accept which
  // constraint keys" is exactly what a port needs told, and a bool with two possible values has
  // little use for a choices list anyway.
  { group: 'bool does not accept a choices list at all',
    name: 'bool_choice_true_only', schema: 'c: {bool, choices: [T]}', input: 'T' },
  { name: 'bool_choice_true_only_violated', schema: 'c: {bool, choices: [T]}', input: 'F' },

  { group: 'choices with the other modifiers', name: 'choice_optional_omitted',
    schema: 'c?: {string, choices: [red]}', input: '~' },
  { name: 'choice_nullable_null', schema: 'c: {string, "null": T, choices: [red]}', input: 'N' },
  { name: 'choice_with_default_applied', schema: 'c?: {string, choices: [red, green], default: red}', input: '~' },
  { name: 'choice_in_array_element', schema: 'a: [{string, choices: [x, y]}]', input: '~ a: [x, y]' },
  { name: 'choice_in_array_element_violated', schema: 'a: [{string, choices: [x, y]}]', input: '~ a: [x, z]' },
];

// ---------------------------------------------------------------------------------------------
// Sub-formats: email and url
// ---------------------------------------------------------------------------------------------
const subFormats: Case[] = [
  { group: 'email — accepted', name: 'email_simple', schema: 'e: email', input: 'a@b.com' },
  { name: 'email_with_dots', schema: 'e: email', input: 'first.last@example.com' },
  { name: 'email_with_plus', schema: 'e: email', input: '"user+tag@example.com"' },
  { name: 'email_subdomain', schema: 'e: email', input: 'a@mail.example.com' },
  { name: 'email_long_tld', schema: 'e: email', input: 'a@example.museum' },

  { group: 'email — rejected', name: 'email_no_at', schema: 'e: email', input: 'notanemail' },
  { name: 'email_no_domain', schema: 'e: email', input: '"a@"' },
  { name: 'email_no_local_part', schema: 'e: email', input: '"@b.com"' },
  { name: 'email_two_at_signs', schema: 'e: email', input: '"a@b@c.com"' },
  { name: 'email_with_space', schema: 'e: email', input: '"a b@c.com"' },
  { name: 'email_empty', schema: 'e: email', input: '""' },
  { name: 'email_given_a_number', schema: 'e: email', input: '42' },

  { group: 'url — accepted', name: 'url_https', schema: 'u: url', input: '"https://example.com"' },
  { name: 'url_http', schema: 'u: url', input: '"http://example.com"' },
  { name: 'url_with_path', schema: 'u: url', input: '"https://example.com/a/b"' },
  { name: 'url_with_query', schema: 'u: url', input: '"https://example.com?a=1"' },
  { name: 'url_with_port', schema: 'u: url', input: '"https://example.com:8443"' },

  { group: 'url — rejected', name: 'url_no_scheme', schema: 'u: url', input: '"example.com"' },
  { name: 'url_plain_word', schema: 'u: url', input: 'notaurl' },
  { name: 'url_empty', schema: 'u: url', input: '""' },
  { name: 'url_given_a_number', schema: 'u: url', input: '42' },

  { group: 'sub-formats keep the string constraints', name: 'email_with_max_len',
    schema: 'e: {email, maxLen: 50}', input: 'a@b.com' },
  { name: 'email_exceeding_max_len', schema: 'e: {email, maxLen: 5}', input: 'a@b.com' },
  { name: 'email_optional_omitted', schema: 'e?: email', input: '~' },
  { name: 'url_nullable_null', schema: 'u*: url', input: 'N' },
];

// ---------------------------------------------------------------------------------------------
// Union types — `anyOf` on the `any` type
// ---------------------------------------------------------------------------------------------
const unions: Case[] = [
  { group: 'a value matching ANY listed alternative is accepted',
    name: 'anyOf_first_alternative', schema: 'id: {any, anyOf: [string, int]}', input: 'abc' },
  { name: 'anyOf_second_alternative', schema: 'id: {any, anyOf: [string, int]}', input: '42' },
  { name: 'anyOf_bool_alternative', schema: 'f: {any, anyOf: [bool, int]}', input: 'T' },
  { name: 'anyOf_int_alternative', schema: 'f: {any, anyOf: [bool, int]}', input: '1' },
  { name: 'anyOf_single_alternative', schema: 'v: {any, anyOf: [int]}', input: '1' },
  { name: 'anyOf_three_alternatives', schema: 'v: {any, anyOf: [bool, int, string]}', input: 'x' },

  { group: 'a value matching NONE is rejected', name: 'anyOf_matches_nothing',
    schema: 'f: {any, anyOf: [bool, int]}', input: 'hello' },
  { name: 'anyOf_single_alternative_violated', schema: 'v: {any, anyOf: [int]}', input: 'x' },
  { name: 'anyOf_wrong_container', schema: 'v: {any, anyOf: [int, string]}', input: '[1]' },

  { group: 'an alternative may be a full memberdef, not just a type name',
    name: 'anyOf_constrained_first', schema: 'v: {any, anyOf: [{int, multipleOf: 5}, {int, multipleOf: 3}]}', input: '10',
    note: 'a multiple of 5' },
  { name: 'anyOf_constrained_second', schema: 'v: {any, anyOf: [{int, multipleOf: 5}, {int, multipleOf: 3}]}', input: '9',
    note: 'a multiple of 3' },
  { name: 'anyOf_constrained_neither', schema: 'v: {any, anyOf: [{int, multipleOf: 5}, {int, multipleOf: 3}]}', input: '7' },
  { name: 'anyOf_constrained_both', schema: 'v: {any, anyOf: [{int, multipleOf: 5}, {int, multipleOf: 3}]}', input: '15',
    note: 'a multiple of both — matching more than one alternative is still a match' },
  { name: 'anyOf_length_constrained', schema: 'v: {any, anyOf: [{string, maxLen: 2}, int]}', input: 'ab' },
  { name: 'anyOf_length_constrained_violated', schema: 'v: {any, anyOf: [{string, maxLen: 2}, int]}', input: 'abcd' },

  { group: 'anyOf beside the other modifiers', name: 'anyOf_null_rejected_by_default',
    schema: 'v: {any, anyOf: [int]}', input: 'N' },
  { name: 'anyOf_null_allowed_when_declared', schema: 'v: {any, "null": T, anyOf: [int]}', input: 'N' },
  { name: 'anyOf_optional_omitted', schema: 'v?: {any, anyOf: [int]}', input: '~' },
  { name: 'anyOf_optional_supplied', schema: 'v?: {any, anyOf: [int]}', input: '~ 1' },
  { name: 'anyOf_two_members', schema: 'a: {any, anyOf: [int]}, b: {any, anyOf: [string]}', input: '~ 1, x' },
  { name: 'anyOf_inside_an_array', schema: 'a: [{any, anyOf: [int, bool]}]', input: '~ a: [1, T]' },
  { name: 'anyOf_inside_an_array_violated', schema: 'a: [{any, anyOf: [int, bool]}]', input: '~ a: [1, x]' },
];

// ---------------------------------------------------------------------------------------------
// Binary values, and the schema type that does not exist yet
// ---------------------------------------------------------------------------------------------
const binary: Case[] = [
  { group: 'a binary VALUE works wherever a value is accepted',
    name: 'binary_under_any', schema: 'b: any', input: 'b"SGVsbG8="' },
  { name: 'binary_empty_under_any', schema: 'b: any', input: 'b""' },
  { name: 'binary_single_quoted', schema: 'b: any', input: "b'SGVsbG8='" },
  { name: 'binary_in_an_array', schema: 'b: [any]', input: '~ b: [b"SGVsbG8="]' },
  { name: 'binary_in_a_nested_object', schema: 'o: {b: any}', input: '~ o: {b"SGVsbG8="}' },
  { name: 'binary_optional_omitted', schema: 'b?: any', input: '~' },
  { name: 'binary_beside_other_members', schema: 'n: string, b: any', input: '~ x, b"SGVsbG8="' },

  { group: 'malformed base64', name: 'binary_invalid_base64', schema: 'b: any', input: 'b"!!!"' },
  { name: 'binary_bad_padding', schema: 'b: any', input: 'b"SGVsbG8"' },
  { name: 'binary_unterminated', schema: 'b: any', input: 'b"SGVsbG8=' },

  // `binary` is NOT a registered schema type. ADR 0002 §5 withheld `expected-binary` for exactly
  // this reason: no site could emit it. These rows pin the CURRENT state — the value form is
  // fully supported, the schema type is not — so a port knows precisely where the line is, and
  // so the day the type is registered these rows change and say so.
  { group: 'the `binary` TYPE NAME is not registered (spec describes it; io-js2 has no BinaryDef)',
    name: 'binary_as_schema_type', schema: 'b: binary', input: 'b"SGVsbG8="' },
  // `b: {binary}` is deliberately NOT here. What it demonstrates is a COMPILATION fact — an
  // unregistered name inside braces becomes a nested object body — so it belongs in the schema
  // suite, and schema/errors-extended.io pins it as `binary_in_object_form`. Validating against
  // that nonsense schema makes the two validation entry points name the fault differently
  // (`invalid-object` vs `missing-value`), which is a limit of the X1 bridge rather than anything
  // a port needs to reproduce.
  { name: 'binary_as_array_element_type', schema: 'b: [binary]', input: '~ b: [b"SGVsbG8="]' },
];

// ---------------------------------------------------------------------------------------------
// Collection rules
// ---------------------------------------------------------------------------------------------
const collections: Case[] = [
  { group: 'records without a schema may each have a different shape',
    name: 'ragged_records_schemaless', schema: 'x?: any, y?: any, z?: any',
    input: '~ a, 20, f\n~ T, F\n~ m, 123' },
  { name: 'one_record_under_schema', schema: 'n: string, a: int', input: '~ John, 20' },
  { name: 'two_records_same_shape', schema: 'n: string, a: int', input: '~ John, 20\n~ Jane, 25' },
  { name: 'second_record_wrong_shape', schema: 'n: string, a: int', input: '~ John, 20\n~ Jane' },
  { name: 'second_record_wrong_type', schema: 'n: string, a: int', input: '~ John, 20\n~ Jane, x' },

  // The spec is explicit here: `~` alone is an EMPTY OBJECT, valid only if every member is
  // optional and/or nullable. The pair of rows is the point — one schema accepts it, one does not.
  { group: 'an empty record `~` is {} — valid only when every member may be absent',
    name: 'empty_record_all_optional', schema: 'name?*: string, age?*: {int, max: 25}', input: '~' },
  { name: 'empty_record_one_required', schema: 'name: string, age?*: {int, max: 25}', input: '~' },
  { name: 'empty_record_all_optional_not_nullable', schema: 'name?: string, age?: int', input: '~' },
  { name: 'empty_record_all_nullable_not_optional', schema: 'name*: string, age*: int', input: '~',
    note: 'nullable is not optional — the members are still required to be PRESENT' },
  { name: 'empty_record_no_schema', schema: 'x?: any', input: '~' },
  { name: 'empty_record_among_full_ones', schema: 'name?*: string', input: '~ John\n~\n~ Jane' },

  { group: 'positional records map to indices when the schema is permissive',
    name: 'positional_three_values', schema: 'a?: any, b?: any, c?: any', input: '~ John, 20, f' },
  { name: 'positional_fewer_than_declared', schema: 'a?: any, b?: any, c?: any', input: '~ John' },
  { name: 'positional_more_than_declared', schema: 'a?: any', input: '~ John, 20' },
  { name: 'positional_mixed_types', schema: 'a?: any, b?: any, c?: any', input: '~ m, 123, {x, y}' },

  { group: 'every record is validated, not just the first',
    name: 'third_record_fails', schema: 'a: int', input: '~ 1\n~ 2\n~ x' },
  { name: 'all_three_fail', schema: 'a: int', input: '~ x\n~ y\n~ z' },
  { name: 'first_and_last_fail', schema: 'a: int', input: '~ x\n~ 2\n~ z' },
];

// ---------------------------------------------------------------------------------------------
// Temporal boundaries
// ---------------------------------------------------------------------------------------------
const temporalDepth: Case[] = [
  { group: 'month lengths', name: 'jan_31', schema: 'd: date', input: 'd"2024-01-31"' },
  { name: 'jan_32', schema: 'd: date', input: 'd"2024-01-32"' },
  { name: 'apr_30', schema: 'd: date', input: 'd"2024-04-30"' },
  { name: 'apr_31', schema: 'd: date', input: 'd"2024-04-31"', note: 'April has 30 days' },
  { name: 'month_00', schema: 'd: date', input: 'd"2024-00-15"' },
  { name: 'month_12', schema: 'd: date', input: 'd"2024-12-15"' },
  { name: 'month_13', schema: 'd: date', input: 'd"2024-13-15"' },
  { name: 'day_00', schema: 'd: date', input: 'd"2024-01-00"' },

  { group: 'leap years — the rule is not just divisible-by-four',
    name: 'leap_2024_feb_29', schema: 'd: date', input: 'd"2024-02-29"' },
  { name: 'non_leap_2023_feb_29', schema: 'd: date', input: 'd"2023-02-29"' },
  { name: 'century_1900_feb_29', schema: 'd: date', input: 'd"1900-02-29"',
    note: '1900 is NOT a leap year: divisible by 100 and not by 400' },
  { name: 'century_2000_feb_29', schema: 'd: date', input: 'd"2000-02-29"',
    note: '2000 IS a leap year: divisible by 400' },
  { name: 'feb_28_any_year', schema: 'd: date', input: 'd"2023-02-28"' },

  { group: 'time-of-day boundaries', name: 'midnight', schema: 't: time', input: 't"00:00:00.000"' },
  { name: 'one_ms_before_midnight', schema: 't: time', input: 't"23:59:59.999"' },
  { name: 'hour_24', schema: 't: time', input: 't"24:00:00.000"' },
  { name: 'minute_60', schema: 't: time', input: 't"12:60:00.000"' },
  { name: 'second_60', schema: 't: time', input: 't"12:00:60.000"',
    note: 'a leap second, if it is accepted at all' },
  { name: 'second_59', schema: 't: time', input: 't"12:00:59.000"' },

  { group: 'datetime precision and zone', name: 'datetime_utc_z',
    schema: 'd: datetime', input: 'dt"2024-03-20T14:30:45.000Z"' },
  { name: 'datetime_millis_kept', schema: 'd: datetime', input: 'dt"2024-03-20T14:30:45.123Z"' },
  { name: 'datetime_positive_offset', schema: 'd: datetime', input: 'dt"2024-03-20T14:30:45.000+05:30"' },
  { name: 'datetime_negative_offset', schema: 'd: datetime', input: 'dt"2024-03-20T14:30:45.000-08:00"' },
  { name: 'datetime_no_zone', schema: 'd: datetime', input: 'dt"2024-03-20T14:30:45.000"' },
  { name: 'datetime_no_millis', schema: 'd: datetime', input: 'dt"2024-03-20T14:30:45Z"' },
  { name: 'datetime_minutes_only', schema: 'd: datetime', input: 'dt"2024-03-20T14:30Z"' },
  { name: 'datetime_date_only', schema: 'd: datetime', input: 'dt"2024-03-20"' },

  { group: 'the three annotations are not interchangeable',
    name: 'date_given_a_datetime', schema: 'd: date', input: 'dt"2024-03-20T00:00:00.000Z"' },
  { name: 'datetime_given_a_date', schema: 'd: datetime', input: 'd"2024-03-20"' },
  { name: 'time_given_a_date', schema: 'd: time', input: 'd"2024-03-20"' },
  { name: 'date_given_a_time', schema: 'd: date', input: 't"12:00:00.000"' },

  { group: 'year boundaries', name: 'year_0001', schema: 'd: date', input: 'd"0001-01-01"' },
  { name: 'year_9999', schema: 'd: date', input: 'd"9999-12-31"' },
  { name: 'year_two_digit', schema: 'd: date', input: 'd"24-01-01"' },
  { name: 'year_five_digit', schema: 'd: date', input: 'd"12024-01-01"' },
];

// ---------------------------------------------------------------------------------------------
// Numeric precision at the edges
// ---------------------------------------------------------------------------------------------
const numericDepth: Case[] = [
  { group: 'the double-precision boundary', name: 'max_safe_integer',
    schema: 'n: int', input: '9007199254740991' },
  { name: 'max_safe_integer_plus_one', schema: 'n: int', input: '9007199254740992' },
  { name: 'max_safe_integer_plus_two', schema: 'n: int', input: '9007199254740993',
    note: 'a double cannot represent this; whether it is rejected or silently rounded is the rule' },
  { name: 'min_safe_integer', schema: 'n: int', input: '-9007199254740991' },
  { name: 'beyond_as_bigint', schema: 'n: bigint', input: '9007199254740993n',
    note: 'the same magnitude as a bigint, which CAN hold it exactly' },

  { group: 'zero and its sign', name: 'positive_zero', schema: 'n: number', input: '0' },
  { name: 'negative_zero', schema: 'n: number', input: '-0' },
  { name: 'zero_decimal', schema: 'n: decimal', input: '0m' },
  { name: 'negative_zero_decimal', schema: 'n: decimal', input: '-0m' },
  { name: 'zero_bigint', schema: 'n: bigint', input: '0n' },
  { name: 'negative_zero_bigint', schema: 'n: bigint', input: '-0n' },

  { group: 'exponent range', name: 'small_exponent', schema: 'n: number', input: '1e-300' },
  { name: 'large_exponent', schema: 'n: number', input: '1e300' },
  { name: 'exponent_overflow', schema: 'n: number', input: '1e400',
    note: 'beyond a double\'s range' },
  { name: 'exponent_underflow', schema: 'n: number', input: '1e-400' },

  { group: 'bounds probed AT the boundary', name: 'min_exactly', schema: 'n: {int, min: 10}', input: '10' },
  { name: 'min_one_below', schema: 'n: {int, min: 10}', input: '9' },
  { name: 'max_exactly', schema: 'n: {int, max: 10}', input: '10' },
  { name: 'max_one_above', schema: 'n: {int, max: 10}', input: '11' },
  { name: 'min_equals_max_satisfied', schema: 'n: {int, min: 5, max: 5}', input: '5' },
  { name: 'min_equals_max_violated', schema: 'n: {int, min: 5, max: 5}', input: '6' },
  { name: 'negative_bound_exactly', schema: 'n: {int, min: -5}', input: '-5' },
  { name: 'negative_bound_one_below', schema: 'n: {int, min: -5}', input: '-6' },
  { name: 'fractional_bound_exactly', schema: 'n: {number, max: 1.5}', input: '1.5' },
  { name: 'fractional_bound_just_above', schema: 'n: {number, max: 1.5}', input: '1.6' },

  { group: 'multipleOf at the edges', name: 'multiple_of_zero_value',
    schema: 'n: {int, multipleOf: 3}', input: '0', note: 'zero is a multiple of everything' },
  { name: 'multiple_of_negative_value', schema: 'n: {int, multipleOf: 3}', input: '-9' },
  { name: 'multiple_of_exact', schema: 'n: {int, multipleOf: 3}', input: '9' },
  { name: 'multiple_of_off_by_one', schema: 'n: {int, multipleOf: 3}', input: '10' },
  { name: 'multiple_of_one', schema: 'n: {int, multipleOf: 1}', input: '7' },

  { group: 'decimal scale is significant', name: 'scale_preserved',
    schema: 'd: decimal', input: '1.50m' },
  { name: 'scale_zero', schema: 'd: decimal', input: '1m' },
  { name: 'scale_at_limit', schema: 'd: {decimal, scale: 2}', input: '1.23m' },
  { name: 'scale_over_limit', schema: 'd: {decimal, scale: 2}', input: '1.234m' },
  { name: 'scale_under_limit', schema: 'd: {decimal, scale: 2}', input: '1.2m' },
  { name: 'precision_at_limit', schema: 'd: {decimal, precision: 3}', input: '123m' },
  { name: 'precision_over_limit', schema: 'd: {decimal, precision: 3}', input: '1234m' },
];

// ---------------------------------------------------------------------------------------------
// String length is counted in CODE POINTS
// ---------------------------------------------------------------------------------------------
const stringDepth: Case[] = [
  { group: 'ASCII length, at the boundary', name: 'len_exactly',
    schema: 's: {string, len: 3}', input: 'abc' },
  { name: 'len_one_short', schema: 's: {string, len: 3}', input: 'ab' },
  { name: 'len_one_long', schema: 's: {string, len: 3}', input: 'abcd' },
  { name: 'min_len_exactly', schema: 's: {string, minLen: 3}', input: 'abc' },
  { name: 'min_len_one_short', schema: 's: {string, minLen: 3}', input: 'ab' },
  { name: 'max_len_exactly', schema: 's: {string, maxLen: 3}', input: 'abc' },
  { name: 'max_len_one_long', schema: 's: {string, maxLen: 3}', input: 'abcd' },
  { name: 'empty_string_min_len_zero', schema: 's: {string, minLen: 0}', input: '""' },
  { name: 'empty_string_min_len_one', schema: 's: {string, minLen: 1}', input: '""' },

  // LENGTH IS CODE POINTS. JavaScript's .length counts UTF-16 units and would make an emoji 2;
  // UTF-8 bytes would make it 4. Go should use utf8.RuneCountInString, Rust .chars().count(),
  // Python len(); JavaScript needs an explicit spread. These rows are where that shows.
  { group: 'one emoji is ONE code point, not two units or four bytes',
    name: 'emoji_len_one', schema: 's: {string, len: 1}', input: '"\ud83d\ude00"' },
  { name: 'emoji_len_two_rejected', schema: 's: {string, len: 2}', input: '"\ud83d\ude00"' },
  { name: 'two_emoji_len_two', schema: 's: {string, len: 2}', input: '"\ud83d\ude00\ud83d\ude01"' },
  { name: 'emoji_max_len_one', schema: 's: {string, maxLen: 1}', input: '"\ud83d\ude00"' },
  { name: 'emoji_plus_ascii_len_two', schema: 's: {string, len: 2}', input: '"a\ud83d\ude00"' },

  { group: 'other multi-byte scripts', name: 'cjk_len_three',
    schema: 's: {string, len: 3}', input: '"\u65e5\u672c\u8a9e"',
    note: 'three CJK characters are three code points and nine UTF-8 bytes' },
  { name: 'accented_len_one', schema: 's: {string, len: 1}', input: '"\u00e9"' },
  { name: 'cyrillic_len_four', schema: 's: {string, len: 4}', input: '"\u0442\u0435\u0441\u0442"' },
  { name: 'mixed_scripts_len', schema: 's: {string, len: 4}', input: '"a\u00e9\u65e5\ud83d\ude00"' },

  { group: 'patterns against the same strings', name: 'pattern_ascii_matches',
    schema: 's: {string, pattern: "^[a-z]+$"}', input: 'abc' },
  { name: 'pattern_ascii_rejects_digit', schema: 's: {string, pattern: "^[a-z]+$"}', input: 'ab1' },
  { name: 'pattern_anchored_start_only', schema: 's: {string, pattern: "^ab"}', input: 'abxyz' },
  { name: 'pattern_unanchored', schema: 's: {string, pattern: "b"}', input: 'abc' },
  { name: 'pattern_on_empty_string', schema: 's: {string, pattern: "^$"}', input: '""' },
  { name: 'pattern_with_unicode_input', schema: 's: {string, pattern: "^.$"}', input: '"\u00e9"' },
];

// ---------------------------------------------------------------------------------------------
// Objects: surplus members, nesting, and how a failure names its path
// ---------------------------------------------------------------------------------------------
const objectsAndPaths: Case[] = [
  { group: 'a closed schema rejects a surplus member', name: 'closed_exact_members',
    schema: 'a: int', input: 'a: 1' },
  { name: 'closed_surplus_named', schema: 'a: int', input: 'a: 1, b: 2' },
  { name: 'closed_surplus_positional', schema: 'a: int', input: '1, 2' },
  { name: 'open_schema_allows_surplus', schema: 'a: int, *', input: 'a: 1, b: 2' },
  { name: 'open_schema_typed_surplus_ok', schema: 'a: int, *: int', input: 'a: 1, b: 2' },
  { name: 'open_schema_typed_surplus_wrong_type', schema: 'a: int, *: int', input: 'a: 1, b: x' },
  { name: 'open_schema_no_surplus', schema: 'a: int, *', input: 'a: 1' },

  // NAMING the member (`o: {…}`) is the unambiguous spelling. A record whose text BEGINS with a
  // brace is read as an enclosed RECORD instead — see the enclosure group below — so `{5}` here
  // would test that ambiguity rather than nesting.
  { group: 'nested objects', name: 'nested_object_valid', schema: 'o: {x: int}', input: '~ o: {x: 5}' },
  { name: 'nested_object_positional_inner', schema: 'o: {x: int}', input: '~ o: {5}' },
  { name: 'nested_object_wrong_type', schema: 'o: {x: int}', input: '~ o: {notanumber}' },
  { name: 'nested_object_missing_member', schema: 'o: {x: int, y: int}', input: '~ o: {5}' },
  { name: 'nested_object_surplus_member', schema: 'o: {x: int}', input: '~ o: {x: 5, z: 6}' },
  { name: 'nested_object_given_a_scalar', schema: 'o: {x: int}', input: '~ o: 5' },
  { name: 'nested_object_given_an_array', schema: 'o: {x: int}', input: '~ o: [5]' },
  { name: 'nested_object_given_null', schema: 'o: {x: int}', input: '~ o: N' },
  { name: 'two_levels_valid', schema: 'o: {p: {q: int}}', input: '~ o: {p: {q: 1}}' },
  { name: 'two_levels_positional', schema: 'o: {p: {q: int}}', input: '~ o: {{1}}' },
  { name: 'two_levels_inner_wrong_type', schema: 'o: {p: {q: int}}', input: '~ o: {p: {q: x}}' },
  { name: 'three_levels_valid', schema: 'o: {p: {q: {r: int}}}', input: '~ o: {p: {q: {r: 1}}}' },
  { name: 'three_levels_inner_wrong_type', schema: 'o: {p: {q: {r: int}}}', input: '~ o: {p: {q: {r: x}}}' },

  // A record whose text begins with `{` is AMBIGUOUS: the braces can enclose the record itself,
  // or be the value of its first member. io-js2 resolves it by what the braces contain, and the
  // corpus records that rather than pretending the ambiguity is not there (see ISSUE-15 and the
  // `ambiguous:record-enclosure` rows the X1 both-paths runner declines to compare).
  { group: 'record enclosure — braces at the START of a record', name: 'enclosure_keyed_reads_as_value',
    schema: 'o: {x: int}', input: '~ {x: 5}',
    note: 'KEYED braces are read as the VALUE of the first member' },
  { name: 'enclosure_positional_reads_as_the_record', schema: 'o: {x: int}', input: '~ {5}',
    note: 'POSITIONAL braces are read as the RECORD itself, so `o` receives 5 and not an object' },
  { name: 'enclosure_two_positional', schema: 'a: int, b: int', input: '~ {1, 2}' },
  { name: 'enclosure_two_keyed', schema: 'a: int, b: int', input: '~ {a: 1, b: 2}' },
  { name: 'enclosure_avoided_by_naming', schema: 'o: {x: int}', input: '~ o: {5}',
    note: 'the CONTROL: naming the member removes the ambiguity entirely' },

  { group: 'failures inside arrays', name: 'array_element_wrong_type', schema: 'a: [int]', input: '~ a: [1, x]' },
  { name: 'array_of_objects_inner_failure', schema: 'a: [{x: int}]', input: '~ a: [{1}, {y}]' },
  { name: 'array_of_objects_all_valid', schema: 'a: [{x: int}]', input: '~ a: [{1}, {2}]' },
  { name: 'nested_array_element_wrong_type', schema: 'a: [[int]]', input: '~ a: [[1], [x]]' },

  { group: 'a member named like a reserved word', name: 'member_named_data', schema: 'data: int', input: '1' },
  { name: 'member_named_header', schema: 'header: int', input: '1' },
  { name: 'member_named_type', schema: 'type: string', input: 'x' },
  { name: 'member_named_value', schema: 'value: int', input: '1' },
];

// ---------------------------------------------------------------------------------------------
// Accumulation — what happens when several things are wrong at once
// ---------------------------------------------------------------------------------------------
const accumulation: Case[] = [
  { group: 'two members fail', name: 'two_type_mismatches', schema: 'a: int, b: int', input: 'x, y' },
  { name: 'first_ok_second_fails', schema: 'a: int, b: int', input: '1, y' },
  { name: 'first_fails_second_ok', schema: 'a: int, b: int', input: 'x, 2' },
  { name: 'three_members_all_fail', schema: 'a: int, b: int, c: int', input: 'x, y, z' },

  { group: 'different kinds of failure together', name: 'missing_and_mismatch',
    schema: 'a: int, b: int, c: int', input: 'x' },
  { name: 'mismatch_and_surplus', schema: 'a: int', input: 'x, 2' },
  { name: 'null_and_mismatch', schema: 'a: int, b: int', input: 'N, y' },
  { name: 'constraint_and_type_failure', schema: 'a: {int, min: 10}, b: int', input: '1, y' },

  { group: 'failures across records', name: 'two_records_second_fails',
    schema: 'a: int', input: '~ 1\n~ x' },
  { name: 'two_records_both_fail', schema: 'a: int', input: '~ x\n~ y' },
  { name: 'three_records_middle_fails', schema: 'a: int', input: '~ 1\n~ x\n~ 3' },
  { name: 'two_records_both_valid', schema: 'a: int', input: '~ 1\n~ 2' },

  { group: 'failures at depth', name: 'nested_and_top_level_failures',
    schema: 'a: int, o: {x: int}', input: '~ a: x, o: {y}' },
  { name: 'two_failures_in_one_nested_object', schema: 'o: {x: int, y: int}', input: '~ o: {a, b}' },
  { name: 'two_failures_in_one_array', schema: 'a: [int]', input: '~ a: [x, y]' },
  { name: 'failure_in_each_of_two_arrays', schema: 'a: [int], b: [int]', input: '~ a: [x], b: [y]' },

  { group: 'many constraints violated by one value', name: 'too_short_and_wrong_pattern',
    schema: 's: {string, minLen: 5, pattern: "^[0-9]+$"}', input: 'ab' },
  { name: 'below_min_and_not_multiple', schema: 'n: {int, min: 10, multipleOf: 7}', input: '3' },
  { name: 'not_a_choice_and_too_long', schema: 's: {string, maxLen: 2, choices: [ab]}', input: 'xyz' },
];

// ---------------------------------------------------------------------------------------------

type Suite = [file: string, description: string, header: string[], cases: Case[]];

const COMMON = 'GENERATED by tools/corpus/suites-validation-2.ts — edit the case table there, not this file.';

const SUITES: Suite[] = [
  ['optionality', 'The optionality matrix — optional (?) and nullable (*) against present, absent and null',
   ['Validation · OPTIONALITY',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'Two independent axes, and conflating them is the classic porting mistake: `?` governs',
    'ABSENCE, `*` governs NULL. An optional member given an explicit N is NOT excused by its',
    'optionality — it supplied a value, and that value was null.',
    COMMON],
   optionality],

  ['defaults', 'Defaults — when they apply, and what happens when one violates its own constraints',
   ['Validation · DEFAULTS',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'A default fills an omitted member. The interesting rows are the ones where the default is',
    'itself invalid: a default below its own min, or of the wrong type. Whether that is caught',
    'at compile time, at validation time, or not at all is a real difference between ports.',
    COMMON],
   defaults],

  ['choices', 'Choices — membership is exact, across types, and combined with the other modifiers',
   ['Validation · CHOICES',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'Membership is compared EXACTLY, case included. Note `choice_quoted_matches_bare`: quoting',
    'is a spelling of the same string, so it must satisfy the same choice — a port that compares',
    'source text rather than decoded values fails that row and only that row.',
    COMMON],
   choices],

  ['sub-formats', 'The email and url types — accepted forms, rejected forms, and inherited string constraints',
   ['Validation · SUB-FORMATS (email, url)',
    'Authoritative: outcomes produced by running io-js2 parse().',
    '`email` and `url` are `string` with a format rule, so they inherit the string constraints:',
    'a maxLen applies to an email exactly as it would to a string.',
    COMMON],
   subFormats],

  ['unions', 'Union types — anyOf on the any type, including constrained alternatives',
   ['Validation · UNION TYPES (anyOf)',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'A member typed `any` with an `anyOf` list accepts a value matching ANY one alternative.',
    'An alternative may be a bare type name or a full memberdef with its own constraints, so',
    '`anyOf: [{int, multipleOf: 5}, {int, multipleOf: 3}]` accepts 10 and 9 but not 7.',
    'Matching MORE than one alternative is still a match.',
    COMMON],
   unions],

  ['binary', 'Binary values, and the `binary` schema type that is not registered yet',
   ['Validation \u00b7 BINARY',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'A binary VALUE (b"\u2026") works wherever a value is accepted. The TYPE NAME `binary` is a',
    'different matter: the specification describes it, io-js2 registers no BinaryDef, and',
    '`{b: binary}` reports `unknown-type`. ADR 0002 \u00a75 withheld `expected-binary` for exactly',
    'that reason \u2014 no site could emit it. These rows pin where the line currently is.',
    COMMON],
   binary],

  ['collections', 'Collection rules — ragged records, empty records, and per-record validation',
   ['Validation \u00b7 COLLECTION RULES',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'An empty record `~` is an empty OBJECT, valid only when every member may be absent. Note',
    'that nullable is not optional: `name*: string` still requires the member to be PRESENT, so',
    'an empty record fails it. Each rule here has an accepting and a rejecting row.',
    'EVERY record is validated, not only the first \u2014 an implementation that validates the first',
    'record and assumes the rest match passes most of this corpus and fails the last group.',
    COMMON],
   collections],

  ['temporal-depth', 'Temporal boundaries — month lengths, leap years, time-of-day, zones, and annotation identity',
   ['Validation \u00b7 TEMPORAL BOUNDARIES',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'Probed AT the boundary and one step past it, which is where an off-by-one is observable and',
    'nowhere else. The leap-year rows are the ones to read: 1900 is not a leap year and 2000 is,',
    'so an implementation testing only divisible-by-four passes 2024 and fails both.',
    COMMON],
   temporalDepth],

  ['numeric-depth', 'Numeric precision at the edges — the double boundary, signed zero, exponents, and bounds',
   ['Validation \u00b7 NUMERIC PRECISION',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'Every bound is probed AT its limit and one step outside. Past 2^53 a double cannot hold every',
    'integer, which is why bigint exists and why the same magnitude appears in both forms here.',
    COMMON],
   numericDepth],

  ['strings-depth', 'String length in CODE POINTS, and patterns against the same strings',
   ['Validation \u00b7 STRING LENGTH and PATTERNS (depth)',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'LENGTH IS MEASURED IN CODE POINTS. One emoji is 1 \u2014 not the 2 UTF-16 units JavaScript',
    'counts, nor the 4 UTF-8 bytes. Go should use utf8.RuneCountInString, Rust .chars().count(),',
    'Python len(); JavaScript needs an explicit spread, since .length is wrong. The emoji rows are',
    'the only place that difference is visible, and they are why they are here.',
    COMMON],
   stringDepth],

  ['objects-and-paths', 'Objects — surplus members against closed and open schemas, and failures at depth',
   ['Validation · OBJECTS, SURPLUS MEMBERS, and DEPTH',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'A schema is CLOSED by default: a member it does not declare is an error. A trailing `*`',
    'opens it, and `*: type` opens it to members of one type.',
    COMMON],
   objectsAndPaths],

  ['accumulation-depth', 'Accumulation — several failures at once, across members, records and depth',
   ['Validation · ACCUMULATION (depth)',
    'Authoritative: outcomes produced by running io-js2 parse().',
    'Validation COLLECTS rather than stopping at the first failure, so the ORDER and COUNT of',
    'the reported codes is itself part of the contract. A port that stops early passes every',
    'single-failure case in this corpus and fails every row here.',
    COMMON],
   accumulation],
];

let total = 0;
for (const [file, description, header, cases] of SUITES) {
  const seen = new Set<string>();
  for (const c of cases) {
    if (seen.has(c.name)) throw new Error(`${file}: duplicate case name '${c.name}'`);
    seen.add(c.name);
  }
  const content = generate(file, description, header, cases);
  emit(`${OUT}/${file}.io`, content, cases.length);
  total += cases.length;
}
console.log(`\n${SUITES.length} suites, ${total} cases generated`);
