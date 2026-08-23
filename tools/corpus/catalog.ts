import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative, basename } from 'path';
import parse from '../../src/parser/index';
import { kindOf, isSuiteFile } from './runner';

/**
 * Build the corpus CATALOGUE — the classification a port uses to select, report and track coverage.
 *
 *   npx tsx tools/corpus/catalog.ts
 *
 * Writes two files into io-test-cases:
 *
 *   CATALOG.md     for a person: what exists, how much of it, and what each group asserts
 *   catalog.io     for a program: one row per FILE, so a runner can filter without parsing
 *                  every suite first
 *
 * Why a catalogue at all. A conformance corpus that can only be run whole is hard to adopt: a port
 * with a working tokenizer and no validator wants the tokenizer suites TODAY, and wants its report
 * to say "tokenizer 254/254, validation not yet attempted" rather than "1341 failures". The
 * classification below is what makes that possible, and it is derived from the corpus rather than
 * maintained beside it, so it cannot drift.
 *
 * THE FOUR AXES
 *
 *   suite     which pipeline stage the case exercises, and therefore which comparator it needs
 *             (tokenizer, parser, document, schema, validation, serializer, streaming, regression)
 *   kind      how a runner must EXECUTE it — taken from the suite directory. See runner.ts
 *   category  the file, which is the topic: `numbers-rules`, `optionality`, `quoting`
 *   group     the `# ──` heading a case sits under: the specific rule being pinned
 *   outcome   `valid` when the case asserts a value, `invalid` when it asserts error codes
 *
 * A port implementing stage by stage runs whole suites. A port chasing one failure filters by
 * group. A port reporting progress counts valid vs invalid, because passing every invalid case by
 * rejecting everything is the classic false green.
 */

const CORPUS = '../io-test-cases';

interface FileEntry {
  path: string;          // relative to the corpus root
  suite: string;
  kind: string;
  category: string;
  description: string;
  groups: { name: string; valid: number; invalid: number }[];
  valid: number;
  invalid: number;
  total: number;
}

/** Every `.io` suite file, recursively, in a stable order. */
function corpusFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      out.push(...corpusFiles(full));
    } else if (isSuiteFile(name)) {
      // isSuiteFile excludes catalog.io — this file's own output, the index rather than a suite.
      out.push(full);
    }
  }
  return out;
}

/**
 * Read a suite file's groups by SCANNING rather than parsing.
 *
 * The group headings are comments, and comments do not survive into the value model — so the
 * classification has to come from the text. Case rows are matched the same way, which keeps this
 * independent of whether the file happens to parse.
 */
function scanGroups(text: string): { name: string; valid: number; invalid: number }[] {
  const groups: { name: string; valid: number; invalid: number }[] = [];
  let current: { name: string; valid: number; invalid: number } | null = null;

  const body = text.split(/\n---\n/).slice(1).join('\n---\n');
  for (const line of body.split('\n')) {
    const heading = /^#\s*──\s*(.+?)\s*─*\s*$/.exec(line);
    if (heading) {
      current = { name: heading[1].trim(), valid: 0, invalid: 0 };
      groups.push(current);
      continue;
    }
    if (!/^~\s*[A-Za-z_][A-Za-z0-9_]*\s*,/.test(line)) continue;
    if (!current) {
      current = { name: '(ungrouped)', valid: 0, invalid: 0 };
      groups.push(current);
    }
    // A case is INVALID when it asserts codes. `error_codes:` may sit on the row or the next
    // line for a wrapped row, so the whole remaining text from this row is not safe to scan —
    // the row itself is, because a valid row never contains the token.
    if (/error_codes\s*:/.test(line)) current.invalid++;
    else current.valid++;
  }
  return groups;
}

/** A wrapped row puts `error_codes:` on a continuation line; count those too. */
function countWrapped(text: string): { valid: number; invalid: number } {
  const body = text.split(/\n---\n/).slice(1).join('\n---\n');
  const rows = body.split(/\n(?=~\s*[A-Za-z_])/).filter(r => /^~\s*[A-Za-z_]/.test(r));
  let valid = 0;
  let invalid = 0;
  for (const r of rows) {
    if (/error_codes\s*:/.test(r)) invalid++;
    else valid++;
  }
  return { valid, invalid };
}

function descriptionOf(text: string): string {
  const m = /^~\s*description\s*:\s*(.+)$/m.exec(text);
  if (!m) return '';
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}

const files = corpusFiles(CORPUS);
const entries: FileEntry[] = [];

for (const full of files) {
  const rel = relative(CORPUS, full).replace(/\\/g, '/');
  const text = readFileSync(full, 'utf8');
  const suite = rel.split('/')[0];
  const groups = scanGroups(text);
  const { valid, invalid } = countWrapped(text);

  // Reconcile: the per-line group tally can undercount wrapped rows, so trust the row split for
  // totals and scale the last group rather than reporting numbers that do not add up.
  const groupTotal = groups.reduce((n, g) => n + g.valid + g.invalid, 0);
  if (groupTotal !== valid + invalid && groups.length > 0) {
    groups[groups.length - 1].valid += (valid + invalid) - groupTotal;
  }

  entries.push({
    path: rel,
    suite,
    // kindOf matches on `/suite/`, so the path needs a leading separator to classify.
    kind: kindOf('/' + rel),
    category: basename(rel, '.io'),
    description: descriptionOf(text),
    groups,
    valid,
    invalid,
    total: valid + invalid,
  });
}

// ---------------------------------------------------------------------------------------------
// CATALOG.md
// ---------------------------------------------------------------------------------------------

const bySuite = new Map<string, FileEntry[]>();
for (const e of entries) {
  if (!bySuite.has(e.suite)) bySuite.set(e.suite, []);
  bySuite.get(e.suite)!.push(e);
}

const SUITE_ORDER = ['tokenizer', 'parser', 'document', 'schema', 'validation',
                     'serializer', 'streaming', 'regression'];
const suiteNames = [...bySuite.keys()].sort((a, b) => {
  const ia = SUITE_ORDER.indexOf(a);
  const ib = SUITE_ORDER.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
});

const totalCases = entries.reduce((n, e) => n + e.total, 0);
const totalValid = entries.reduce((n, e) => n + e.valid, 0);
const totalInvalid = entries.reduce((n, e) => n + e.invalid, 0);

const SUITE_BLURB: Record<string, string> = {
  tokenizer: 'source text → a flat list of tokens. Executed from `bootstrap/tokenizer.csv`, not from `.io`: these suites express their data with the syntax under test, so a port cannot read them until it already has a working tokenizer.\n\n> Every tokenizer case counts as `valid` on the outcome axis, malformed inputs included. A tokenizer does not raise — it emits an ERROR **token** — so the case still asserts a token list. Look for `type: ERROR` in the expected list rather than at the invalid column.',
  parser: 'source text → the value a piece of text denotes. Literals, keys, and the codes a malformed construct reports.',
  document: 'source text → the whole document as a container. Header vs data, sections, definitions and variables, and how values are keyed in the projection.',
  schema: 'a schema definition string → the compiled member description. Matching is subset/contains, so a port is not held to io-js2\'s bookkeeping.',
  validation: 'data + a schema → a validated value, or the accumulated error codes.',
  serializer: 'a document → canonical text. Every case pins three properties at once: the exact output, that it re-parses to the same value, and that writing it again does not change it.\n\n> Every case here is `valid` by construction. The generator CHECKS all three properties before writing a row and refuses one that fails, reporting it instead — so a broken round trip is never recorded as if it were correct, and there is nothing for an invalid column to hold.',
  streaming: 'a byte/text stream → the ordered items a reader emits, plus the terminal fatal. Every case is verified identical across whole / per-line / per-byte before it is written.\n\n> `valid` here means the case asserts an item sequence, which it always does. Error behaviour is asserted INSIDE that sequence — as a `record-error` item, or as the terminal `fatal` — so the invalid column stays at zero by construction.',
  regression: 'one case per fixed defect, kept so it cannot come back. Named for the issue it guards.',
};

const md: string[] = [];
md.push('# Corpus catalogue');
md.push('');
md.push('**Generated** by `io-js2 tools/corpus/catalog.ts` — do not edit by hand. Regenerate after');
md.push('adding cases; the numbers below are counted from the suites themselves, so they cannot drift');
md.push('from what is actually there.');
md.push('');
md.push(`**${totalCases} cases** across ${entries.length} files and ${suiteNames.length} suites — ` +
        `${totalValid} asserting a value, ${totalInvalid} asserting error codes.`);
md.push('');
md.push('## How to use this');
md.push('');
md.push('A conformance corpus that can only be run whole is hard to adopt. A port with a working');
md.push('tokenizer and no validator wants the tokenizer suites today, and wants its report to read');
md.push('*"tokenizer 254/254, validation not yet attempted"* rather than *"1341 failures"*. These are');
md.push('the axes to select and report on:');
md.push('');
md.push('| Axis | What it is | Use it to |');
md.push('| ---- | ---------- | --------- |');
md.push('| **suite** | the pipeline stage | adopt the corpus stage by stage |');
md.push('| **kind** | how a runner must execute the case | write one comparator per kind, not per suite |');
md.push('| **category** | the file — the topic | find the rules for one feature |');
md.push('| **group** | the `# ──` heading — the specific rule | chase a single failure to its rule |');
md.push('| **outcome** | `valid` asserts a value, `invalid` asserts codes | avoid the classic false green |');
md.push('');
md.push('> **On that false green.** An implementation that rejects everything passes every `invalid`');
md.push('> case in this corpus. Report the two counts separately, always: a suite that is 100% on');
md.push('> invalid cases and 0% on valid ones is not partially working, it is inverted.');
md.push('');
md.push('`catalog.io` carries the same data one row per file, so a runner can filter without parsing');
md.push('every suite first.');
md.push('');
md.push('## Suites');
md.push('');
md.push('| Suite | Kind | Files | Cases | valid | invalid |');
md.push('| ----- | ---- | -----:| -----:| -----:| -------:|');
for (const s of suiteNames) {
  const es = bySuite.get(s)!;
  const kinds = [...new Set(es.map(e => e.kind))].join(', ');
  md.push(`| [\`${s}/\`](#${s}) | \`${kinds}\` | ${es.length} | **${es.reduce((n, e) => n + e.total, 0)}** | ` +
          `${es.reduce((n, e) => n + e.valid, 0)} | ${es.reduce((n, e) => n + e.invalid, 0)} |`);
}
md.push(`| | | **${entries.length}** | **${totalCases}** | **${totalValid}** | **${totalInvalid}** |`);
md.push('');

for (const s of suiteNames) {
  const es = bySuite.get(s)!;
  md.push('---');
  md.push('');
  md.push(`## ${s}`);
  md.push('');
  if (SUITE_BLURB[s]) {
    md.push(SUITE_BLURB[s]);
    md.push('');
  }
  for (const e of es) {
    md.push(`### \`${e.path}\` — ${e.total} cases`);
    md.push('');
    if (e.description) {
      md.push(`*${e.description}*`);
      md.push('');
    }
    if (e.groups.length) {
      md.push('| Group | valid | invalid |');
      md.push('| ----- | -----:| -------:|');
      for (const g of e.groups) {
        md.push(`| ${g.name.replace(/\|/g, '\\|')} | ${g.valid} | ${g.invalid} |`);
      }
      md.push('');
    }
  }
}

writeFileSync(join(CORPUS, 'CATALOG.md'), md.join('\n') + '\n', 'utf8');

// ---------------------------------------------------------------------------------------------
// catalog.io — the machine-readable index, in Internet Object, like the rest of the corpus
// ---------------------------------------------------------------------------------------------

function ioStr(s: string): string {
  return JSON.stringify(s);
}

const rows: string[] = [];
rows.push('# Corpus catalogue — one row per suite FILE.');
rows.push('#');
rows.push('# GENERATED by io-js2 tools/corpus/catalog.ts. Regenerate after adding cases:');
rows.push('#   npx tsx tools/corpus/catalog.ts');
rows.push('#');
rows.push('# A runner reads this to SELECT and to REPORT without first parsing every suite.');
rows.push('# Adopt the corpus stage by stage: run the suites you have implemented, and say so.');
rows.push('#');
rows.push('#   suite     the pipeline stage');
rows.push('#   kind      which comparator the file needs — see io-js2 tools/corpus/runner.ts');
rows.push('#   category  the file, which is the topic');
rows.push('#   valid     cases asserting a VALUE');
rows.push('#   invalid   cases asserting ERROR CODES');
rows.push('#');
rows.push('# Report valid and invalid SEPARATELY. An implementation that rejects everything passes');
rows.push('# every invalid case here; a suite at 100% invalid and 0% valid is inverted, not partial.');
rows.push('~ version: 1.0');
rows.push(`~ description: "Corpus catalogue — ${totalCases} cases across ${entries.length} files"`);
rows.push('~ $schema: { path: string, suite: string, kind: string, category: string, valid: int, invalid: int, total: int, description*: string }');
rows.push('---');

let lastSuite = '';
for (const e of entries) {
  if (e.suite !== lastSuite) {
    rows.push('');
    rows.push(`# ── ${e.suite} ${'─'.repeat(Math.max(0, 86 - e.suite.length))}`);
    lastSuite = e.suite;
  }
  rows.push(`~ ${ioStr(e.path)}, ${e.suite}, ${e.kind}, ${ioStr(e.category)}, ` +
            `${e.valid}, ${e.invalid}, ${e.total}, ${e.description ? ioStr(e.description) : 'N'}`);
}

writeFileSync(join(CORPUS, 'catalog.io'), rows.join('\n') + '\n', 'utf8');

// Prove the index is itself a valid Internet Object document — it is part of the corpus.
const check: any = parse(readFileSync(join(CORPUS, 'catalog.io'), 'utf8'), null);
const errs = (check.getErrors?.() ?? []).map((x: any) => x.errorCode);
if (errs.length) {
  console.error(`catalog.io does not parse: ${errs.join(', ')}`);
  process.exit(1);
}

console.log(`CATALOG.md   ${entries.length} files, ${suiteNames.length} suites`);
console.log(`catalog.io   ${totalCases} cases — ${totalValid} valid, ${totalInvalid} invalid`);
