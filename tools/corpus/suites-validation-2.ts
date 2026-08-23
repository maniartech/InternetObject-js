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
