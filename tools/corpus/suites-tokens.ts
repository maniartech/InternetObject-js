import { writeFileSync, mkdirSync } from 'fs';
import { requireCorpusPath } from './sibling-repos'
import Tokenizer from '../../src/parser/tokenizer/index';

/**
 * Generate `tokenizer/*.io` corpus suites, deriving every token stream by RUNNING the reference implementation.
 *
 *   npx tsx tools/corpus/suites-tokens.ts
 *   npm run corpus:bootstrap     # then regenerate the CSV that actually executes them
 *
 * These files ADD to the hand-authored tokenizer suites rather than replacing them — those carry
 * prose worth keeping. What is added here is breadth: the numeric rules at their boundaries, the
 * string forms against each other, and the structural tokens in sequence.
 *
 * A tokenizer suite is peculiar in one way that matters: its `.io` source expresses test data using
 * the raw strings, regular strings and escapes the tokenizer is under test FOR, so a port cannot
 * read it until it already has a working tokenizer. That circle is broken by
 * `tools/corpus/bootstrap-csv.ts`, which renders the same cases as CSV. `.io` stays the source of
 * truth; the CSV is generated, committed, and is what the runners execute. After changing anything
 * here, regenerate it — otherwise the new cases exist but nothing runs them.
 */

interface TokCase {
  name: string;
  input: string;
  note?: string;
  group?: string;
  review?: string;
}

interface TokSuite {
  file: string;
  description: string;
  header: string[];
  cases: TokCase[];
}

const OUT_DIR = requireCorpusPath('tokenizer');

function ioText(s: string): string {
  const esc = s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
  return esc.includes('"') ? `'${esc.replace(/'/g, "\\'")}'` : `"${esc}"`;
}

const KEYWORDS = new Set(['null', 'N', 'T', 'F', 'true', 'false', 'NaN', 'Inf']);

/** Spell one field the way the hand-authored tokenizer suites do. */
function fieldLiteral(v: any): string {
  if (v === null || v === undefined) return 'N';
  if (typeof v === 'boolean') return v ? 'T' : 'F';
  if (typeof v === 'bigint') return `${v}n`;
  if (typeof v === 'number') {
    return Number.isFinite(v) ? String(v) : (Number.isNaN(v) ? 'NaN' : (v > 0 ? 'Inf' : '-Inf'));
  }
  if (v instanceof Uint8Array) return `"${Buffer.from(v).toString('base64')}"`;
  if (v instanceof Date) return `dt"${v.toISOString()}"`;
  if (v?.constructor?.name === 'Decimal') return `${String(v)}m`;
  const s = String(v);
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s) && !KEYWORDS.has(s) ? s : JSON.stringify(s);
}

/**
 * One token as the corpus spells it: `type`, `value`, `token`, plus `subType` and `errorCode` only
 * where they carry information. A field that is always empty is noise in every row.
 */
function tokenLiteral(t: any): string {
  const parts: string[] = [`type: ${fieldLiteral(String(t?.type ?? ''))}`];

  const sub = String(t?.subType ?? '');
  if (sub) parts.push(`subType: ${fieldLiteral(sub)}`);

  // An ERROR token carries its code, and its `value` is an error payload rather than a value.
  const errorCode = t?.errorCode ?? t?.value?.errorCode ?? '';
  if (errorCode) {
    parts.push(`errorCode: ${fieldLiteral(String(errorCode))}`);
  } else {
    parts.push(`value: ${fieldLiteral(t?.value)}`);
  }

  parts.push(`token: ${fieldLiteral(String(t?.token ?? ''))}`);
  return `{ ${parts.join(', ')} }`;
}

// ---------------------------------------------------------------------------------------------
// The two numeric rules, at their boundaries
// ---------------------------------------------------------------------------------------------
const numericRules: TokCase[] = [
  { group: 'RULE 1 — all or nothing: a run is a number only if ALL of it is a number literal',
    name: 'digits_then_letters_is_a_string', input: '013ABSD',
    note: 'a real-world code. Not a valid number, so the WHOLE run is an open string' },
  { name: 'digits_then_letter', input: '1a' },
  { name: 'digits_then_unit', input: '12mm', note: 'a measurement reads as a string, not 12 followed by mm' },
  { name: 'version_like_run', input: '1.2.3' },
  { name: 'ip_like_run', input: '10.0.0.1' },
  { name: 'date_like_run', input: '2024.01.15' },
  { name: 'semver_with_suffix', input: '1.2.3-beta' },
  { name: 'digits_then_underscore', input: '1_000' },
  { name: 'trailing_dot', input: '1.',
    note: 'io-js2 ACCEPTS a trailing dot, as JavaScript and C do. It reads as a complete literal, ' +
          'so rule 1 is satisfied and this is a number — the prose spec is stricter here, a known ' +
          'divergence also noted in tokenizer/numbers.io' },
  { name: 'leading_dot_number', input: '.5', note: 'likewise accepted, and a number' },
  { name: 'leading_dot_only', input: '.', note: 'no digits at all, so not a literal — a string' },
  { name: 'dangling_exponent', input: '1e', note: 'not a valid literal, so the run is a string — NOT the number 1' },
  { name: 'dangling_exponent_sign', input: '1e+' },
  { name: 'double_exponent', input: '1.23ee4' },
  { name: 'plain_integer_is_a_number', input: '42', note: 'the control for the rows above' },
  { name: 'plain_float_is_a_number', input: '4.2' },

  { group: 'RULE 2 — a marker is a claim: a prefix or suffix can only mean NUMBER',
    name: 'hex_valid', input: '0xFF' },
  { name: 'hex_invalid_digit', input: '0x123FG', note: 'claims hex and is not — an ERROR, not a string' },
  { name: 'hex_no_digits', input: '0x' },
  { name: 'octal_valid', input: '0o17' },
  { name: 'octal_invalid_digit', input: '0o18' },
  { name: 'octal_no_digits', input: '0o' },
  { name: 'binary_valid', input: '0b1010' },
  { name: 'binary_invalid_digit', input: '0b1012' },
  { name: 'binary_no_digits', input: '0b' },
  { name: 'hex_uppercase_prefix', input: '0XFF' },
  { name: 'hex_negative', input: '-0xFF' },
  { name: 'hex_signed_plus', input: '+0xFF' },
  { name: 'not_a_marker_leading_letter', input: 'oxygen',
    note: 'no marker is claimed, so it is simply a string' },
  { name: 'not_a_marker_zero_then_letter', input: '0zebra' },

  { group: 'the suffix markers', name: 'bigint_valid', input: '123n' },
  { name: 'bigint_negative', input: '-123n' },
  { name: 'bigint_fractional_is_invalid', input: '12.3n' },
  { name: 'decimal_valid', input: '12.5m' },
  { name: 'decimal_integer', input: '12m' },
  { name: 'decimal_double_suffix', input: '123.45mm' },
  { name: 'bigint_double_suffix', input: '123nn' },
  { name: 'suffix_on_hex', input: '0xFFn' },
];

// ---------------------------------------------------------------------------------------------
// Strings — the four forms, against each other
// ---------------------------------------------------------------------------------------------
const stringForms: TokCase[] = [
  { group: 'open strings run to a delimiter', name: 'open_simple', input: 'hello' },
  { name: 'open_with_inner_spaces', input: 'hello world',
    note: 'a space does not end an open string — a separator merges (ADR 0003 D2)' },
  { name: 'open_stops_at_comma', input: 'a,b' },
  { name: 'open_stops_at_colon', input: 'a:b' },
  { name: 'open_stops_at_brace', input: 'a{b' },
  { name: 'open_stops_at_bracket', input: 'a[b' },
  { name: 'open_trimmed', input: '  padded  ' },
  { name: 'open_with_hash_starts_a_comment', input: 'a # b' },

  { group: 'regular strings are delimited', name: 'regular_simple', input: '"hello"' },
  { name: 'regular_empty', input: '""' },
  { name: 'regular_with_comma', input: '"a,b"' },
  { name: 'regular_with_spaces_kept', input: '"  padded  "' },
  { name: 'regular_single_quoted', input: "'hello'" },
  { name: 'regular_single_quoted_with_double', input: `'say "hi"'` },
  { name: 'regular_unterminated', input: '"unclosed' },
  { name: 'regular_unterminated_single', input: "'unclosed" },

  { group: 'escapes inside a regular string', name: 'escape_newline', input: '"a\\nb"' },
  { name: 'escape_tab', input: '"a\\tb"' },
  { name: 'escape_quote', input: '"a\\"b"' },
  { name: 'escape_backslash', input: '"a\\\\b"' },
  { name: 'escape_unicode', input: '"\\u0041"' },
  { name: 'escape_unknown', input: '"a\\qb"' },

  { group: 'raw strings take no escapes', name: 'raw_simple', input: "r'hello'" },
  { name: 'raw_with_backslash', input: "r'a\\nb'", note: 'the backslash-n stays two characters' },
  { name: 'raw_double_quoted', input: 'r"hello"' },
  { name: 'raw_unterminated', input: "r'unclosed" },
  { name: 'raw_empty', input: "r''" },

  { group: 'binary literals', name: 'binary_simple', input: 'b"SGVsbG8="' },
  { name: 'binary_empty', input: 'b""' },
  { name: 'binary_invalid_base64', input: 'b"!!!"' },
  { name: 'binary_unterminated', input: 'b"SGVsbG8=' },

  { group: 'strings that look like other things', name: 'string_true_quoted', input: '"true"' },
  { name: 'string_number_quoted', input: '"42"' },
  // NOT REPRESENTABLE HERE. The tokenizer reads `@name` / `$name` as ordinary open strings — it is
  // the PARSER that resolves them as references — but the corpus is itself an .io document, so a
  // recorded value of "@name" resolves when this file is read and the suite fails to parse
  // (`undefined-variable`). FINDINGS #3 documents the constraint and the two workarounds:
  // sigil-stripping, as the streaming suite does for schemaName, or omission with a note. There is
  // nothing to strip in a tokenizer row, so these are omitted. Reference RESOLUTION is covered
  // where it belongs, in document/definitions.io.
];

// ---------------------------------------------------------------------------------------------
// Structural tokens in sequence
// ---------------------------------------------------------------------------------------------
const structure: TokCase[] = [
  { group: 'separators and punctuation', name: 'comma_alone', input: ',' },
  { name: 'colon_alone', input: ':' },
  { name: 'key_value_pair', input: 'a: 1' },
  { name: 'two_pairs', input: 'a: 1, b: 2' },
  { name: 'leading_comma', input: ',a' },
  { name: 'trailing_comma', input: 'a,' },
  { name: 'double_comma', input: 'a,,b' },

  { group: 'braces and brackets', name: 'empty_object', input: '{}' },
  { name: 'empty_array', input: '[]' },
  { name: 'object_one_member', input: '{a: 1}' },
  { name: 'array_two_elements', input: '[1, 2]' },
  { name: 'nested_containers', input: '{a: [1]}' },
  { name: 'unclosed_brace', input: '{a: 1' },
  { name: 'unclosed_bracket', input: '[1' },
  { name: 'stray_close_brace', input: '}' },
  { name: 'stray_close_bracket', input: ']' },
  { name: 'mismatched_close', input: '{a: 1]' },

  { group: 'records and sections', name: 'record_marker', input: '~ a' },
  { name: 'two_records', input: '~ a\n~ b' },
  { name: 'section_separator', input: '---' },
  { name: 'named_section', input: '--- name' },
  // `--- $Name` is omitted for the same reason as the reference rows above: the recorded token
  // value would be "$Name", which resolves as a schema reference when this .io file is read
  // (FINDINGS #3). Schema selectors are covered in document/sections.io, where the sigil is part
  // of the INPUT rather than of a recorded value.
  { name: 'header_then_data', input: '~ a: 1\n---\n~ b' },
  { name: 'tilde_mid_line_is_not_a_record', input: 'a ~ b' },

  { group: 'comments', name: 'comment_only', input: '# a comment' },
  { name: 'comment_after_value', input: '1 # note' },
  { name: 'comment_before_value', input: '# note\n1' },
  { name: 'hash_inside_a_string_is_not_a_comment', input: '"a # b"' },
  { name: 'comment_to_end_of_line_only', input: '1 # note\n2' },

  { group: 'whitespace', name: 'empty_input', input: '' },
  { name: 'only_spaces', input: '   ' },
  { name: 'only_newlines', input: '\n\n' },
  { name: 'only_tab', input: '\t' },
  { name: 'crlf', input: 'a\r\nb' },
  { name: 'leading_whitespace_trimmed', input: '   a' },
];

// ---------------------------------------------------------------------------------------------

const SUITES: TokSuite[] = [
  {
    file: 'numbers-rules',
    description: 'The two numeric rules at their boundaries — all-or-nothing, and a marker is a claim',
    header: [
      'Tokenizer · THE TWO NUMERIC RULES',
      'Authoritative: token streams produced by running the reference implementation\'s Tokenizer on each input.',
      '',
      'RULE 1 — ALL OR NOTHING. A run is a number only if the ENTIRE run is a valid number',
      'literal; otherwise the whole run is an open string. So `013ABSD` is a string, and so are',
      '`1.2.3`, `10.0.0.1` and `12mm`.',
      '',
      'RULE 2 — A MARKER IS A CLAIM. The prefixes 0x/0o/0b and the suffixes m/n can only mean',
      'NUMBER. A run carrying one that is not a valid literal of that type is an ERROR, not a',
      'string: `0x123FG` claims hex and is not hex. `oxygen` claims nothing and is a string.',
      '',
      'See the reference implementation ADR 0003 §2. These two rules replaced a rule-per-case, and are the pair a port',
      'should implement directly rather than deriving from the individual rows below.',
    ],
    cases: numericRules,
  },
  {
    file: 'strings-forms',
    description: 'The four string forms against each other — open, regular, raw, binary',
    header: [
      'Tokenizer · STRING FORMS',
      'Authoritative: token streams produced by running the reference implementation\'s Tokenizer on each input.',
      'An OPEN string runs to a structural delimiter and is trimmed; a REGULAR string is',
      'delimited and takes escapes; a RAW string (r\'…\') takes none; a BINARY literal (b\'…\')',
      'decodes base64. The `subType` column is what tells them apart.',
    ],
    cases: stringForms,
  },
  {
    file: 'structure-tokens',
    description: 'Structural tokens in sequence — separators, containers, records, sections, comments',
    header: [
      'Tokenizer · STRUCTURAL TOKENS',
      'Authoritative: token streams produced by running the reference implementation\'s Tokenizer on each input.',
      'These rows assert SEQUENCE as much as identity: the count and order of tokens is the',
      'contract, and a tokenizer that emits an extra separator passes every single-token case.',
    ],
    cases: structure,
  },
];

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  let total = 0;

  for (const suite of SUITES) {
    const rows: string[] = [];
    rows.push(...suite.header.map(l => (l ? `# ${l}` : '#')));
    rows.push('# `expected` is the FULL token sequence (always a list), per AGENTS.md.');
    rows.push('# GENERATED by the reference implementation tools/corpus/suites-tokens.ts — edit the case table there.');
    rows.push('# After changing it, run `npm run corpus:bootstrap`: the CSV is what actually executes.');
    rows.push('~ version: 1.0');
    rows.push(`~ description: ${ioText(suite.description)}`);
    rows.push('~ $schema: { name: string, input: string, expected: any }');
    rows.push('---');

    let lastGroup = '';
    for (const c of suite.cases) {
      if (c.group && c.group !== lastGroup) {
        rows.push('');
        rows.push(`# ── ${c.group} ${'─'.repeat(Math.max(0, 86 - c.group.length))}`);
        lastGroup = c.group;
      }
      if (c.note) rows.push(`# ${c.note}`);
      if (c.review) rows.push(`# REVIEW: ${c.review}`);

      let tokens: any[];
      try {
        tokens = new Tokenizer(c.input).tokenize() as any[];
      } catch (e: any) {
        // A tokenizer that THROWS is a difference worth recording, but the corpus has no spelling
        // for it: every case asserts a token LIST. Flag it rather than inventing one.
        rows.push(`# REVIEW: tokenizer THREW ${e?.errorCode ?? e?.message} — case omitted`);
        continue;
      }

      const list = tokens.map(tokenLiteral).join(', ');
      rows.push(`~ ${c.name}, ${ioText(c.input)}, [${list}]`);
      total++;
    }

    writeFileSync(`${OUT_DIR}/${suite.file}.io`, rows.join('\n') + '\n', 'utf8');
    console.log(`${OUT_DIR}/${suite.file}.io: ${suite.cases.length} cases`);
  }

  console.log(`\n${SUITES.length} suites, ${total} cases generated`);
  console.log('Now run: npm run corpus:bootstrap   (the CSV is what executes these)');
}

main();
