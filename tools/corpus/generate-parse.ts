import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import parse from '../../src/parser/index';

/**
 * Generate a whole-document corpus suite (`document/`, `parser/`, `regression/`), deriving every
 * expectation by RUNNING io-js2.
 *
 * The corpus's golden rule is that expected values are *observed*, never guessed. A hand-written
 * expectation is a second implementation, and when it disagrees with the reference nobody can tell
 * which one is wrong. So a case here supplies only the INPUT; the outcome is whatever io-js2
 * actually produces.
 *
 * That puts the intellectual work where it belongs: choosing cases that matter. A generator cannot
 * decide that a section boundary is worth probing next to a `~` record; it can only make sure that
 * once you have said so, the recorded answer is true.
 *
 * IMPORTANT: generated output is a STARTING POINT, not law. Every row must still be read against
 * the spec, because io-js2 can be wrong — several corpus cases exist precisely to pin a behaviour
 * later found to be a bug. Rows whose outcome looks suspect are flagged `# REVIEW:` rather than
 * silently accepted, and an UNCODED error is always flagged: a port cannot assert on a bare
 * message.
 *
 * The execution half MUST match `tools/corpus/runner.ts`'s `valueCase`, or the corpus would record
 * one thing and assert another. It is duplicated in ten lines rather than shared, because the
 * runner returns a comparison and this needs the raw outcome; the two are checked against each
 * other by the simple fact that a freshly generated suite must pass immediately.
 */

export interface Case {
  /** Unique within the suite; snake_case. */
  name: string;
  /** The whole document text. */
  input: string;
  /** Optional note rendered as a comment above the row. */
  note?: string;
  /** Start a new commented group. */
  group?: string;
  /**
   * Pin the CURRENT behaviour while flagging it as suspect. Emits a `# REVIEW:` comment above the
   * row. A corpus case says "this is the rule"; a reviewed case says "this is what happens, and it
   * may be a bug" — without which a defect quietly becomes law the moment it is written down.
   */
  review?: string;
}

/** Bare words the reader resolves to a value rather than a string. */
const KEYWORDS = new Set(['null', 'N', 'T', 'F', 'true', 'false', 'NaN', 'Inf']);

function ioKey(k: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : JSON.stringify(k);
}

/** An IO literal for a projected value, matching how the existing suites spell them. */
export function ioLiteral(v: any): string {
  if (v === null || v === undefined) return 'N';
  if (typeof v === 'boolean') return v ? 'T' : 'F';
  if (typeof v === 'bigint') return `${v}n`;
  if (typeof v === 'number') {
    return Number.isFinite(v) ? String(v) : (Number.isNaN(v) ? 'NaN' : (v > 0 ? 'Inf' : '-Inf'));
  }
  if (v instanceof Date) return `dt"${v.toISOString()}"`;
  if (v instanceof Uint8Array) return `b"${Buffer.from(v).toString('base64')}"`;
  if (v?.constructor?.name === 'Decimal') return `${String(v)}m`;
  if (Array.isArray(v)) return `[${v.map(ioLiteral).join(', ')}]`;
  if (typeof v === 'object') {
    return `{ ${Object.keys(v).map(k => `${ioKey(k)}: ${ioLiteral(v[k])}`).join(', ')} }`;
  }
  // A string is written bare only when it round-trips AS A STRING. A bare `null`, `N`, `T`, `F`,
  // `true`, `false`, `NaN` or `Inf` is a KEYWORD, so the string "null" written bare would read back
  // as the null value — the writer emitting text its own reader reads differently, which is the
  // defect class this corpus exists to catch.
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(v) && !KEYWORDS.has(v) ? v : JSON.stringify(v);
}

/** A quoted IO string for the `input` column, whichever quote keeps it readable. */
export function ioText(s: string): string {
  const escaped = s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\r/g, '\\r');
  return escaped.includes('"') ? `'${escaped.replace(/'/g, "\\'")}'` : `"${escaped}"`;
}

export interface Outcome { codes: string[]; value: any }

/** Run one case exactly the way `tools/corpus/runner.ts` will, so the two cannot disagree. */
export function observe(input: string): Outcome {
  try {
    const doc: any = parse(input, null);
    const codes = (doc.getErrors?.() ?? []).map((e: any) => e.errorCode ?? `<${e?.name ?? 'uncoded'}>`);
    return { codes, value: codes.length > 0 ? null : doc.toObject() };
  } catch (e: any) {
    return { codes: [e?.errorCode ?? `<${e?.name ?? 'uncoded'}>`], value: null };
  }
}

export interface SuiteSpec {
  /** Output path, relative to the corpus root. */
  file: string;
  /** `~ description` in the header. */
  description: string;
  /** Leading `#` comment lines — say where the file comes from and what it asserts. */
  header: string[];
  cases: Case[];
}

export function generate(spec: SuiteSpec): { content: string; flagged: number } {
  const out: string[] = [];
  out.push(...spec.header.map(l => `# ${l}`));
  out.push('~ version: 1.0');
  out.push(`~ description: ${ioText(spec.description)}`);
  // `expected` must accept N: a case whose outcome is a null value, or whose document is empty,
  // records `N` here — and `any` is NOT nullable by default.
  out.push('~ $schema: { name: string, input: string, expected?: {any, "null": T}, error_codes?: array }');
  out.push('---');

  let lastGroup = '';
  let flagged = 0;

  for (const c of spec.cases) {
    if (c.group && c.group !== lastGroup) {
      out.push('');
      out.push(`# ── ${c.group} ${'─'.repeat(Math.max(0, 88 - c.group.length))}`);
      lastGroup = c.group;
    }
    if (c.note) out.push(`# ${c.note}`);
    if (c.review) out.push(`# REVIEW: ${c.review}`);

    const { codes, value } = observe(c.input);

    // An UNCODED error is never acceptable in the corpus: a port cannot assert on a bare message.
    if (codes.some(x => x.startsWith('<'))) {
      out.push(`# REVIEW: uncoded error — ${codes.join(', ')}`);
      flagged++;
    }

    const tail = codes.length > 0 ? `error_codes: [${codes.join(', ')}]` : ioLiteral(value);
    out.push(`~ ${c.name}, ${ioText(c.input)}, ${tail}`);
  }

  return { content: out.join('\n') + '\n', flagged };
}

export function emit(path: string, spec: SuiteSpec): number {
  const { content, flagged } = generate(spec);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  const flag = flagged > 0 ? `  (${flagged} REVIEW)` : '';
  console.log(`${path}: ${spec.cases.length} cases${flag}`);
  return spec.cases.length;
}

/** Fail loudly on a duplicate name — a duplicate silently overwrites nothing but confuses reports. */
export function assertUniqueNames(spec: SuiteSpec): void {
  const seen = new Set<string>();
  for (const c of spec.cases) {
    if (seen.has(c.name)) throw new Error(`${spec.file}: duplicate case name '${c.name}'`);
    seen.add(c.name);
  }
}
