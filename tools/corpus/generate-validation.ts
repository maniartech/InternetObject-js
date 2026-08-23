import { writeFileSync } from 'fs';
import parse from '../../src/parser/index';

/**
 * Generate a `validation/*.io` corpus suite, deriving every expectation by RUNNING the reference implementation.
 *
 *   npx tsx tools/corpus/generate-validation.ts <suite-name>
 *
 * The corpus's golden rule is that expected values are *observed*, never guessed — a hand-written
 * expectation is a second implementation, and when it disagrees with the reference nobody can tell
 * which one is wrong. So a case here supplies only the INPUT (a name, a schema fragment, a data
 * fragment); the outcome is whatever the reference implementation actually produces.
 *
 * That puts the intellectual work where it belongs: choosing cases that matter. A generator cannot
 * decide that `int8` should be probed at 127 and 128; it can only make sure that once you have said
 * so, the recorded answer is true.
 *
 * IMPORTANT: generated output is a STARTING POINT, not law. Every row must still be read by a human
 * against the spec, because the reference implementation can be wrong — several corpus cases exist precisely to pin a
 * behaviour that was later found to be a bug. Rows whose outcome looks wrong are flagged with
 * `# REVIEW:` rather than silently accepted.
 */

interface Case {
  /** Unique within the suite; snake_case. */
  name: string;
  /** The schema fragment, spliced into `~ $schema: { … }`. */
  schema: string;
  /** The data fragment, placed after `---`. */
  input: string;
  /** Optional note rendered as a comment above the row. */
  note?: string;
  /** Start a new commented group. */
  group?: string;
  /**
   * Pin the CURRENT behaviour while flagging it as suspect. Emits a `# REVIEW:` comment above the
   * row. A corpus case says "this is the rule"; a reviewed case says "this is what happens, and it
   * may be a bug" -- without which a defect quietly becomes law the moment it is written down.
   */
  review?: string;
}

/** An IO literal for a projected value, matching how the existing suites spell them. */
function ioLiteral(v: any): string {
  if (v === null || v === undefined) return 'N';
  if (typeof v === 'boolean') return v ? 'T' : 'F';
  if (typeof v === 'bigint') return `${v}n`;
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : (Number.isNaN(v) ? 'NaN' : (v > 0 ? 'Inf' : '-Inf'));
  if (v instanceof Date) return `dt"${v.toISOString()}"`;
  if (v instanceof Uint8Array) return `b"${Buffer.from(v).toString('base64')}"`;
  if (v?.constructor?.name === 'Decimal') return `${String(v)}m`;
  if (Array.isArray(v)) return `[${v.map(ioLiteral).join(', ')}]`;
  if (typeof v === 'object') {
    return `{ ${Object.keys(v).map(k => `${ioKey(k)}: ${ioLiteral(v[k])}`).join(', ')} }`;
  }
  // A string is written bare only when it round-trips AS A STRING. A bare `null`, `N`, `T`, `F`,
  // `true`, `false`, `NaN` or `Inf` is a KEYWORD, so the string "null" written bare would read back
  // as the null value -- the writer emitting text its own reader reads differently, which is the
  // defect class this corpus exists to catch. Caught by the corpus itself on the first run.
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(v) && !KEYWORDS.has(v) ? v : JSON.stringify(v);
}

/** Bare words the reader resolves to a value rather than a string. */
const KEYWORDS = new Set(['null', 'N', 'T', 'F', 'true', 'false', 'NaN', 'Inf']);

function ioKey(k: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : JSON.stringify(k);
}

/** A single-quoted IO string for the `schema` / `input` columns, whichever quote keeps it readable. */
function ioText(s: string): string {
  const escaped = s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  return escaped.includes('"') ? `'${escaped.replace(/'/g, "\\'")}'` : `"${escaped}"`;
}

interface Outcome { codes: string[]; value: any }

/** Run one case exactly the way `tools/corpus/verify.ts` will, so the two cannot disagree. */
function run(c: Case): Outcome {
  const source = `~ $schema: { ${c.schema} }\n---\n${c.input}\n`;
  try {
    const doc: any = parse(source, null);
    const codes = (doc.getErrors?.() ?? []).map((e: any) => e.errorCode ?? `<${e?.name ?? 'uncoded'}>`);
    return { codes, value: codes.length > 0 ? null : doc.toObject() };
  } catch (e: any) {
    return { codes: [e?.errorCode ?? `<${e?.name ?? 'uncoded'}>`], value: null };
  }
}

export function generate(title: string, description: string, header: string[], cases: Case[]): string {
  const out: string[] = [];
  out.push(...header.map(l => `# ${l}`));
  out.push('~ version: 1.0');
  out.push(`~ description: ${ioText(description)}`);
  // `expected` must accept N: a case whose outcome is a null value, or whose record is absent
  // entirely, records `N` here -- and `any` is NOT nullable by default.
  out.push('~ $schema: { name: string, schema: string, input: string, expected?: {any, "null": T}, error_codes?: array }');
  out.push('---');

  let lastGroup = '';
  let flagged = 0;

  for (const c of cases) {
    if (c.group && c.group !== lastGroup) {
      out.push('');
      out.push(`# ── ${c.group} ${'─'.repeat(Math.max(0, 88 - c.group.length))}`);
      lastGroup = c.group;
    }
    if (c.note) out.push(`# ${c.note}`);
    if (c.review) out.push(`# REVIEW: ${c.review}`);

    const { codes, value } = run(c);

    // An UNCODED error is never acceptable in the corpus: it cannot be asserted by a port.
    if (codes.some(x => x.startsWith('<'))) {
      out.push(`# REVIEW: uncoded error — ${codes.join(', ')}`);
      flagged++;
    }

    const tail = codes.length > 0
      ? `error_codes: [${codes.join(', ')}]`
      : ioLiteral(value);
    out.push(`~ ${c.name}, ${ioText(c.schema)}, ${ioText(c.input)}, ${tail}`);
  }

  if (flagged > 0) {
    console.log(`  ${flagged} row(s) flagged REVIEW (uncoded error)`);
  }
  return out.join('\n') + '\n';
}

export function emit(path: string, content: string, caseCount: number): void {
  writeFileSync(path, content, 'utf8');
  console.log(`${path}: ${caseCount} cases`);
}

export type { Case };
