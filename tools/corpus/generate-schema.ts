import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import parseSchema from '../../src/schema/parse-schema';
import { projectSchema } from './runner';

/**
 * Generate a `schema/*.io` corpus suite, deriving every compiled shape by RUNNING io-js2.
 *
 *   npx tsx tools/corpus/suites-schema.ts
 *
 * The schema suite is the stage between parsing and validation: a definition STRING in, a
 * normalized member description out. It is the stage a port is most likely to get subtly wrong,
 * because almost none of it is visible from the outside — member ORDER, the dotted `path` of a
 * nested member, and which constraint keys survive compilation only show up when something
 * downstream depends on them.
 *
 * Until 2026-08-22 these files were hand-written and, worse, never executed: the corpus runner had
 * no `schemaDef` comparator. Running them for the first time found thirteen stale error codes. This
 * generator exists so that can never recur — the shapes come from the compiler, and the emitted
 * suite is verified before it is written.
 *
 * The emitted `expected` is the SUBSET a case asserts, not everything the compiler carries. io-js2
 * puts `format: "auto"`, `encloser` and `escapeLines: false` on every string memberdef, and spells
 * `optional: false` where the corpus omits it; asserting those would be asserting io-js2's
 * bookkeeping rather than Internet Object. So each row lists the load-bearing keys — `name`,
 * `type`, `path`, and any constraint actually declared — and matching is contains, not equals.
 */

export interface SchemaCase {
  /** Unique within the suite; snake_case. */
  name: string;
  /** The schema definition string handed to the compiler. */
  schemaDef: string;
  /** Optional note rendered as a comment above the row. */
  note?: string;
  /** Start a new commented group. */
  group?: string;
  /** Pin current behaviour while flagging it as suspect. */
  review?: string;
  /**
   * Extra memberdef keys to assert beyond the defaults. The generator always asserts `name`,
   * `type` and `path`; a case declaring `min: 0` should list 'min' here so the row pins it.
   * Applied at every depth.
   */
  keys?: string[];
}

/** Keys asserted on every member, at every depth. */
const CORE_KEYS = ['name', 'type', 'path'];

/** Keys asserted only when TRUE, because the corpus spells absence as false. */
const FLAG_KEYS = ['optional', 'null'];

function ioKey(k: string): string {
  // `null` unquoted is the null literal and would make the member positional — schema/README.md.
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) && k !== 'null' ? k : JSON.stringify(k);
}

const KEYWORDS = new Set(['null', 'N', 'T', 'F', 'true', 'false', 'NaN', 'Inf']);

function ioLiteral(v: any): string {
  if (v === null || v === undefined) return 'N';
  if (typeof v === 'boolean') return v ? 'T' : 'F';
  if (typeof v === 'bigint') return `${v}n`;
  if (typeof v === 'number') {
    return Number.isFinite(v) ? String(v) : (Number.isNaN(v) ? 'NaN' : (v > 0 ? 'Inf' : '-Inf'));
  }
  if (v instanceof RegExp) return JSON.stringify(v.source);
  if (v?.constructor?.name === 'Decimal') return `${String(v)}m`;
  if (Array.isArray(v)) return `[${v.map(ioLiteral).join(', ')}]`;
  if (typeof v === 'object') {
    return `{ ${Object.keys(v).map(k => `${ioKey(k)}: ${ioLiteral(v[k])}`).join(', ')} }`;
  }
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(v) && !KEYWORDS.has(v) ? v : JSON.stringify(v);
}

function ioText(s: string): string {
  const esc = s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  return esc.includes('"') ? `'${esc.replace(/'/g, "\\'")}'` : `"${esc}"`;
}

/** Reduce a projected memberdef to the keys a case asserts. */
function pickMember(md: any, extra: string[]): any {
  if (md === null || typeof md !== 'object') return md;
  const out: Record<string, any> = {};
  for (const k of CORE_KEYS) {
    if (md[k] !== undefined) out[k] = md[k];
  }
  for (const k of FLAG_KEYS) {
    if (md[k] === true) out[k] = true;                 // absence means false; only pin the true
  }
  for (const k of extra) {
    if (md[k] !== undefined && !(k in out)) out[k] = md[k];
  }
  if (md.schema !== undefined) out.schema = pickSchema(md.schema, extra);
  if (md.of !== undefined) out.of = pickMember(md.of, extra);
  return out;
}

/** Reduce a projected schema to `{ open, members }` with only the asserted keys. */
function pickSchema(schema: any, extra: string[]): any {
  if (schema === null || typeof schema !== 'object') return schema;
  return {
    open: typeof schema.open === 'object' && schema.open !== null
      ? pickMember(schema.open, extra)
      : schema.open,
    members: (schema.members ?? []).map((m: any) => pickMember(m, extra)),
  };
}

export interface SchemaSuiteSpec {
  file: string;
  description: string;
  header: string[];
  cases: SchemaCase[];
}

export function emitSchemaSuite(path: string, spec: SchemaSuiteSpec): number {
  const rows: string[] = [];
  rows.push(...spec.header.map(l => `# ${l}`));
  rows.push('# A schema case compiles a schema DEFINITION STRING into a normalized member/memberdef');
  rows.push('# description. `expected` is the neutral compiled shape (see schema/README.md): an');
  rows.push('# ordered `members` list plus `open`. Matching is SUBSET/contains — only load-bearing');
  rows.push('# keys are listed, because the compiler also carries bookkeeping (format, encloser,');
  rows.push('# escapeLines) that is io-js2\'s business and not the format\'s.');
  rows.push('# GENERATED by io-js2 tools/corpus/suites-schema.ts — edit the case table there.');
  rows.push('~ version: 1.0');
  rows.push(`~ description: ${ioText(spec.description)}`);
  rows.push('~ $schema: { name: string, schemaDef: string, expected?: any, error_codes?: array }');
  rows.push('---');

  let lastGroup = '';
  let count = 0;
  const flagged: string[] = [];

  for (const c of spec.cases) {
    if (c.group && c.group !== lastGroup) {
      rows.push('');
      rows.push(`# ── ${c.group} ${'─'.repeat(Math.max(0, 86 - c.group.length))}`);
      lastGroup = c.group;
    }
    if (c.note) rows.push(`# ${c.note}`);
    if (c.review) rows.push(`# REVIEW: ${c.review}`);

    let compiled: any = null;
    let code: string | null = null;
    try {
      compiled = parseSchema(c.schemaDef, null);
    } catch (e: any) {
      code = e?.errorCode ?? null;
      if (!code) {
        // An UNCODED error is never acceptable: a port cannot assert on a bare message.
        flagged.push(`${c.name}: uncoded error — ${e?.message ?? e}`);
        rows.push(`# REVIEW: uncoded error — ${String(e?.message ?? e).slice(0, 70)}`);
        code = `<uncoded>`;
      }
    }

    if (code !== null) {
      rows.push(`~ ${c.name}, ${ioText(c.schemaDef)},`);
      rows.push(`    error_codes: [${code}]`);
    } else {
      const shape = pickSchema(projectSchema(compiled), c.keys ?? []);
      rows.push(`~ ${c.name}, ${ioText(c.schemaDef)},`);
      rows.push(`    ${ioLiteral(shape)}`);
    }
    count++;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, rows.join('\n') + '\n', 'utf8');
  const flag = flagged.length ? `  (${flagged.length} REVIEW)` : '';
  console.log(`${path}: ${count} cases${flag}`);
  for (const f of flagged) console.log(`    ${f}`);
  return count;
}

export function assertUniqueSchemaNames(spec: SchemaSuiteSpec): void {
  const seen = new Set<string>();
  for (const c of spec.cases) {
    if (seen.has(c.name)) throw new Error(`${spec.file}: duplicate case name '${c.name}'`);
    seen.add(c.name);
  }
}
