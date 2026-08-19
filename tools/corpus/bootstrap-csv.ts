import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import parse from '../../src/parser/index';

/**
 * Render the TOKENIZER corpus as CSV, for bootstrapping a port.
 *
 * The tokenizer suites are written in `.io` and express their test data using IO raw strings,
 * regular strings and escapes — the exact machinery under test. A fresh Go or Rust port therefore
 * cannot read them until it already has a working tokenizer, which is what they are for. This
 * generator breaks that circle: the same cases, in a format every language opens with no
 * third-party dependency.
 *
 * `.io` REMAINS the source of truth. The CSV is generated and committed; regenerate and diff to
 * prove it has not drifted:
 *
 *   npm run corpus:bootstrap
 *   git diff --exit-code ../io-test-cases/bootstrap/
 *
 * ONE ROW PER EXPECTED TOKEN. A case expecting no tokens (whitespace only) emits a single row with
 * an empty `index`. Columns:
 *
 *   suite       source file, without extension
 *   case        case name, unique within a suite
 *   input       the text handed to the tokenizer      (escaped, see below)
 *   index       0-based position in the token stream, empty when no tokens are expected
 *   type        token type      (NUMBER, STRING, ERROR, …)
 *   sub_type    token sub-type  (REGULAR_STRING, OPEN_STRING, RAW_STRING), empty when absent
 *   value       the DECODED value                     (escaped)
 *   token       the RAW source text of the token      (escaped)
 *   error_code  set on an ERROR token, empty otherwise
 *
 * `input`, `value` and `token` use one small escape convention, because CSV cannot carry control
 * characters legibly: a backslash becomes `\\`, and newline / carriage return / tab become `\n`
 * `\r` `\t`; any other control character becomes `\uXXXX`. Nothing else is escaped. Unescaping is
 * about ten lines in any language, against a whole tokenizer for the `.io` form.
 *
 * A number is written in its decimal form; `value` is a text column throughout, so a port compares
 * against its own value rendered the same way.
 */

const SRC_DIR = '../io-test-cases/tokenizer';
const OUT_DIR = '../io-test-cases/bootstrap';
const OUT_FILE = join(OUT_DIR, 'tokenizer.csv');

const HEADER = ['suite', 'case', 'input', 'index', 'type', 'sub_type', 'value', 'token', 'error_code'];

const BACKSLASH = String.fromCharCode(92);

/**
 * The documented escape convention — written as a loop rather than a regex character class so the
 * control characters it handles never appear literally in this file.
 */
function escapeCell(raw: string): string {
  let out = '';
  for (const ch of raw) {
    const code = ch.codePointAt(0)!;
    if (ch === BACKSLASH) out += BACKSLASH + BACKSLASH;
    else if (code === 10) out += BACKSLASH + 'n';
    else if (code === 13) out += BACKSLASH + 'r';
    else if (code === 9) out += BACKSLASH + 't';
    else if (code < 0x20 || code === 0x7f) out += BACKSLASH + 'u' + code.toString(16).padStart(4, '0');
    else out += ch;
  }
  return out;
}

/**
 * RFC 4180 quoting. After escaping there are no newlines left, so every row is one line.
 *
 * Leading or trailing SPACE forces quoting too: it is significant here (the `only_spaces` case is
 * three spaces and nothing else) and readers are entitled to trim an unquoted field.
 */
function csvCell(value: string): string {
  return /[",]/.test(value) || /^\s|\s$/.test(value)
    ? `"${value.replace(/"/g, '""')}"`
    : value;
}

/**
 * A token field as text. `undefined` becomes an empty cell; a number keeps its decimal form.
 *
 * The `type` column says how to read `value`, so no per-value tagging is needed:
 *   BINARY  -> the base64 text, the corpus's own neutral spelling for bytes
 *   ERROR   -> empty; the code is in `error_code`
 */
function fieldText(v: any): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'object') {
    if (typeof v.base64 === 'string') return v.base64;   // { __type: bytes, base64: ... }
    if (v.errorCode !== undefined) return '';            // an error payload; see error_code
    return '';
  }
  return String(v);
}

function casesOf(file: string): any[] {
  const doc: any = parse(readFileSync(file, 'utf8'), null);
  const errors = doc.getErrors?.() ?? [];
  if (errors.length > 0) {
    throw new Error(`${file} does not parse: ${errors.map((e: any) => e.errorCode).join(', ')}`);
  }
  const projected: any = doc.toObject();
  return Array.isArray(projected) ? projected : (projected?.data ?? []);
}

const rows: string[] = [HEADER.join(',')];
let caseCount = 0;
let tokenCount = 0;

for (const name of readdirSync(SRC_DIR).filter(f => f.endsWith('.io')).sort()) {
  const suite = basename(name, '.io');
  for (const c of casesOf(join(SRC_DIR, name))) {
    caseCount++;
    const input = escapeCell(fieldText(c.input));
    const tokens: any[] = Array.isArray(c.expected) ? c.expected : [];

    if (tokens.length === 0) {
      rows.push([suite, c.name, input, '', '', '', '', '', ''].map(csvCell).join(','));
      continue;
    }

    tokens.forEach((t: any, i: number) => {
      tokenCount++;
      rows.push([
        suite,
        c.name,
        input,
        String(i),
        fieldText(t.type),
        fieldText(t.subType),
        escapeCell(fieldText(t.value)),
        escapeCell(fieldText(t.token)),
        fieldText(t.errorCode),
      ].map(csvCell).join(','));
    });
  }
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_FILE, rows.join('\n') + '\n', 'utf8');
console.log(`${OUT_FILE}: ${caseCount} cases, ${tokenCount} expected tokens, ${rows.length - 1} rows`);
