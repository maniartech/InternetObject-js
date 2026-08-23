import { writeFileSync, mkdirSync } from 'fs';
import parse from '../../src/parser/index';
import { createStreamReader } from '../../src/streaming';

/**
 * Generate `streaming/*.io` corpus suites, deriving every item sequence by RUNNING io-js2.
 *
 *   npx tsx tools/corpus/suites-stream.ts
 *
 * A streaming case feeds `input` to a reader and asserts the ordered `items` it emits plus the
 * terminal `fatal`. The generator runs each case under THREE chunkings — whole, per-line, per-byte
 * — and refuses to emit a row whose three results disagree. Transport chunk boundaries carry no
 * meaning, so a case that behaves differently per-byte is a defect, and recording only the `whole`
 * result would hide it. That check is how ISSUE-26 stayed visible once found.
 *
 * Two conventions, both from streaming/README.md:
 *
 *   - `schemaName` is stored SIGIL-STRIPPED. The reader emits `$Person`; the corpus stores
 *     `Person`, because a `$`-leading value resolves as a schema reference when this .io file is
 *     itself read (FINDINGS #3). A runner prepends `$` before comparing.
 *   - `category` is derived from the core error CLASS — syntax / validation / general / stream —
 *     and NOT from the code's grouping in CONFORMANCE §5.1.
 */

interface StreamCase {
  name: string;
  input: string;
  /** Preloaded definitions, as header text (the text before a `---`). */
  definitions?: string;
  /** Fallback default-schema name, stored WITHOUT the `$`. */
  defaultSchema?: string;
  note?: string;
  group?: string;
  review?: string;
}

interface StreamSuite {
  file: string;
  description: string;
  header: string[];
  cases: StreamCase[];
}

const OUT_DIR = '../io-test-cases/streaming';
type Chunking = 'whole' | 'per-line' | 'per-byte';
const CHUNKINGS: Chunking[] = ['whole', 'per-line', 'per-byte'];

function ioText(s: string): string {
  const esc = s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
  return esc.includes('"') ? `'${esc.replace(/'/g, "\\'")}'` : `"${esc}"`;
}

const KEYWORDS = new Set(['null', 'N', 'T', 'F', 'true', 'false', 'NaN', 'Inf']);

function ioKey(k: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) && k !== 'null' ? k : JSON.stringify(k);
}

function ioLiteral(v: any): string {
  if (v === null || v === undefined) return 'N';
  if (typeof v === 'boolean') return v ? 'T' : 'F';
  if (typeof v === 'bigint') return `${v}n`;
  if (typeof v === 'number') {
    return Number.isFinite(v) ? String(v) : (Number.isNaN(v) ? 'NaN' : (v > 0 ? 'Inf' : '-Inf'));
  }
  if (v instanceof Uint8Array) return `b"${Buffer.from(v).toString('base64')}"`;
  if (v instanceof Date) return `dt"${v.toISOString()}"`;
  if (v?.constructor?.name === 'Decimal') return `${String(v)}m`;
  if (Array.isArray(v)) return `[${v.map(ioLiteral).join(', ')}]`;
  if (typeof v === 'object') {
    return `{ ${Object.keys(v).map(k => `${ioKey(k)}: ${ioLiteral(v[k])}`).join(', ')} }`;
  }
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(v) && !KEYWORDS.has(v) ? v : JSON.stringify(v);
}

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
function category(e: any): string {
  const n = String(e?.name ?? e?.constructor?.name ?? '');
  if (n.includes('SyntaxError')) return 'syntax';
  if (n.includes('ValidationError')) return 'validation';
  if (n.includes('Stream')) return 'stream';
  return 'general';
}

function buildDefs(defText: string | undefined): any {
  if (!defText) return null;
  const doc: any = parse(defText.trimEnd() + '\n---\n', null);
  return doc.header?.definitions ?? null;
}

interface Emitted { items: any[]; fatal: any }

async function run(c: StreamCase, strategy: Chunking): Promise<Emitted> {
  const opts: any = {};
  if (c.defaultSchema) opts.defaultSchema = `$${c.defaultSchema}`;
  const source: any = strategy === 'whole' ? c.input : asyncChunks(strategy, c.input);
  const reader = createStreamReader(source, buildDefs(c.definitions), opts);

  const items: any[] = [];
  let fatal: any = null;
  try {
    for await (const it of reader as any) {
      const recordIndex = it.recordIndex ?? it.index;
      // The sigil is stripped on the way IN to the corpus; a runner puts it back.
      const schemaName = it.schemaName ? String(it.schemaName).replace(/^\$/, '') : undefined;
      if (it.error) {
        items.push({ kind: 'record-error', recordIndex, schemaName,
                     error: { category: category(it.error), code: it.error.errorCode } });
      } else {
        items.push({ kind: 'record', recordIndex, schemaName,
                     value: it.data?.toJSON?.() ?? it.data });
      }
    }
  } catch (e: any) {
    fatal = { category: category(e), code: e?.errorCode ?? null };
  }
  return { items, fatal };
}

/** Spell one emitted item the way the hand-authored streaming suites do. */
function itemLiteral(i: any): string {
  const parts = [`kind: ${i.kind}`, `recordIndex: ${i.recordIndex}`];
  if (i.schemaName !== undefined) parts.push(`schemaName: ${ioLiteral(i.schemaName)}`);
  if (i.kind === 'record-error') {
    parts.push(`error: { category: ${i.error.category}, code: ${i.error.code} }`);
  } else {
    parts.push(`value: ${ioLiteral(i.value)}`);
  }
  return `{ ${parts.join(', ')} }`;
}

function expectedLiteral(e: Emitted): string {
  const items = e.items.map(itemLiteral).join(',\n      ');
  const fatal = e.fatal ? `{ category: ${e.fatal.category}, code: ${e.fatal.code} }` : 'N';
  return e.items.length === 0
    ? `{ items: [], fatal: ${fatal} }`
    : `{ items: [\n      ${items}\n    ],\n    fatal: ${fatal} }`;
}

// ---------------------------------------------------------------------------------------------
// Framing — how the reader finds record boundaries
// ---------------------------------------------------------------------------------------------
const framing: StreamCase[] = [
  { group: 'the header terminator opens the data section', name: 'empty_header_one_record',
    input: '---\n~ Alice\n' },
  { name: 'empty_header_two_records', input: '---\n~ Alice\n~ Bob\n' },
  { name: 'header_with_schema', input: '~ $P: {n:string}\n--- $P\n~ Alice\n' },
  { name: 'no_records_after_header', input: '---\n' },
  { name: 'header_only_no_terminator', input: '~ $P: {n:string}\n',
    note: 'the header is never terminated — what the reader does with buffered content at EOF' },
  { name: 'completely_empty_stream', input: '' },
  { name: 'whitespace_only_stream', input: '\n\n' },

  { group: 'record boundaries', name: 'record_with_several_members',
    input: '---\n~ a: 1, b: 2\n' },
  { name: 'record_spanning_a_container', input: '---\n~ a: {x: 1, y: 2}\n',
    note: 'a `~` inside braces is not a boundary — nesting is tracked' },
  { name: 'record_with_array', input: '---\n~ a: [1, 2, 3]\n' },
  { name: 'record_containing_tilde_in_a_string', input: '---\n~ a: "x ~ y"\n' },
  { name: 'three_records', input: '---\n~ 1\n~ 2\n~ 3\n' },
  { name: 'record_without_trailing_newline', input: '---\n~ Alice' },
  { name: 'blank_lines_between_records', input: '---\n~ 1\n\n~ 2\n' },
  { name: 'comment_between_records', input: '---\n~ 1\n# note\n~ 2\n' },

  { group: 'record index is stream-global and dense', name: 'index_increments_across_records',
    input: '---\n~ 1\n~ 2\n~ 3\n' },
  { name: 'index_does_not_reset_on_bare_separator', input: '---\n~ 1\n---\n~ 2\n' },
];

// ---------------------------------------------------------------------------------------------
// Errors — recoverable versus fatal
// ---------------------------------------------------------------------------------------------
const errors: StreamCase[] = [
  { group: 'RECOVERABLE — one record-error item, then iteration continues',
    name: 'validation_failure_then_continue',
    input: '~ $P: {n:string, a:int}\n--- $P\n~ Alice, notanint\n~ Bob, 25\n' },
  { name: 'two_bad_records_both_reported',
    input: '~ $P: {n:string, a:int}\n--- $P\n~ A, x\n~ B, y\n' },
  { name: 'bad_record_between_good_ones',
    input: '~ $P: {n:string, a:int}\n--- $P\n~ A, 1\n~ B, x\n~ C, 3\n' },
  { name: 'missing_required_member',
    input: '~ $P: {n:string, a:int}\n--- $P\n~ Alice\n' },
  { name: 'surplus_member_closed_schema',
    input: '~ $P: {n:string}\n--- $P\n~ Alice, extra\n' },
  { name: 'forbidden_null', input: '~ $P: {n:string}\n--- $P\n~ N\n' },

  { group: 'a partial frame at EOF is recoverable, not fatal',
    name: 'unterminated_string_at_eof', input: '---\n~ "unclosed' },
  { name: 'unterminated_object_at_eof', input: '---\n~ {a: 1' },
  { name: 'unterminated_array_at_eof', input: '---\n~ [1, 2' },

  { group: 'FATAL — terminates iteration, reported in fatal and never as an item',
    name: 'unknown_schema_selector', input: '--- $Missing\n~ Alice\n' },
  { name: 'unknown_schema_after_good_records',
    input: '~ $P: {n:string}\n--- $P\n~ A\n~ B\n--- $Missing\n~ C\n',
    note: 'ISSUE-26: the records BEFORE the fatal must still be delivered' },
  { name: 'unknown_schema_after_one_record',
    input: '~ $P: {n:string}\n--- $P\n~ A\n--- $Missing\n~ B\n' },
  { name: 'malformed_header_is_fatal', input: '~ $P: {n:\n---\n~ A\n' },

  { group: 'the error CATEGORY comes from the core class', name: 'syntax_category',
    input: '---\n~ {a: 1\n~ 2\n' },
  { name: 'validation_category', input: '~ $P: {a:int}\n--- $P\n~ x\n' },
];

// ---------------------------------------------------------------------------------------------
// Schema state — how the active schema changes as the stream advances
// ---------------------------------------------------------------------------------------------
const schemaState: StreamCase[] = [
  { group: 'an in-stream selector sets the active schema', name: 'selector_applies_to_following_records',
    input: '~ $P: {n:string}\n--- $P\n~ A\n~ B\n' },
  { name: 'switch_between_two_schemas',
    input: '~ $P: {n:string}\n~ $Q: {m:int}\n--- $P\n~ A\n--- $Q\n~ 1\n' },
  { name: 'switch_back_to_the_first',
    input: '~ $P: {n:string}\n~ $Q: {m:int}\n--- $P\n~ A\n--- $Q\n~ 1\n--- $P\n~ B\n' },
  { name: 'bare_separator_clears_the_selector',
    input: '~ $P: {n:string}\n--- $P\n~ A\n---\n~ B\n',
    note: 'schemaName is present only while an explicit selector applies' },

  { group: 'the default schema', name: 'dollar_schema_is_the_default',
    input: '~ $schema: {n:string}\n---\n~ A\n' },
  { name: 'default_schema_option_applies',
    input: '~ $P: {n:string}\n---\n~ A\n', defaultSchema: 'P',
    note: 'a record validated only through the DEFAULT schema carries no schemaName' },
  { name: 'explicit_selector_overrides_the_default',
    input: '~ $P: {n:string}\n~ $Q: {m:int}\n--- $Q\n~ 1\n', defaultSchema: 'P' },
  { name: 'no_schema_at_all', input: '---\n~ a: 1\n' },

  { group: 'preloaded definitions', name: 'preloaded_schema_used_by_selector',
    input: '--- $P\n~ A\n', definitions: '~ $P: {n:string}' },
  { name: 'preloaded_schema_as_default',
    input: '---\n~ A\n', definitions: '~ $P: {n:string}', defaultSchema: 'P' },
  { name: 'in_stream_header_overrides_preloaded',
    input: '~ $P: {n:int}\n--- $P\n~ 1\n', definitions: '~ $P: {n:string}',
    note: 'the in-stream definition wins for a matching key' },
  { name: 'preloaded_variable_used_in_data',
    input: '---\n~ a: @v\n', definitions: '~ @v: 42' },

  { group: 'positional and named records under a schema', name: 'positional_record',
    input: '~ $P: {n:string, a:int}\n--- $P\n~ Alice, 30\n' },
  { name: 'named_record', input: '~ $P: {n:string, a:int}\n--- $P\n~ n: Alice, a: 30\n' },
  { name: 'schemaless_positional_projects_to_indices', input: '---\n~ 1, 2\n' },
];

// ---------------------------------------------------------------------------------------------

const SUITES: StreamSuite[] = [
  {
    file: 'framing-depth',
    description: 'Framing in depth — the header terminator, record boundaries, and the record index',
    header: [
      'Streaming · FRAMING (depth)',
      'Authoritative: items produced by running io-js2\'s createStreamReader, verified IDENTICAL',
      'across whole / per-line / per-byte chunkings (the chunking invariant).',
      'A `~` inside a container is not a boundary; nesting is tracked. `recordIndex` is',
      'zero-based, dense and stream-global — it increments for record AND record-error, and',
      'never resets on a schema switch or a bare `---`.',
    ],
    cases: framing,
  },
  {
    file: 'errors-depth',
    description: 'Recoverable record errors versus fatal terminations, and where the category comes from',
    header: [
      'Streaming · ERRORS (depth)',
      'Authoritative: items/fatal produced by running io-js2\'s createStreamReader, verified',
      'identical across all three chunkings.',
      'RECOVERABLE errors surface as exactly one `record-error` item and consume a recordIndex,',
      'then iteration continues. FATAL errors terminate iteration and appear only in `fatal`,',
      'never as an item — but the items emitted BEFORE them are still delivered (ISSUE-26).',
      'A partial frame at EOF is recoverable, not fatal.',
    ],
    cases: errors,
  },
  {
    file: 'schema-state-depth',
    description: 'The active schema as the stream advances — selectors, defaults, and preloaded definitions',
    header: [
      'Streaming · SCHEMA STATE (depth)',
      'Authoritative: items produced by running io-js2\'s createStreamReader, verified identical',
      'across all three chunkings.',
      '`schemaName` is present ONLY while an explicit selector applies; a record validated through',
      'the default schema carries none. It is stored here SIGIL-STRIPPED — a runner prepends `$`',
      'before comparing (FINDINGS #3).',
    ],
    cases: schemaState,
  },
];

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  let total = 0;
  const problems: string[] = [];

  for (const suite of SUITES) {
    const rows: string[] = [];
    rows.push(...suite.header.map(l => `# ${l}`));
    rows.push('# GENERATED by io-js2 tools/corpus/suites-stream.ts — edit the case table there.');
    rows.push('# A case MISSING from this file produced DIFFERENT results under different chunkings');
    rows.push('# and was refused: chunk boundaries are not semantic, so that is a defect, not a row.');
    rows.push('~ version: 1.0');
    rows.push(`~ description: ${ioText(suite.description)}`);
    const hasOpts = suite.cases.some(c => c.definitions || c.defaultSchema);
    rows.push(hasOpts
      ? '~ $schema: { name: string, input: string, definitions*?: string, defaultSchema*?: string, expected: any }'
      : '~ $schema: { name: string, input: string, expected: any }');
    rows.push('---');

    let lastGroup = '';
    for (const c of suite.cases) {
      if (c.group && c.group !== lastGroup) {
        rows.push('');
        rows.push(`# ── ${c.group} ${'─'.repeat(Math.max(0, 86 - c.group.length))}`);
        lastGroup = c.group;
      }

      // The chunking invariant is CHECKED here, not assumed: all three must agree.
      const results: Emitted[] = [];
      let threw: string | null = null;
      for (const strategy of CHUNKINGS) {
        try {
          results.push(await run(c, strategy));
        } catch (e: any) {
          threw = `${strategy}: ${e?.errorCode ?? e?.message ?? e}`;
          break;
        }
      }
      if (threw) {
        problems.push(`${suite.file}/${c.name}: harness threw — ${threw}`);
        continue;
      }
      const spellings = results.map(r => JSON.stringify(r));
      if (new Set(spellings).size !== 1) {
        problems.push(`${suite.file}/${c.name}: CHUNKING DIVERGENCE\n` +
          CHUNKINGS.map((s, i) => `    ${s.padEnd(9)} ${spellings[i]}`).join('\n'));
        continue;
      }

      if (c.note) rows.push(`# ${c.note}`);
      if (c.review) rows.push(`# REVIEW: ${c.review}`);

      const cols = [c.name, ioText(c.input)];
      if (hasOpts) {
        cols.push(c.definitions ? ioText(c.definitions) : 'N');
        cols.push(c.defaultSchema ? ioText(c.defaultSchema) : 'N');
      }
      rows.push(`~ ${cols.join(',\n  ')},\n  ${expectedLiteral(results[0])}`);
      total++;
    }

    writeFileSync(`${OUT_DIR}/${suite.file}.io`, rows.join('\n') + '\n', 'utf8');
    console.log(`${OUT_DIR}/${suite.file}.io: ${suite.cases.length} attempted`);
  }

  console.log(`\n${SUITES.length} suites, ${total} cases emitted`);
  if (problems.length) {
    console.log(`\n${problems.length} case(s) NOT emitted:`);
    for (const p of problems) console.log(`  ${p}`);
  }
}

main();
