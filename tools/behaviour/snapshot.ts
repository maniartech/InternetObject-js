/**
 * Behaviour snapshot — proof that an API change changed only the API.
 *
 * ## Why this exists
 *
 * The ADR 0005 work changes signatures, return types and accessor names across the library. The
 * standing constraint (thumb rule #1) is that **parsing, validation and schema rules must not move
 * at all**. The test suite is good evidence but it is not proof: it asserts what someone thought to
 * assert, and an API sweep touching 1,200 call sites can quietly normalise an expectation along the
 * way.
 *
 * This takes a different angle. It replays **every input in the conformance corpus** through the
 * parser and records the complete observable outcome — the value model *and* every error with its
 * code and position. That fingerprint is stored once, before any change, and re-verified after each
 * one. It does not care what the API looks like; it cares what the parser produced.
 *
 * A test can be edited to match new behaviour without anybody noticing. A snapshot diff cannot.
 *
 * ## Usage
 *
 *   npx tsx tools/behaviour/snapshot.ts --capture   # write the baseline (do this FIRST)
 *   npx tsx tools/behaviour/snapshot.ts --verify    # fail if anything moved
 *
 * ## What counts as a difference
 *
 * Any change to a value, an error code, an error position, or the ORDER of either. Error order
 * matters: a port has to reproduce it, and reordering is exactly the kind of drift a refactor
 * introduces without anyone deciding to.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import parse from '../../src/parser/index';
import { corpusDir } from '../corpus/sibling-repos';

const here = path.dirname(fileURLToPath(import.meta.url));
const BASELINE = path.join(here, 'baseline.json');

/** One replayed input and everything observable about the outcome. */
interface Fingerprint {
  /** `<corpus file>#<case name>` — stable across regeneration, unlike an index. */
  id: string;
  /** The value model, JSON-projected so it can be compared textually. */
  value: string;
  /** Every error, in order: `code@row:col`. Order is part of the contract. */
  errors: string[];
  /** Set when parsing threw rather than returning — the code, or the constructor name. */
  threw?: string;
}

/** Walk the corpus for `.io` case files. `catalog.io` is generated metadata, not cases. */
function corpusFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.io') && e.name !== 'catalog.io') out.push(full);
    }
  };
  walk(root);
  return out.sort();
}

/**
 * Pull every `input` out of a corpus file.
 *
 * The corpus is written in Internet Object, so the library reads it — which is the point: if the
 * parser broke badly enough to misread the corpus, that shows up here too.
 */
function inputsOf(file: string): Array<{ name: string; input: string }> {
  const found: Array<{ name: string; input: string }> = [];
  let doc: any;
  try {
    doc = parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return found;                       // an unreadable case file is not this tool's problem
  }
  const projected = doc?.toObject?.();
  const sections = Array.isArray(projected) ? { data: projected } : (projected ?? {});
  for (const rows of Object.values(sections)) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows as any[]) {
      if (row && typeof row === 'object' && typeof row.input === 'string') {
        found.push({ name: String(row.name ?? `#${found.length}`), input: row.input });
      }
    }
  }
  return found;
}

/** Replay one input and record everything observable. */
function fingerprint(id: string, input: string): Fingerprint {
  const sink: Error[] = [];
  try {
    const doc: any = parse(input, null, sink);
    // Union of both channels, de-duplicated: the two disagree today (C1a), and this must keep
    // working whichever way that is fixed.
    const seen = new Set<string>();
    const errors: string[] = [];
    for (const e of [...sink, ...(doc?.getErrors?.() ?? [])]) {
      const p = (e as any)?.position;
      const key = `${(e as any)?.errorCode ?? e?.name}@${p?.row ?? '?'}:${p?.col ?? '?'}`;
      if (!seen.has(key)) { seen.add(key); errors.push(key); }
    }
    let value: string;
    try {
      value = JSON.stringify(doc?.toJSON?.() ?? null);
    } catch (e: any) {
      value = 'PROJECTION_THREW:' + (e?.constructor?.name ?? 'Error');
    }
    return { id, value, errors };
  } catch (e: any) {
    return { id, value: '', errors: [], threw: (e as any)?.errorCode ?? e?.constructor?.name ?? 'Error' };
  }
}

function capture(): Fingerprint[] {
  const root = corpusDir();
  if (!root) throw new Error('corpus repo not found -- see tools/corpus/sibling-repos.ts');
  const files = corpusFiles(root);
  const prints: Fingerprint[] = [];
  for (const file of files) {
    const rel = path.relative(root, file).replace(/\\/g, '/');
    for (const { name, input } of inputsOf(file)) {
      prints.push(fingerprint(`${rel}#${name}`, input));
    }
  }
  return prints;
}

const mode = process.argv[2];

if (mode === '--capture') {
  const prints = capture();
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  fs.writeFileSync(BASELINE, JSON.stringify(prints, null, 1) + '\n');
  console.log(`captured ${prints.length} fingerprints → ${path.relative(process.cwd(), BASELINE)}`);
  process.exit(0);
}

if (mode === '--verify') {
  if (!fs.existsSync(BASELINE)) {
    console.error('no baseline — run with --capture first');
    process.exit(2);
  }
  const before: Fingerprint[] = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const after = capture();
  const byId = new Map(after.map((f) => [f.id, f]));

  const diffs: string[] = [];
  for (const b of before) {
    const a = byId.get(b.id);
    if (!a) { diffs.push(`MISSING   ${b.id}`); continue; }
    byId.delete(b.id);
    if (a.value !== b.value) diffs.push(`VALUE     ${b.id}\n            was: ${b.value.slice(0, 90)}\n            now: ${a.value.slice(0, 90)}`);
    if (a.errors.join('|') !== b.errors.join('|')) diffs.push(`ERRORS    ${b.id}\n            was: [${b.errors.join(', ')}]\n            now: [${a.errors.join(', ')}]`);
    if (a.threw !== b.threw) diffs.push(`THREW     ${b.id}   was: ${b.threw ?? '-'}   now: ${a.threw ?? '-'}`);
  }
  for (const id of byId.keys()) diffs.push(`NEW       ${id}`);

  if (diffs.length === 0) {
    console.log(`✓ behaviour unchanged — ${before.length} fingerprints identical`);
    process.exit(0);
  }
  console.error(`✗ behaviour MOVED on ${diffs.length} of ${before.length} fingerprints\n`);
  for (const d of diffs.slice(0, 40)) console.error('  ' + d);
  if (diffs.length > 40) console.error(`\n  … and ${diffs.length - 40} more`);
  console.error('\nEvery one of these is either a real regression or a change you intended.');
  console.error('If intended: re-capture, and say so in the commit message.');
  process.exit(1);
}

console.error('usage: snapshot.ts --capture | --verify');
process.exit(2);
