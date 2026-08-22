import { readFileSync } from 'fs';
import parse from '../../src/parser/index';
import parseSchema from '../../src/schema/parse-schema';
import { createStreamReader } from '../../src/streaming';
import { stringifyDocument } from '../../src/facade/stringify-document';

/**
 * Corpus verifier — runs the language-independent conformance corpus (io-test-cases) against this
 * implementation. FINALIZATION-TRACKER 1P.6, first cut.
 *
 * Usage:
 *   npm run corpus -- ../io-test-cases/validation/*.io
 *   npx tsx tools/corpus/verify.ts <file.io> [...]
 *
 * Until this existed the corpus was not executed by anything: hundreds of cases asserting
 * behaviour that nothing checked. Its first run found a real drift — `parser/errors.io` still
 * expected `unexpected-token` for duplicate sections, which io-js2 0.3.0 renamed to
 * `duplicate-section-name` — and cleared a previously suspected one that turned out to be a
 * hand-checking mistake.
 *
 * The corpus holds FIVE kinds of assertion, and a case does not say which kind it is: a tokenizer
 * case and a parser case are both `{ name, input, expected }`. Kind is therefore taken from the
 * suite's DIRECTORY, which is a corpus gap worth closing — a case should declare its own kind
 * rather than have every runner, in every language, infer it from a path.
 *
 *   parse       parser/, regression/  `input` is a whole document → compare the decoded value
 *   validation  validation/           `schema` + `input` → compose `~ $schema: { … }` + input
 *   schemaDef   schema/               compile a schema string → compare the shape by SUBSET
 *   tokens      tokenizer/            compare the TOKEN STREAM, not a decoded value
 *   stream      streaming/            compare emitted stream ITEMS ({ items, fatal })
 *
 * All but `tokens` are implemented here. `tokens` is executed against the generated bootstrap CSV
 * instead (`npm run corpus:tokens`), because the .io tokenizer suites express their data using the
 * very syntax under test.
 *
 * `schemaDef` and `stream` were reported as SKIPPED until 2026-08-22 — 85 cases asserting
 * behaviour that nothing checked, which is the same hole this runner was written to close for the
 * other suites. Both now run.
 *
 * Values are compared against `toObject()`, which keeps them live, reduced to the corpus's neutral
 * spellings: a binary is a byte array, a decimal its digits, a bigint a tagged string (JSON cannot
 * hold one). A cross-language runner maps its own native types onto those same spellings.
 */

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: tsx tools/corpus/verify.ts <file.io> [...]');
  process.exit(2);
}

type Kind = 'parse' | 'validation' | 'schemaDef' | 'tokens' | 'stream' | 'roundtrip';

/** Which comparator a suite needs. Taken from the path because nothing in a case says so. */
function kindOf(file: string): Kind {
  const path = file.replace(/\\/g, '/');
  if (path.includes('/tokenizer/')) return 'tokens';
  if (path.includes('/streaming/')) return 'stream';
  if (path.includes('/schema/')) return 'schemaDef';
  if (path.includes('/validation/')) return 'validation';
  if (path.includes('/serializer/')) return 'roundtrip';
  return 'parse';
}

// `tokens` has a comparator, but it runs against the BOOTSTRAP CSV rather than the .io source --
// the .io tokenizer suites express their data with the very syntax under test. See
// tools/corpus/verify-bootstrap.ts, run by `npm run corpus:tokens`.
const SUPPORTED: ReadonlySet<Kind> = new Set<Kind>(
  ['parse', 'validation', 'roundtrip', 'schemaDef', 'stream']);
const ELSEWHERE: ReadonlyMap<Kind, string> = new Map<Kind, string>([
  ['tokens', 'npm run corpus:tokens'],
]);

/** Reduce a value to the corpus's neutral spelling so two languages can be compared at all. */
function norm(v: any): any {
  if (typeof v === 'bigint') return `#big:${v}`;
  if (v === null || typeof v !== 'object') return v === undefined ? null : v;
  if (v instanceof Uint8Array) return [...v];               // binary → byte array
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(norm);
  // A Decimal must be caught BEFORE the generic object branch, or it flattens into its internals
  // ({ coefficient, exponent, … }). The corpus spells a decimal as its digits.
  if (v.constructor?.name === 'Decimal') return String(v);
  const out: Record<string, any> = {};
  for (const k of Object.keys(v)) out[k] = norm(v[k]);
  return out;
}

const show = (v: any) => JSON.stringify(norm(v));

// ---------------------------------------------------------------------------------------------
// SUBSET matching, used by the schemaDef comparator.
//
// A compiled schema carries bookkeeping a port has no reason to reproduce — io-js2 puts
// `format: "auto"`, `encloser` and `escapeLines: false` on every string memberdef, and spells
// `optional: false` where the corpus simply omits it. So schema/README.md fixes matching as
// SUBSET/contains: every key the case LISTS must be present and equal, and anything else is the
// implementation's business. Order, by contrast, IS asserted — `members` is a list, not a set.
// ---------------------------------------------------------------------------------------------

/** Collect every place `actual` fails to contain `expected`. Empty result = match. */
function subsetMismatches(expected: any, actual: any, at: string, out: string[]): string[] {
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
 * `open`. io-js2 holds members as `names` (order) + `defs` (lookup); every implementation will
 * hold them differently, and the corpus should not have to care which.
 */
function projectSchema(schema: any): any {
  if (schema === null || typeof schema !== 'object') return schema;
  const names: string[] = schema.names ?? [];
  const members = names.map((n: string) => projectMemberDef(schema.defs?.[n]));
  const typedOpen = schema.open !== null && typeof schema.open === 'object';

  // The additional-property def is a MEMBER named `*` in the corpus's encoding, in last position
  // (schema/README.md). io-js2 keeps it only under `open` and out of `names`, so it is appended
  // here rather than asserted away — a bare `*` sets `open: true` and adds no member, and a
  // typed `*: string` sets `open` to the def AND appears as the final member.
  // `name` comes from the KEY a def sits under, not from the def itself: io-js2 stores members
  // in `defs` by name and the additional-props def under `open`, so its name is `*` by
  // construction. Supplying it here is projection, not masking — no implementation state is
  // being hidden, and a port that keeps its members in a plain map does exactly the same.
  if (typedOpen && !names.includes('*')) {
    members.push({ name: '*', ...projectMemberDef(schema.open) });
  }

  return {
    open: typedOpen ? projectMemberDef(schema.open) : schema.open,
    members,
  };
}

/** Project one memberdef, recursing through the two structural links: `schema` and `of`. */
function projectMemberDef(md: any): any {
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

type Chunking = 'whole' | 'per-line' | 'per-byte';
const CHUNKINGS: readonly Chunking[] = ['whole', 'per-line', 'per-byte'];

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

let pass = 0;
let fail = 0;
let skipped = 0;      // no `input`/`schemaDef` — the case asserts nothing runnable
let elsewhere = 0;    // executed by another runner, NOT unchecked

for (const file of files) {
  const kind = kindOf(file);
  const doc: any = parse(readFileSync(file, 'utf8'), null);

  const suiteErrors = doc.getErrors?.() ?? [];
  if (suiteErrors.length > 0) {
    console.log(`FAIL ${file} — the suite file itself does not parse: ` +
      suiteErrors.map((e: any) => e.errorCode).join(', '));
    fail++;
    continue;
  }

  const projected: any = doc.toObject();
  const rows: any[] = Array.isArray(projected) ? projected : (projected?.data ?? []);

  if (!SUPPORTED.has(kind)) {
    const via = ELSEWHERE.get(kind);
    if (via) elsewhere += rows.length; else skipped += rows.length;
    console.log(`skip ${file.padEnd(52)} ${String(rows.length).padStart(3)} cases — ` +
      (via ? `run by \`${via}\`` : `NO '${kind}' COMPARATOR — unchecked`));
    continue;
  }

  let suitePass = 0;
  let suiteFail = 0;
  let suiteSkipped = 0;

  for (const row of rows) {
    // A schemaDef case carries `schemaDef`, not `input`; every other kind needs `input`.
    const missingSubject = kind === 'schemaDef' ? row.schemaDef === undefined : row.input === undefined;
    if (missingSubject) { suiteSkipped++; skipped++; continue; }

    // ---- schemaDef ---------------------------------------------------------------------------
    // Compile a schema DEFINITION STRING and compare the compiled shape. This is the stage between
    // parsing and validation, and it is the one a port is most likely to get subtly wrong: member
    // ORDER, the dotted `path` of a nested member, and which constraint keys survive compilation
    // are all invisible until something downstream depends on them.
    if (kind === 'schemaDef') {
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
        fail++; suiteFail++;
        console.log(`FAIL ${file} :: ${row.name}`);
        console.log(`   codes  expected=${JSON.stringify(expectedCodes)}  actual=${JSON.stringify(codes)}`);
        continue;
      }
      // A case that expects an error asserts the CODE; there is no shape to compare.
      if (expectedCodes.length > 0) { pass++; suitePass++; continue; }

      const problems = subsetMismatches(row.expected, projectSchema(compiled), '', []);
      if (problems.length === 0) { pass++; suitePass++; continue; }
      fail++; suiteFail++;
      console.log(`FAIL ${file} :: ${row.name}`);
      console.log(`   schemaDef=${JSON.stringify(row.schemaDef)}`);
      for (const pr of problems) console.log(`   ${pr}`);
      continue;
    }

    // ---- stream ------------------------------------------------------------------------------
    // Feed the input to a streaming reader under three chunkings. All three must produce the same
    // items, because transport chunk boundaries carry no meaning: a reader that splits a record on
    // a buffer edge is broken even if it reads the whole input correctly.
    if (kind === 'stream') {
      const want = expectedStream(row.expected);
      const problems: string[] = [];
      for (const strategy of CHUNKINGS) {
        try {
          const got = await runStreamCase(row, strategy);
          if (show(got) !== show(want)) {
            problems.push(`[${strategy}]
     expected=${show(want)}
     actual  =${show(got)}`);
          }
        } catch (e: any) {
          problems.push(`[${strategy}] THREW ${e?.errorCode ?? e?.message ?? e}`);
        }
      }
      if (problems.length === 0) { pass++; suitePass++; continue; }
      fail++; suiteFail++;
      console.log(`FAIL ${file} :: ${row.name}`);
      for (const pr of problems) console.log(`   ${pr}`);
      continue;
    }

    // ---- roundtrip -----------------------------------------------------------------------------
    // Three properties per case, because each catches what the others cannot: canonical OUTPUT
    // (two conforming writers must agree on spelling), VALUE preservation (a writer that loses data
    // raises no error), and IDEMPOTENCE (text that drifts on every rewrite, as `{}` -> `{*}` did).
    if (kind === 'roundtrip') {
      const opts = { includeHeader: true, includeTypes: true };
      const problems: string[] = [];
      try {
        const doc: any = parse(row.input, null);
        const inErrs = (doc.getErrors?.() ?? []).map((e: any) => e.errorCode);
        if (inErrs.length > 0) problems.push(`input does not parse: ${inErrs.join(', ')}`);

        const produced = stringifyDocument(doc, opts);
        if (produced !== row.output) {
          problems.push(`output
     expected=${JSON.stringify(row.output)}
     actual  =${JSON.stringify(produced)}`);
        }

        const back: any = parse(produced, null);
        const backErrs = (back.getErrors?.() ?? []).map((e: any) => e.errorCode);
        if (backErrs.length > 0) problems.push(`output does not re-parse: ${backErrs.join(', ')}`);
        else if (show(doc.toObject()) !== show(back.toObject())) {
          problems.push(`value changed
     in =${show(doc.toObject())}
     out=${show(back.toObject())}`);
        } else if (stringifyDocument(back, opts) !== produced) {
          problems.push('not idempotent: a second write differs from the first');
        }
      } catch (e: any) {
        problems.push(`THREW ${e?.errorCode ?? e?.message ?? e}`);
      }

      if (problems.length === 0) { pass++; suitePass++; continue; }
      fail++; suiteFail++;
      console.log(`FAIL ${file} :: ${row.name}`);
      for (const p of problems) console.log(`   ${p}`);
      continue;
    }

    // A validation case carries only a schema fragment and a data fragment; compose the document.
    const source: string = row.schema !== undefined
      ? `~ $schema: { ${row.schema} }\n---\n${row.input}\n`
      : row.input;

    let actual: any = null;
    let codes: string[] = [];
    try {
      const result: any = parse(source, null);
      codes = (result.getErrors?.() ?? []).map((e: any) => e.errorCode);
      // A case that expects errors asserts the CODES; its value is not meaningful.
      actual = codes.length > 0 ? null : result.toObject();
    } catch (e: any) {
      codes = [e?.errorCode ?? String(e?.message ?? e)];
    }

    const expectedCodes: string[] = row.error_codes ? [...row.error_codes] : [];
    const codesMatch = JSON.stringify(codes) === JSON.stringify(expectedCodes);
    const valueMatch = expectedCodes.length > 0 || show(actual) === show(row.expected);

    if (codesMatch && valueMatch) {
      pass++; suitePass++;
      continue;
    }

    fail++; suiteFail++;
    console.log(`FAIL ${file} :: ${row.name}`);
    if (!codesMatch) {
      console.log(`   codes  expected=${JSON.stringify(expectedCodes)}  actual=${JSON.stringify(codes)}`);
    }
    if (!valueMatch) {
      console.log(`   value  expected=${show(row.expected)}`);
      console.log(`          actual  =${show(actual)}`);
    }
  }

  const tag = suiteFail > 0 ? 'FAIL' : ' ok ';
  const note = suiteSkipped > 0 ? `, ${suiteSkipped} skipped` : '';
  console.log(`${tag} ${file.padEnd(52)} ${String(suitePass).padStart(3)} passed, ${suiteFail} failed${note}`);
}

// Report the two non-run reasons apart. A case run by another runner is COVERED; a case with no
// comparator is not, and folding them together is how 85 unchecked cases sat behind a "63%" that
// read like ordinary partial coverage.
const total = pass + fail + skipped + elsewhere;
const covered = pass + fail + elsewhere;
const parts = [`${pass} passed`, `${fail} failed`];
if (elsewhere > 0) parts.push(`${elsewhere} run by another runner`);
if (skipped > 0) parts.push(`${skipped} UNCHECKED`);
console.log(`\n${files.length} suite(s): ${parts.join(', ')} ` +
  `— ${covered} of ${total} cases covered (${Math.round((covered / total) * 100)}%)`);
process.exit(fail > 0 ? 1 : 0);
