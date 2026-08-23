import { readFileSync } from 'fs';
import { corpusPath } from './sibling-repos'
import Tokenizer from '../../src/parser/tokenizer/index';

/**
 * The `tokens` comparator — the bootstrap CSV corpus, run against this tokenizer.
 *
 * It deliberately reads the CSV rather than the `.io` source. Doing so proves the generated file is
 * FAITHFUL, and it is the same path a fresh Go or Rust port takes on day one: a port that
 * reproduces this file's logic — about eighty lines, of which the CSV reader and the unescaper are
 * half — has a working conformance harness before it has a parser.
 *
 * The tokenizer suites are unexecutable from `.io` for a reason worth keeping in mind: their test
 * data is expressed with the raw strings, regular strings and escapes the tokenizer itself is under
 * test for. Reading them requires the thing being tested.
 *
 *   npm run corpus:bootstrap        regenerate ../io-test-cases/bootstrap/tokenizer.csv
 *   npm run corpus:tokens           run it against this tokenizer (CLI)
 *   npm test                        runs it too, via tests/conformance/bootstrap.test.ts
 *
 * Shared by the CLI and the vitest suite, so the two cannot disagree about what passing means.
 */

const BACKSLASH = String.fromCharCode(92);

export const DEFAULT_CSV = corpusPath('bootstrap', 'tokenizer.csv') ?? '';

/** Split one CSV line into fields. RFC 4180: quoted fields, `""` for a literal quote. */
export function splitCsvLine(line: string): string[] {
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
export function unescapeCell(cell: string): string {
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

export interface ExpectedToken {
  index: number; type: string; subType: string; value: string; token: string; errorCode: string;
}
export interface TokenCase {
  suite: string; name: string; input: string; expected: ExpectedToken[];
}

/** Parse the CSV into one case per (suite, case), each holding its ordered expected tokens. */
export function loadCases(file: string = DEFAULT_CSV): TokenCase[] {
  const lines = readFileSync(file, 'utf8').split('\n').filter(l => l.length > 0);
  const header = splitCsvLine(lines[0]);
  const col = (fields: string[], name: string) => fields[header.indexOf(name)] ?? '';

  const cases = new Map<string, TokenCase>();
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
    if (col(f, 'index') === '') continue;                  // the "no tokens expected" marker row
    cases.get(key)!.expected.push({
      index: Number(col(f, 'index')),
      type: col(f, 'type'),
      subType: col(f, 'sub_type'),
      value: unescapeCell(col(f, 'value')),
      token: unescapeCell(col(f, 'token')),
      errorCode: col(f, 'error_code'),
    });
  }
  return [...cases.values()];
}

/**
 * A token as the corpus spells it: every field is text, so any language can compare.
 *
 * The `type` column says how to read `value` — for BINARY it is the base64 text, and for ERROR it
 * is empty because the code belongs in `error_code`. This implementation happens to carry an error
 * payload inside `value`, which is a detail of THIS library and not something the corpus asserts.
 */
function actualFields(t: any): Omit<ExpectedToken, 'index'> {
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

/** Run one case. Returns the problems found; empty means it passed. */
export function runTokenCase(c: TokenCase): string[] {
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
    if (!want || !got) continue;                           // already reported by the count check
    for (const key of ['type', 'subType', 'value', 'token', 'errorCode'] as const) {
      if (want[key] !== got[key]) {
        problems.push(`[${i}].${key}: expected ${JSON.stringify(want[key])}, got ${JSON.stringify(got[key])}`);
      }
    }
  }
  return problems;
}
