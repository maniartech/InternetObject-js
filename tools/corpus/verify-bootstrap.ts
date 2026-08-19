import { readFileSync } from 'fs';
import Tokenizer from '../../src/parser/tokenizer/index';

/**
 * Run the bootstrap CSV corpus against this tokenizer.
 *
 * This is the reference implementation of the `tokens` comparator, and it deliberately reads the
 * CSV rather than the `.io` source: doing so proves the generated file is FAITHFUL, and it is the
 * same path a fresh Go or Rust port takes on day one. A port that reproduces this file's logic —
 * about eighty lines, of which the CSV reader and the unescaper are half — has a working
 * conformance harness before it has a parser.
 *
 *   npm run corpus:bootstrap        regenerate ../io-test-cases/bootstrap/tokenizer.csv
 *   npm run corpus:tokens           run it against this tokenizer
 *
 * These 140 cases were previously unexecutable by anything: their `.io` source expresses its test
 * data with the raw strings, regular strings and escapes the tokenizer itself is under test for.
 */

const FILE = process.argv[2] ?? '../io-test-cases/bootstrap/tokenizer.csv';
const BACKSLASH = String.fromCharCode(92);

/** Split one CSV line into fields. RFC 4180: quoted fields, `""` for a literal quote. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; }   // an escaped quote
        else quoted = false;
      } else field += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      out.push(field); field = '';
    } else field += ch;
  }
  out.push(field);
  return out;
}

/** The inverse of the generator's escape convention. */
function unescapeCell(cell: string): string {
  let out = '';
  for (let i = 0; i < cell.length; i++) {
    if (cell[i] !== BACKSLASH) { out += cell[i]; continue; }
    const next = cell[++i];
    if (next === 'n') out += String.fromCharCode(10);
    else if (next === 'r') out += String.fromCharCode(13);
    else if (next === 't') out += String.fromCharCode(9);
    else if (next === 'u') { out += String.fromCharCode(parseInt(cell.slice(i + 1, i + 5), 16)); i += 4; }
    else out += next;                                     // BACKSLASH + BACKSLASH, and anything else
  }
  return out;
}

interface Expected { index: number; type: string; subType: string; value: string; token: string; errorCode: string }
interface Case { suite: string; name: string; input: string; expected: Expected[] }

const lines = readFileSync(FILE, 'utf8').split('\n').filter(l => l.length > 0);
const header = splitCsvLine(lines[0]);
const col = (fields: string[], name: string) => fields[header.indexOf(name)] ?? '';

const cases = new Map<string, Case>();
for (const line of lines.slice(1)) {
  const f = splitCsvLine(line);
  const key = `${col(f, 'suite')}/${col(f, 'case')}`;
  if (!cases.has(key)) {
    cases.set(key, {
      suite: col(f, 'suite'),
      name: col(f, 'case'),
      input: unescapeCell(col(f, 'input')),
      expected: [],
    });
  }
  if (col(f, 'index') === '') continue;                    // the "no tokens expected" marker row
  cases.get(key)!.expected.push({
    index: Number(col(f, 'index')),
    type: col(f, 'type'),
    subType: col(f, 'sub_type'),
    value: unescapeCell(col(f, 'value')),
    token: unescapeCell(col(f, 'token')),
    errorCode: col(f, 'error_code'),
  });
}

/**
 * A token as the corpus spells it: every field is text, so any language can compare.
 *
 * The `type` column says how to read `value` — for BINARY it is the base64 text, and for ERROR it
 * is empty because the code belongs in `error_code`. This implementation happens to carry an error
 * payload inside `value`, which is a detail of THIS library and not something the corpus asserts.
 */
function actualFields(t: any): Omit<Expected, 'index'> {
  const raw = t?.value;
  const errorCode = t?.errorCode ?? raw?.errorCode ?? '';

  let value = '';
  if (raw instanceof Uint8Array) value = Buffer.from(raw).toString('base64');
  else if (raw !== undefined && raw !== null && typeof raw !== 'object') value = String(raw);

  return {
    type: String(t?.type ?? ''),
    subType: String(t?.subType ?? ''),
    value,
    token: String(t?.token ?? ''),
    errorCode: String(errorCode),
  };
}

let pass = 0;
let fail = 0;

for (const c of cases.values()) {
  let actual: any[] = [];
  try {
    actual = new Tokenizer(c.input).tokenize() as any[];
  } catch (e: any) {
    // A tokenizer that THROWS where the corpus expects an ERROR token is a real difference.
    actual = [{ type: 'THROW', errorCode: e?.errorCode ?? String(e?.message ?? e) }];
  }

  const problems: string[] = [];
  if (actual.length !== c.expected.length) {
    problems.push(`token count: expected ${c.expected.length}, got ${actual.length}`);
  }
  for (let i = 0; i < Math.max(actual.length, c.expected.length); i++) {
    const want = c.expected[i];
    const got = actual[i] ? actualFields(actual[i]) : undefined;
    if (!want || !got) continue;                            // already reported by the count check
    for (const key of ['type', 'subType', 'value', 'token', 'errorCode'] as const) {
      if (want[key] !== got[key]) {
        problems.push(`[${i}].${key}: expected ${JSON.stringify(want[key])}, got ${JSON.stringify(got[key])}`);
      }
    }
  }

  if (problems.length === 0) { pass++; continue; }
  fail++;
  console.log(`FAIL ${c.suite}/${c.name}   input=${JSON.stringify(c.input)}`);
  for (const p of problems) console.log(`   ${p}`);
}

console.log(`\n${FILE}: ${pass} passed, ${fail} failed (${cases.size} cases)`);
process.exit(fail > 0 ? 1 : 0);
