import { emit, assertUniqueNames, type Case, type SuiteSpec } from './generate-parse';

/**
 * Case tables for the `document/` corpus suite — the DOCUMENT as a container.
 *
 *   npx tsx tools/corpus/suites-document.ts
 *
 * Where `parser/` asks "what value does this text denote", `document/` asks the questions one
 * level up, about the thing that holds the values: how a header separates from data, how sections
 * are named and addressed, how definitions and variables resolve into the value model, and what
 * shape the whole document projects to. Those are exactly the areas io-js2's `tests/core/` covers
 * and the corpus did not: the suite was empty before 2026-08-22.
 *
 * The cases are CHOSEN by hand; their outcomes are OBSERVED by running io-js2. Choosing well is
 * the whole job — probing this area is what surfaced ISSUE-27, where every scalar variable read
 * without a schema projected the parser's internals instead of its value.
 */

const OUT = '../io-test-cases/document';

// ---------------------------------------------------------------------------------------------
// Structure — what a whole document projects to
// ---------------------------------------------------------------------------------------------
const structure: Case[] = [
  { group: 'the three document shapes', name: 'single_object_is_the_whole_value', input: 'name: Alice, age: 30',
    note: 'one top-level object IS the value model — there is no wrapper around it' },
  { name: 'collection_projects_to_a_list', input: '~ a: 1\n~ a: 2',
    note: 'a `~` record makes the document a COLLECTION, even with one record' },
  { name: 'single_record_still_a_list', input: '~ a: 1' },
  { name: 'scalar_document', input: '42',
    note: 'a bare scalar is a positional member of an implicit object' },

  { group: 'the header separator', name: 'empty_document', input: '' },
  { name: 'separator_only', input: '---' },
  { name: 'separator_then_data', input: '---\na: 1' },
  { name: 'empty_header_then_collection', input: '---\n~ a: 1' },
  { name: 'header_metadata_and_data', input: '~ note: hello\n---\nx: 1',
    note: 'a bare (unsigilled) definition is METADATA and surfaces beside the data' },
  { name: 'metadata_only_header', input: '~ note: hello\n---' },
  { name: 'two_metadata_keys', input: '~ a: 1\n~ b: 2\n---\nx: 1' },

  { group: 'whitespace and comments around the structure', name: 'leading_blank_lines', input: '\n\n a: 1' },
  { name: 'trailing_newline', input: 'a: 1\n' },
  { name: 'comment_only_document', input: '# just a comment' },
  { name: 'comment_before_data', input: '# note\na: 1' },
  { name: 'comment_after_value', input: 'a: 1 # note' },
  { name: 'comment_between_records', input: '~ a: 1\n# between\n~ a: 2' },
  { name: 'comment_in_header', input: '# lead\n~ note: hi\n---\nx: 1' },
  { name: 'blank_line_between_records', input: '~ a: 1\n\n~ a: 2' },
  { name: 'tab_indentation', input: '\ta: 1' },

  { group: 'a NEWLINE is not a member separator — only a comma is',
    name: 'newline_between_members_merges_them', input: 'a: 1\nb: 2',
    note: 'the run `1\\nb` is ONE open string, so the second colon has no key: a separator ' +
          'merges rather than splits (ADR 0003 D2, ratified). This is not about line endings — ' +
          'CRLF behaves identically, see below.' },
  { name: 'comma_between_members_separates_them', input: 'a: 1, b: 2',
    note: 'the control for the row above' },
  { name: 'newline_inside_a_record_merges', input: '~ a: 1\nb: 2' },

  { group: 'CRLF line endings parse exactly as LF does',
    name: 'crlf_between_records', input: '~ a: 1\r\n~ a: 2',
    note: 'CR is Unicode whitespace, so a Windows-authored document needs no conversion' },
  { name: 'crlf_after_header_separator', input: '---\r\na: 1' },
  { name: 'crlf_trailing', input: 'a: 1\r\n' },
  { name: 'crlf_in_header', input: '~ note: hi\r\n---\r\nx: 1' },
  { name: 'lone_cr_between_records', input: '~ a: 1\r~ a: 2' },
];

// ---------------------------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------------------------
const sections: Case[] = [
  { group: 'unnamed and named sections', name: 'one_unnamed_section', input: '---\n~ a: 1' },
  { name: 'named_section_after_default', input: '---\n~ a: 1\n--- more\n~ b: 2',
    note: 'a bare name (no `$`) names a SECTION; the first, unnamed one is called `data`' },
  { name: 'two_named_sections', input: '--- one\n~ a: 1\n--- two\n~ b: 2' },
  { name: 'three_named_sections', input: '--- one\n~ a: 1\n--- two\n~ b: 2\n--- three\n~ c: 3' },
  { name: 'named_section_with_object', input: '---\na: 1\n--- more\nb: 2' },
  { name: 'empty_named_section', input: '---\n~ a: 1\n--- more' },

  { group: 'section names must be unique', name: 'duplicate_named_sections', input: '--- one\n~ a: 1\n--- one\n~ b: 2' },
  { name: 'duplicate_unnamed_sections', input: '---\n~ a: 1\n---\n~ b: 2',
    note: 'both are the implicit `data` section, so the second is a duplicate' },

  { group: 'a schema selector on a section', name: 'section_with_schema_selector', input: '~ $P: {n: string}\n--- $P\n~ n: a' },
  { name: 'two_sections_two_schemas', input: '~ $P: {n: string}\n~ $Q: {m: int}\n--- $P\n~ n: a\n--- $Q\n~ m: 1' },
  { name: 'unknown_schema_selector', input: '--- $Nope\n~ a: 1' },
  { name: 'schema_selector_without_definitions', input: '--- $P\n~ a: 1' },
];

// ---------------------------------------------------------------------------------------------
// Definitions and variables — ISSUE-27's home ground
// ---------------------------------------------------------------------------------------------
const definitions: Case[] = [
  { group: 'a variable resolves to its VALUE, never to a node (ISSUE-27)',
    name: 'string_variable', input: '~ @red: "#f00"\n---\ncolor: @red',
    note: 'this projected { pos, row, col, token, … } until 2026-08-22' },
  { name: 'number_variable', input: '~ @n: 42\n---\nx: @n' },
  { name: 'boolean_variable', input: '~ @b: T\n---\nx: @b' },
  { name: 'null_variable', input: '~ @z: N\n---\nx: @z' },
  { name: 'decimal_variable', input: '~ @d: 1.5m\n---\nx: @d' },
  { name: 'bigint_variable', input: '~ @g: 9n\n---\nx: @g' },
  { name: 'datetime_variable', input: '~ @t: dt"2024-01-01T00:00:00.000Z"\n---\nx: @t' },
  { name: 'object_variable', input: '~ @o: {a: 1}\n---\nx: @o' },
  { name: 'array_variable', input: '~ @a: [1, 2]\n---\nx: @a' },

  { group: 'where a variable may appear', name: 'variable_inside_array', input: '~ @n: 42\n---\nx: [@n]' },
  { name: 'variable_inside_object', input: '~ @n: 42\n---\nx: { y: @n }' },
  { name: 'variable_as_whole_value', input: '~ @n: 42\n---\n@n' },
  { name: 'variable_in_collection_record', input: '~ @n: 42\n---\n~ x: @n' },
  { name: 'variable_used_twice', input: '~ @a: 1\n---\nx: @a, y: @a' },
  { name: 'two_variables', input: '~ @a: 1\n~ @b: 2\n---\nx: @a, y: @b' },

  { group: 'variables referring to variables', name: 'chained_variable', input: '~ @a: 1\n~ @b: @a\n---\nx: @b' },
  { name: 'chained_variable_defined_later', input: '~ @b: @a\n~ @a: 1\n---\nx: @b',
    note: 'definition ORDER does not matter — a definition may name one parsed later' },
  { name: 'self_referential_variable', input: '~ @a: @a\n---\nx: @a' },
  { name: 'mutually_referential_variables', input: '~ @a: @b\n~ @b: @a\n---\nx: @a' },

  { group: 'undefined references', name: 'undefined_variable', input: '---\nx: @nope' },
  { name: 'undefined_schema_reference', input: '~ $schema: {a: $Nope}\n---\n~ a: 1' },
  { name: 'quoted_at_string_is_still_a_reference', input: '---\nx: "@a"',
    note: 'BY DESIGN: `@`/`$` are references in ANY string form, quoted and raw (FINDINGS #3)' },
  { name: 'at_sign_as_a_key_is_literal', input: '~ @a: k\n---\n@a: 1',
    note: 'a KEY is not a value position, so `@a` there is an ordinary key' },

  { group: 'schema references', name: 'schema_ref_in_schema', input: '~ $A: {x: int}\n~ $schema: {a: $A}\n---\n~ a: {x: 5}' },
  { name: 'schema_used_by_two_members', input: '~ $A: {x: int}\n~ $schema: {a: $A, b: $A}\n---\n~ a: {x: 1}, b: {x: 2}' },
  { name: 'variable_supplies_a_choice', input: '~ @r: red\n~ $schema: {c: {string, choices: [@r]}}\n---\n~ c: red' },
  { name: 'variable_violating_a_choice', input: '~ @r: red\n~ $schema: {c: {string, choices: [@r]}}\n---\n~ c: blue' },
  { name: 'variable_supplies_a_default', input: '~ @d: 7\n~ $schema: {n?: {int, default: @d}}\n---\n~ ' },
  { name: 'variable_as_data_under_schema', input: '~ @n: 5\n~ $schema: {x: int}\n---\n~ x: @n' },
  { name: 'variable_of_wrong_type_under_schema', input: '~ @n: "five"\n~ $schema: {x: int}\n---\n~ x: @n',
    note: 'the schema type-checks the variable\'s VALUE — this is why getV must return the node' },
];

// ---------------------------------------------------------------------------------------------
// Projection — how values are keyed in the value model
// ---------------------------------------------------------------------------------------------
const projection: Case[] = [
  { group: 'positional members take numeric-string keys', name: 'all_positional', input: '1, 2, 3' },
  { name: 'positional_then_keyed', input: '1, b: 2' },
  { name: 'keyed_then_positional', input: 'a: 1, 2',
    note: 'a positional member after a keyed one — its index counts ALL members' },
  { name: 'single_positional', input: '42' },
  { name: 'nested_positional', input: 'a: {1, 2}' },

  { group: 'empty containers', name: 'empty_object_value', input: 'a: {}' },
  { name: 'empty_array_value', input: 'a: []' },
  { name: 'top_level_empty_object', input: '{}' },
  { name: 'top_level_empty_array', input: '[]' },
  { name: 'array_of_empties', input: 'a: [{}, []]' },

  { group: 'nesting', name: 'object_in_object', input: 'a: { b: { c: 1 } }' },
  { name: 'array_in_array', input: 'a: [[1], [2]]' },
  { name: 'objects_in_array', input: 'a: [{x: 1}, {x: 2}]' },
  { name: 'array_in_object_in_array', input: 'a: [{ b: [1, 2] }]' },
  { name: 'deep_nesting_four_levels', input: 'a: { b: { c: { d: 1 } } }' },

  { group: 'null and missing', name: 'explicit_null', input: 'a: N' },
  { name: 'null_spelled_out', input: 'a: null' },
  { name: 'null_in_array', input: 'a: [N, 1]' },
  { name: 'null_valued_nested_object', input: 'a: { b: N }' },
];

// ---------------------------------------------------------------------------------------------

const SUITES: SuiteSpec[] = [
  {
    file: 'structure',
    description: 'Document structure — the three shapes, the header separator, comments and whitespace',
    header: [
      'Document · STRUCTURE — what a whole document projects to',
      'Authoritative: outcomes produced by running io-js2 parse() then doc.toObject().',
      'GENERATED by tools/corpus/suites-document.ts — edit the case table there, not this file.',
    ],
    cases: structure,
  },
  {
    file: 'sections',
    description: 'Sections — naming, ordering, uniqueness, and schema selectors',
    header: [
      'Document · SECTIONS — a document holds one or more named sections',
      'Authoritative: outcomes produced by running io-js2 parse() then doc.toObject().',
      'The first unnamed section is addressed as `data`; `--- name` names one, `--- $Name`',
      'selects a schema for it. GENERATED by tools/corpus/suites-document.ts.',
    ],
    cases: sections,
  },
  {
    file: 'definitions',
    description: 'Definitions — metadata, value variables (@) and schema references ($)',
    header: [
      'Document · DEFINITIONS — the header\'s three kinds of entry',
      'Authoritative: outcomes produced by running io-js2 parse() then doc.toObject().',
      'A bare key is metadata, `@name` a value variable, `$name` a schema reference.',
      'A variable resolves to its VALUE; it projected the AST node until ISSUE-27 was fixed.',
      'GENERATED by tools/corpus/suites-document.ts — edit the case table there, not this file.',
    ],
    cases: definitions,
  },
  {
    file: 'projection',
    description: 'Value projection — positional keys, empty containers, nesting, and null',
    header: [
      'Document · PROJECTION — how the value model keys and nests what it holds',
      'Authoritative: outcomes produced by running io-js2 parse() then doc.toObject().',
      'A positional member takes its INDEX as a numeric-string key ("0", "1", …).',
      'GENERATED by tools/corpus/suites-document.ts — edit the case table there, not this file.',
    ],
    cases: projection,
  },
];

let total = 0;
for (const spec of SUITES) {
  assertUniqueNames(spec);
  total += emit(`${OUT}/${spec.file}.io`, spec);
}
console.log(`\n${SUITES.length} suites, ${total} cases generated`);
