import { readFileSync } from 'fs';
import parse from '../../src/parser/index';
import parseSchema from '../../src/schema/parse-schema';
import { createStreamReader } from '../../src/streaming';
import { stringifyDocument } from '../../src/facade/stringify-document';

/**
 * The conformance corpus runner — the single implementation of "what does this case assert, and
 * does the reference implementation satisfy it".
 *
 * Two things drive it and they MUST NOT drift apart:
 *
 *   tools/corpus/verify.ts        a CLI, for running a subset while working
 *   tests/conformance/corpus…     a vitest suite, so `npm test` fails when the corpus does
 *
 * Before the vitest suite existed, the corpus was checked only when somebody remembered to run a
 * script. That is how 85 cases in `schema/` and `streaming/` sat unexecuted for months, and how
 * two real defects and thirteen stale error codes survived inside them. A conformance corpus that
 * is not part of the test suite is documentation, not a gate.
 *
 * ---------------------------------------------------------------------------------------------
 * THE FIVE KINDS
 *
 * A case does not declare its kind: a tokenizer case and a parser case are both
 * `{ name, input, expected }`. Kind is taken from the suite DIRECTORY, which is a corpus gap
 * worth closing one day — a case should say what it is rather than have every runner, in every
 * language, infer it from a path.
 *
 *   parse       parser/, regression/,   `input` is a whole document -> compare the decoded value
 *               document/
 *   validation  validation/             `schema` + `input` -> compose `~ $schema: { … }` + input
 *   schemaDef   schema/                 compile a schema string -> compare the shape by SUBSET
 *   roundtrip   serializer/             parse -> write -> compare text, value and idempotence
 *   stream      streaming/              compare emitted stream ITEMS ({ items, fatal })
 *   tokens      tokenizer/              compare the TOKEN STREAM
 *
 * `tokens` is the one kind not run from `.io`: those suites express their data using the very
 * syntax under test, so a port cannot read them until it already has a working tokenizer. They
 * run instead against the generated `bootstrap/tokenizer.csv` (`npm run corpus:tokens`), which is
 * the same cases in a format every language opens with no dependencies.
 *
 * Values are compared against `toObject()`, reduced to the corpus's neutral spellings: a binary is
 * a byte array, a decimal its digits, a bigint a tagged string (JSON cannot hold one). A
 * cross-language runner maps its own native types onto those same spellings.
 */

export type Kind = 'parse' | 'validation' | 'schemaDef' | 'tokens' | 'stream' | 'roundtrip';

/** Which comparator a suite needs. Taken from the path because nothing in a case says so. */
export function kindOf(file: string): Kind {
  const path = file.replace(/\\/g, '/');
  if (path.includes('/tokenizer/')) return 'tokens';
  if (path.includes('/streaming/')) return 'stream';
  if (path.includes('/schema/')) return 'schemaDef';
  if (path.includes('/validation/')) return 'validation';
  if (path.includes('/serializer/')) return 'roundtrip';
  return 'parse';
}

/**
 * Files that live in the corpus, end in `.io`, and are NOT suites.
 *
 * `catalog.io` is the generated index: one row per suite file, carrying counts rather than cases.
 * A walker that picks it up reports eighty rows with no `input` and calls them inert, which is
 * true and useless. Kept as a list rather than a path check so the reason stays written down.
 */
const NON_SUITE_FILES: ReadonlySet<string> = new Set(['catalog.io']);

/** True when a path is a runnable suite rather than corpus bookkeeping. */
export function isSuiteFile(file: string): boolean {
  const name = file.replace(/\\/g, '/').split('/').pop() ?? '';
  return name.endsWith('.io') && !NON_SUITE_FILES.has(name);
}

/** Kinds this runner executes. */
export const SUPPORTED: ReadonlySet<Kind> = new Set<Kind>(
  ['parse', 'validation', 'roundtrip', 'schemaDef', 'stream']);

/** Kinds executed by a different runner — covered, not unchecked. */
export const ELSEWHERE: ReadonlyMap<Kind, string> = new Map<Kind, string>([
  ['tokens', 'npm run corpus:tokens'],
]);

/** Reduce a value to the corpus's neutral spelling so two languages can be compared at all. */
export function norm(v: any): any {
  if (typeof v === 'bigint') return `#big:${v}`;
  if (v === null || typeof v !== 'object') return v === undefined ? null : v;
  if (v instanceof Uint8Array) return [...v];               // binary -> byte array
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(norm);
  // A Decimal must be caught BEFORE the generic object branch, or it flattens into its internals
  // ({ coefficient, exponent, … }). The corpus spells a decimal as its digits.
  if (v.constructor?.name === 'Decimal') return String(v);
  // Object keys are SORTED before comparison, because key order in a projected value is a
  // host-language artifact and not part of the format. JavaScript orders integer-like keys first,
  // so `a: 1, 2` projects as {"1":…, "a":…}; a port whose map preserves insertion order projects
  // {"a":…, "1":…}. Both are the same value, and a corpus that failed one of them would be
  // asserting JavaScript rather than Internet Object.
  //
  // Nothing is lost. A positional member carries its index IN its key ("0", "1", …), so ordinal
  // identity survives sorting; and where the ORDER of members is genuinely semantic — what a
  // writer must emit — it is asserted as TEXT by the `serializer/` suite, and as an ordered
  // `members` list by `schema/`.
  const out: Record<string, any> = {};
  for (const k of Object.keys(v).sort()) out[k] = norm(v[k]);
  return out;
}

export const show = (v: any) => JSON.stringify(norm(v));

// ---------------------------------------------------------------------------------------------
// SUBSET matching, used by the schemaDef comparator.
//
// A compiled schema carries bookkeeping a port has no reason to reproduce — the reference implementation puts
// `format: "auto"`, `encloser` and `escapeLines: false` on every string memberdef, and spells
// `optional: false` where the corpus simply omits it. So schema/README.md fixes matching as
// SUBSET/contains: every key the case LISTS must be present and equal, and anything else is the
// implementation's business. Order, by contrast, IS asserted — `members` is a list, not a set.
// ---------------------------------------------------------------------------------------------

/** Collect every place `actual` fails to contain `expected`. Empty result = match. */
export function subsetMismatches(expected: any, actual: any, at: string, out: string[]): string[] {
  if (expected === null || typeof expected !== 'object') {
    if (show(expected) !== show(actual)) {
      out.push(`${at}: expected=${show(expected)} actual=${show(actual)}`);
    }
    return out;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      out.push(`${at}: expected a list of ${expected.length}, actual=${show(actual)}`);
      return out;
    }
    // Length IS asserted: a schema with an extra member is a different schema, not a superset.
    if (expected.length !== actual.length) {
      out.push(`${at}: expected ${expected.length} entries, actual ${actual.length}`);
    }
    for (let i = 0; i < expected.length; i++) {
      subsetMismatches(expected[i], actual?.[i], `${at}[${i}]`, out);
    }
    return out;
  }
  if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) {
    out.push(`${at}: expected an object, actual=${show(actual)}`);
    return out;
  }
  for (const k of Object.keys(expected)) {
    subsetMismatches(expected[k], actual[k], at ? `${at}.${k}` : k, out);
  }
  return out;
}

/**
 * Project a compiled schema onto the corpus's neutral shape: an ORDERED `members` list plus
 * `open`. the reference implementation holds members as `names` (order) + `defs` (lookup); every implementation will
 * hold them differently, and the corpus should not have to care which.
 */
export function projectSchema(schema: any): any {
  if (schema === null || typeof schema !== 'object') return schema;
  const names: string[] = schema.names ?? [];
  const members = names.map((n: string) => projectMemberDef(schema.defs?.[n]));
  const typedOpen = schema.open !== null && typeof schema.open === 'object';

  // The additional-property def is a MEMBER named `*` in the corpus's encoding, in last position
  // (schema/README.md). the reference implementation keeps it only under `open` and out of `names`, so it is appended
  // here rather than asserted away — a bare `*` sets `open: true` and adds no member, and a typed
  // `*: string` sets `open` to the def AND appears as the final member.
  //
  // `name` comes from the KEY a def sits under, not from the def itself, so supplying it here is
  // projection rather than masking: no implementation state is hidden, and a port that keeps its
  // members in a plain map does exactly the same.
  if (typedOpen && !names.includes('*')) {
    members.push({ name: '*', ...projectMemberDef(schema.open) });
  }

  return {
    open: typedOpen ? projectMemberDef(schema.open) : schema.open,
    members,
  };
}

/** Project one memberdef, recursing through the two structural links: `schema` and `of`. */
export function projectMemberDef(md: any): any {
  if (md === null || typeof md !== 'object') return md;
  const out: Record<string, any> = {};
  for (const k of Object.keys(md)) {
    if (k === 'schema') { out.schema = projectSchema(md.schema); continue; }
    if (k === 'of') { out.of = projectMemberDef(md.of); continue; }
    out[k] = md[k];
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// STREAM comparator support.
//
// Mirrors src/streaming/conformance.test.ts, which runs the same protocol against JSON fixtures.
// Two deliberate differences, both required by streaming/README.md:
//   * the corpus stores `schemaName` SIGIL-STRIPPED (a `$`-leading value is unrepresentable in
//     .io data — it resolves as a schema reference, FINDINGS #3), so `$` is prepended here;
//   * every case runs under THREE chunkings and all three must agree. Chunk boundaries are not
//     semantic, so a case that passes whole but fails per-byte is a real defect, not a flake.
// ---------------------------------------------------------------------------------------------

export type Chunking = 'whole' | 'per-line' | 'per-byte';
export const CHUNKINGS: readonly Chunking[] = ['whole', 'per-line', 'per-byte'];

function* chunksFor(strategy: Chunking, input: string): Generator<string | Uint8Array> {
  if (strategy === 'whole') { if (input) yield input; return; }
  if (strategy === 'per-line') {
    for (const part of input.split(/(?<=\n)/)) if (part) yield part;
    return;
  }
  for (const b of new TextEncoder().encode(input)) yield new Uint8Array([b]);
}

async function* asyncChunks(strategy: Chunking, input: string) {
  for (const c of chunksFor(strategy, input)) yield c;
}

/** The wire category, derived from the core error CLASS — never from the code's grouping. */
function streamCategory(e: any): string {
  const n = String(e?.name ?? e?.constructor?.name ?? '');
  if (n.includes('SyntaxError')) return 'syntax';
  if (n.includes('ValidationError')) return 'validation';
  if (n.includes('Stream')) return 'stream';
  return 'general';
}

function dropUndefined<T extends Record<string, any>>(o: T): T {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return o;
}

/** Definitions preloaded before any stream bytes, authored as header text. */
function buildDefs(defText: string | null | undefined): any {
  if (!defText) return null;
  const doc: any = parse(String(defText).trimEnd() + '\n---\n', null);
  return doc.header?.definitions ?? null;
}

async function runStreamCase(row: any, strategy: Chunking) {
  const opts: any = {};
  if (row.defaultSchema) opts.defaultSchema = `$${row.defaultSchema}`;
  const input: string = row.input ?? '';
  const source: any = strategy === 'whole' ? input : asyncChunks(strategy, input);
  const reader = createStreamReader(source, buildDefs(row.definitions), opts);

  const items: any[] = [];
  let fatal: any = null;
  try {
    for await (const it of reader as any) {
      const recordIndex = it.recordIndex ?? it.index;
      items.push(it.error
        ? dropUndefined({
            kind: 'record-error', recordIndex, schemaName: it.schemaName ?? undefined,
            error: { category: streamCategory(it.error), code: it.error.errorCode },
          })
        : dropUndefined({
            kind: 'record', recordIndex, schemaName: it.schemaName ?? undefined,
            value: it.data?.toJSON?.() ?? it.data,
          }));
    }
  } catch (e: any) {
    fatal = { category: streamCategory(e), code: e?.errorCode ?? null };
  }
  return { items, fatal };
}

/** The case's `expected`, with the `$` sigil restored on every stored schema name. */
function expectedStream(expected: any) {
  const sigil = (n: any) => (n === undefined || n === null ? undefined : `$${n}`);
  const items = (expected?.items ?? []).map((i: any) => i.kind === 'record-error'
    ? dropUndefined({
        kind: 'record-error', recordIndex: i.recordIndex, schemaName: sigil(i.schemaName),
        error: { category: i.error?.category, code: i.error?.code },
      })
    : dropUndefined({
        kind: 'record', recordIndex: i.recordIndex, schemaName: sigil(i.schemaName),
        value: i.value,
      }));
  const f = expected?.fatal;
  return { items, fatal: f ? { category: f.category, code: f.code } : null };
}

// ---------------------------------------------------------------------------------------------
// Running a file
// ---------------------------------------------------------------------------------------------

export interface CaseResult {
  name: string;
  /** Empty when the case passed. */
  problems: string[];
}

export interface FileResult {
  file: string;
  kind: Kind;
  /** Set when the SUITE FILE itself is unusable; `cases` is then empty. */
  suiteError?: string;
  /** 'run' — executed here; 'elsewhere' — another runner covers it; 'none' — unchecked. */
  coverage: 'run' | 'elsewhere' | 'none';
  /** Where an unrun file is executed instead. */
  via?: string;
  cases: CaseResult[];
  /** Cases with nothing runnable (no `input`/`schemaDef`). */
  inert: number;
  /** Total rows in the file, including inert and unrun ones. */
  rowCount: number;
}

/** Read a suite file and return its rows, or the reason it could not be read. */
function readRows(file: string): { rows: any[]; error?: string } {
  let doc: any;
  try {
    doc = parse(readFileSync(file, 'utf8'), null);
  } catch (e: any) {
    return { rows: [], error: `the suite file itself threw: ${e?.errorCode ?? e?.message ?? e}` };
  }
  const suiteErrors = doc.getErrors?.() ?? [];
  if (suiteErrors.length > 0) {
    return {
      rows: [],
      error: `the suite file itself does not parse: ${suiteErrors.map((e: any) => e.errorCode).join(', ')}`,
    };
  }
  const projected: any = doc.toObject();
  return { rows: Array.isArray(projected) ? projected : (projected?.data ?? []) };
}

/** Run every case in one suite file. */
export async function runFile(file: string): Promise<FileResult> {
  const kind = kindOf(file);
  const { rows, error } = readRows(file);
  if (error) {
    return { file, kind, suiteError: error, coverage: 'run', cases: [], inert: 0, rowCount: 0 };
  }

  if (!SUPPORTED.has(kind)) {
    const via = ELSEWHERE.get(kind);
    return {
      file, kind, coverage: via ? 'elsewhere' : 'none', via,
      cases: [], inert: 0, rowCount: rows.length,
    };
  }

  const cases: CaseResult[] = [];
  let inert = 0;

  for (const row of rows) {
    // A schemaDef case carries `schemaDef`, not `input`; every other kind needs `input`.
    const missingSubject = kind === 'schemaDef' ? row.schemaDef === undefined : row.input === undefined;
    if (missingSubject) { inert++; continue; }
    cases.push({ name: row.name, problems: await runCase(kind, row) });
  }

  return { file, kind, coverage: 'run', cases, inert, rowCount: rows.length };
}

/** Run one case. Returns the problems found; empty means it passed. */
export async function runCase(kind: Kind, row: any): Promise<string[]> {
  if (kind === 'roundtrip') return roundtripCase(row);
  if (kind === 'schemaDef') return schemaDefCase(row);
  if (kind === 'stream') return streamCase(row);
  return valueCase(row);
}

/**
 * Three properties per roundtrip case, because each catches what the others cannot: canonical
 * OUTPUT (two conforming writers must agree on spelling), VALUE preservation (a writer that loses
 * data raises no error), and IDEMPOTENCE (text that drifts on every rewrite, as `{}` -> `{*}` did).
 */
function roundtripCase(row: any): string[] {
  const opts = { includeHeader: true, includeTypes: true };
  const problems: string[] = [];
  try {
    const doc: any = parse(row.input, null);
    const inErrs = (doc.getErrors?.() ?? []).map((e: any) => e.errorCode);
    if (inErrs.length > 0) problems.push(`input does not parse: ${inErrs.join(', ')}`);

    const produced = stringifyDocument(doc, opts);
    if (produced !== row.output) {
      problems.push(`output\n     expected=${JSON.stringify(row.output)}\n     actual  =${JSON.stringify(produced)}`);
    }

    const back: any = parse(produced, null);
    const backErrs = (back.getErrors?.() ?? []).map((e: any) => e.errorCode);
    if (backErrs.length > 0) problems.push(`output does not re-parse: ${backErrs.join(', ')}`);
    else if (show(doc.toObject()) !== show(back.toObject())) {
      problems.push(`value changed\n     in =${show(doc.toObject())}\n     out=${show(back.toObject())}`);
    } else if (stringifyDocument(back, opts) !== produced) {
      problems.push('not idempotent: a second write differs from the first');
    }
  } catch (e: any) {
    problems.push(`THREW ${e?.errorCode ?? e?.message ?? e}`);
  }
  return problems;
}

/**
 * Compile a schema DEFINITION STRING and compare the compiled shape. This is the stage between
 * parsing and validation, and the one a port is most likely to get subtly wrong: member ORDER, the
 * dotted `path` of a nested member, and which constraint keys survive compilation are all
 * invisible until something downstream depends on them.
 */
function schemaDefCase(row: any): string[] {
  let compiled: any = null;
  let codes: string[] = [];
  try {
    compiled = parseSchema(String(row.schemaDef), null);
  } catch (e: any) {
    // Schema compilation fails fast — one error, not an accumulated list.
    codes = [e?.errorCode ?? String(e?.message ?? e)];
  }

  const expectedCodes: string[] = row.error_codes ? [...row.error_codes] : [];
  if (JSON.stringify(codes) !== JSON.stringify(expectedCodes)) {
    return [`codes  expected=${JSON.stringify(expectedCodes)}  actual=${JSON.stringify(codes)}`];
  }
  // A case that expects an error asserts the CODE; there is no shape to compare.
  if (expectedCodes.length > 0) return [];

  const problems = subsetMismatches(row.expected, projectSchema(compiled), '', []);
  return problems.length ? [`schemaDef=${JSON.stringify(row.schemaDef)}`, ...problems] : [];
}

/**
 * Feed the input to a streaming reader under three chunkings. All three must produce the same
 * items, because transport chunk boundaries carry no meaning: a reader that splits a record on a
 * buffer edge is broken even if it reads the whole input correctly.
 */
async function streamCase(row: any): Promise<string[]> {
  const want = expectedStream(row.expected);
  const problems: string[] = [];
  for (const strategy of CHUNKINGS) {
    try {
      const got = await runStreamCase(row, strategy);
      if (show(got) !== show(want)) {
        problems.push(`[${strategy}]\n     expected=${show(want)}\n     actual  =${show(got)}`);
      }
    } catch (e: any) {
      problems.push(`[${strategy}] THREW ${e?.errorCode ?? e?.message ?? e}`);
    }
  }
  return problems;
}

/** `parse` and `validation`: decode a document (composing the schema for validation cases). */
function valueCase(row: any): string[] {
  // A validation case carries only a schema fragment and a data fragment; compose the document.
  const source: string = row.schema !== undefined
    ? `~ $schema: { ${row.schema} }\n---\n${row.input}\n`
    : row.input;

  let actual: any = null;
  let recoveredValue: any = null;
  let codes: string[] = [];
  try {
    const result: any = parse(source, null);
    codes = (result.getErrors?.() ?? []).map((e: any) => e.errorCode);
    // A case that expects errors asserts the CODES; its value is not meaningful UNLESS the case
    // also declares `recovered`, which is exactly the accumulate-and-continue promise.
    actual = codes.length > 0 ? null : result.toObject();
    recoveredValue = result.toObject();
  } catch (e: any) {
    codes = [e?.errorCode ?? String(e?.message ?? e)];
  }

  const expectedCodes: string[] = row.error_codes ? [...row.error_codes] : [];
  const problems: string[] = [];
  if (JSON.stringify(codes) !== JSON.stringify(expectedCodes)) {
    problems.push(`codes  expected=${JSON.stringify(expectedCodes)}  actual=${JSON.stringify(codes)}`);
  }
  if (expectedCodes.length === 0 && show(actual) !== show(row.expected)) {
    problems.push(`value  expected=${show(row.expected)}\n          actual  =${show(actual)}`);
  }

  // RECOVERED: what the document still loads to DESPITE the errors.
  //
  // Error accumulation is a normative promise {EM} "the loaded result includes the records that
  // succeeded" {EM} and it was untestable here, because a row carried either a value or codes and
  // never both. So a suite could assert that duplicate section names report
  // `duplicate-section-name`, but not that the sections are still all present and correctly
  // renamed, which is the part a recovering parser is most likely to get wrong.
  //
  // `recovered` is separate from `expected` rather than a relaxation of it: `expected` means "no
  // errors, and this value", `recovered` means "these errors, AND this value survived".
  if (row.recovered !== undefined && show(recoveredValue) !== show(row.recovered)) {
    problems.push(`recovered  expected=${show(row.recovered)}\n              actual  =${show(recoveredValue)}`);
  }
  return problems;
}
