import { readFileSync, readdirSync } from 'fs';
import { corpusPath } from './sibling-repos'
import { join } from 'path';
import parse from '../../src/parser/index';
import parseDefinitions from '../../src/parser/parse-defs';
import { loadObject, loadCollection } from '../../src/facade/load';

/**
 * X1 — run every validation corpus case through BOTH validation entry points.
 *
 *   npm run corpus:both
 *   npx tsx tools/corpus/verify-both.ts ../io-test-cases/validation/*.io
 *
 * the reference implementation validates from two directions, and they are SEPARATELY implemented:
 *
 *   text          -> parse()      -> src/schema/object-processor.ts   (359 lines)
 *   native values -> loadObject() -> src/schema/load-processor.ts     (289 lines)
 *
 * The specification requires them to agree: for the same schema and the same LOGICAL value, both
 * routes must reach the same outcome, with the same error codes in the same order
 * (io-specs conformance/validation-model.md#entry-points).
 *
 * Nothing enforced that. The architecture retrospective's verdict -- that validation is the
 * healthy part of the system and needs no rewrite -- rested on THIRTEEN probes chosen by hand,
 * twelve of which agreed. Thirteen hand-picked cases is an anecdote, and the ones a person reaches
 * for are the ones they already understand. This runner replaces the anecdote with the whole
 * corpus, and keeps replacing it as the corpus grows.
 *
 * A divergence here is close to undetectable from inside one implementation -- each route has its
 * own tests and both pass -- but it is fatal to a port, which reads the spec and builds ONE
 * validator. See ../io-test-cases/ARCHITECTURE-RETROSPECTIVE.md.
 */

// Default to the whole validation corpus. npm does not expand globs on Windows, so the directory
// is walked here rather than by the shell -- `npm run corpus:both` must work on every platform.
const DEFAULT_DIR = corpusPath('validation') ?? '';
const args = process.argv.slice(2);
const files = args.length > 0
  ? args
  : readdirSync(DEFAULT_DIR).filter(f => f.endsWith('.io')).sort().map(f => join(DEFAULT_DIR, f));

if (files.length === 0) {
  console.error(`no validation suites found in ${DEFAULT_DIR}`);
  process.exit(2);
}

/** Reduce a value to the corpus's neutral spelling, so the two routes are comparable at all. */
function norm(v: any): any {
  if (typeof v === 'bigint') return `#big:${v}`;
  if (v === null || typeof v !== 'object') return v === undefined ? null : v;
  if (v instanceof Uint8Array) return [...v];
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(norm);
  if (v.constructor?.name === 'Decimal') return String(v);
  const out: Record<string, any> = {};
  for (const k of Object.keys(v)) out[k] = norm(v[k]);
  return out;
}

/** Every error code a document surfaced, in order. The comparison subject. */
function codesOf(doc: any): string[] {
  return (doc?.getErrors?.() ?? []).map((e: any) => e.errorCode ?? `<${e?.name ?? 'uncoded'}>`);
}

/**
 * Bridge the text case to a NATIVE value — the "same logical value" the spec speaks of.
 *
 * The corpus writes its data positionally (`~ Alice, 15`), because that is how IO documents are
 * normally written. A native caller holds `{name: 'Alice', age: 15}`. Positional binding is part
 * of READING THE TEXT, not part of validating, so the bridge has to do it here — otherwise the two
 * routes would be handed genuinely different values and any comparison would be meaningless.
 *
 * The input is parsed with NO schema (so no validation runs and nothing is coerced), then its
 * positional keys are mapped onto the schema's member names. Where a member is itself
 * schema-shaped the mapping recurses, so a nested `{Bond Street, NY}` binds by name too.
 */
function toNative(value: any, schema: any): any {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date || value instanceof Uint8Array) return value;
  if (value.constructor?.name === 'Decimal') return value;

  const names: string[] = schema?.names ?? [];

  if (Array.isArray(value)) {
    // An array member's element schema, when it declares one. The element def is a MEMBERDEF, so
    // it has to be unwrapped the same way a named member is below: an object element carries its
    // member names on `of.schema`, not on `of`. Passing `of` unwrapped left the element's
    // positional keys unmapped, so `[{1}, {2}]` reached the native route as [{"0":1},{"0":2}] and
    // the two routes were compared on genuinely different values.
    const of = schema?.of ?? schema?.schema;
    return value.map(item => toNative(item, of?.schema ?? of));
  }

  const out: Record<string, any> = {};
  for (const key of Object.keys(value)) {
    // A positional key is an INDEX into the schema's member list; a named key is already bound.
    const asIndex = /^\d+$/.test(key) ? Number(key) : -1;
    const name = asIndex >= 0 && asIndex < names.length ? names[asIndex] : key;
    const memberDef = schema?.defs?.[name];
    out[name] = toNative(value[key], memberDef?.schema ?? memberDef);
  }
  return out;
}

/** The member names `$schema` declares, or an empty list when it declares none. */
function schemaNames(defs: any): string[] {
  try {
    return defs?.getV('$schema')?.names ?? [];
  } catch {
    return [];
  }
}

/** Why a case could not be run both ways. Reported, never silently skipped. */
type Unbridgeable =
  | 'no-schema'
  | 'input-does-not-parse'
  | 'schema-does-not-compile'
  | 'text-only:duplicate-member'
  | 'ambiguous:record-enclosure'
  | 'no-native-form:empty-section'
  | 'no-native-form:positional-surplus'
  | 'DEFERRED:accumulation-mode';

/**
 * The categories above are LIMITS OF THE BRIDGE — there is nothing for the two routes to
 * disagree about. `DEFERRED:accumulation-mode` is not one of those, and is named in capitals so it
 * cannot be read as one.
 *
 * It marks a REAL disagreement that is knowingly parked: given the same value and the same
 * `errorCollector`, the text route accumulates every failure while the load route reports only the
 * first. Two public entry points, one document, different error counts. Recorded as ISSUE-28 and
 * parked under ADR 0001, which already defers the whole question of how validation mode is chosen.
 *
 * It is carved out so the gate keeps catching NEW divergences instead of sitting permanently red,
 * and it is reported in its own block so it stays visible while it is unfixed.
 */
const DEFERRED: ReadonlySet<Unbridgeable> = new Set<Unbridgeable>(['DEFERRED:accumulation-mode']);

/**
 * Conditions that exist only in the NOTATION, with no counterpart in a native value -- so there is
 * nothing for the two routes to disagree about.
 *
 *   duplicate-member  a native map cannot hold one key twice; the duplicate is gone before the
 *                     native route ever sees the value
 *
 * POSITIONAL surplus (`Alice, 30, extra`) used to be listed here too, under its own code
 * `additional-values-not-allowed`. It no longer is: both spellings of "a closed schema was given a
 * member it does not declare" now report `unknown-member`, so the case is genuinely compared rather
 * than carved out. See ADR 0002, the error-code grammar and taxonomy 6.4.
 */
const TEXT_ONLY: ReadonlyMap<string, Unbridgeable> = new Map<string, Unbridgeable>([
  ['duplicate-member', 'text-only:duplicate-member'],
]);

interface Row { name: string; schema?: string; input?: string; expected?: any; error_codes?: string[] }

let agree = 0;
let diverge = 0;
const unbridgeable = new Map<Unbridgeable, string[]>();
const note = (why: Unbridgeable, name: string) => {
  if (!unbridgeable.has(why)) unbridgeable.set(why, []);
  unbridgeable.get(why)!.push(name);
};

for (const file of files) {
  const suite: any = parse(readFileSync(file, 'utf8'), null);
  if (codesOf(suite).length > 0) {
    console.log(`FAIL ${file} — the suite file itself does not parse`);
    diverge++;
    continue;
  }
  const projected: any = suite.toObject();
  const rows: Row[] = Array.isArray(projected) ? projected : (projected?.data ?? []);

  let suiteAgree = 0;
  let suiteDiverge = 0;

  for (const row of rows) {
    if (row.input === undefined) continue;
    if (row.schema === undefined) { note('no-schema', row.name); continue; }

    const schemaSource = `~ $schema: { ${row.schema} }`;

    // ---- Route 1: text -----------------------------------------------------------------------
    let textCodes: string[];
    let textValue: any = null;
    try {
      const doc: any = parse(`${schemaSource}\n---\n${row.input}\n`, null);
      textCodes = codesOf(doc);
      textValue = textCodes.length > 0 ? null : doc.toObject();
    } catch (e: any) {
      textCodes = [e?.errorCode ?? `<${e?.name ?? 'uncoded'}>`];
    }

    // ---- The bridge: the same logical value, natively ----------------------------------------
    let native: any;
    let defs: any;
    // The SCHEMA is compiled first and separately: when it is the schema that fails, saying "input
    // does not parse" sends a reader to look at the wrong column. Several rows deliberately hold an
    // invalid schema (`default: notanumber`), and the text route already asserts what they report.
    try {
      defs = parseDefinitions(schemaSource);
    } catch {
      note('schema-does-not-compile', row.name);
      continue;
    }
    try {
      const schema = defs?.getV('$schema');
      // Parsed WITHOUT a schema: structure only, no validation, no coercion.
      const raw: any = parse(`---\n${row.input}\n`, null);
      if (codesOf(raw).length > 0) { note('input-does-not-parse', row.name); continue; }
      const structural: any = raw.toObject();
      // A top-level COLLECTION validates every record against the same schema, so each item is
      // bridged against that schema -- not against an element schema, which a root collection
      // has no notion of.
      native = Array.isArray(structural)
        ? structural.map((item: any) => toNative(item, schema))
        : toNative(structural, schema);
    } catch {
      note('input-does-not-parse', row.name);
      continue;
    }

    // An EMPTY data section has no native counterpart: "a document with no record" is not a value a
    // host program can hold, and handing the native route `null` asks it a different question. The
    // text route's own answer (an absent or defaulted member) is still asserted by the ordinary
    // corpus runner -- it is only the CROSS-ROUTE comparison that has nothing to compare.
    if (row.input.trim() === '') { note('no-native-form:empty-section', row.name); continue; }

    // A condition that exists only in the notation has no native counterpart to compare against.
    const textOnly = textCodes.map(c => TEXT_ONLY.get(c)).find(Boolean);
    if (textOnly) { note(textOnly, row.name); continue; }

    // Top-level braces read either as the record's own enclosure or as a single value (ISSUE-15).
    // The structural parse must pick one, so the two routes would be handed genuinely different
    // values -- a limit of the BRIDGE, not a disagreement between the validators.
    // A leading `~` is the record marker, not part of the value, so it must be stripped before
    // asking whether the record is brace-enclosed: `~ {x: 5}` is exactly as ambiguous as `{x: 5}`.
    const trimmed = row.input.trim().replace(/^~\s*/, '');
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      note('ambiguous:record-enclosure', row.name);
      continue;
    }

    // ---- Route 2: native values --------------------------------------------------------------
    let loadCodes: string[];
    let loadValue: any = null;
    try {
      // `errorCollector` is an ARRAY the loader pushes into, not a callback.
      const errors: any[] = [];
      const loaded: any = Array.isArray(native)
        ? loadCollection(native, defs, { errorCollector: errors })
        : loadObject(native, defs, { errorCollector: errors });
      loadCodes = errors.map((e: any) => e.errorCode ?? `<${e?.name ?? 'uncoded'}>`);
      loadValue = loadCodes.length > 0 ? null : loaded?.toObject?.() ?? loaded;
    } catch (e: any) {
      loadCodes = [e?.errorCode ?? `<${e?.name ?? 'uncoded'}>`];
    }

    // ---- The assertion -----------------------------------------------------------------------
    const codesAgree = JSON.stringify(textCodes) === JSON.stringify(loadCodes);
    // Values are compared only where both routes accepted; a rejected value is not meaningful.
    const valuesAgree = textCodes.length > 0 || JSON.stringify(norm(textValue)) === JSON.stringify(norm(loadValue));

    if (codesAgree && valuesAgree) { agree++; suiteAgree++; continue; }

    // A POSITIONAL SURPLUS has no native counterpart. `~ x, 2` against `{a: int}` gives the text
    // route a value at index 1 with no member to bind it to; the bridge can only put it in a map
    // under the key "1", which is a member NAMED "1" and a different question. The two routes may
    // then disagree about which fault to report first — the surplus or the type error — and
    // neither is wrong. (A NAMED surplus, `a: 1, b: 2`, bridges exactly and is always compared.)
    //
    // Checked HERE rather than before route 2, and only where they actually disagree: several
    // positional-surplus cases DO agree, and carving them out up front silently dropped coverage.
    if (!codesAgree || !valuesAgree) {
      const declared = new Set<string>(schemaNames(defs));
      const bridged: any[] = Array.isArray(native) ? native : [native];
      const positionalSurplus = bridged.some(rec =>
        rec !== null && typeof rec === 'object' && !Array.isArray(rec) &&
        Object.keys(rec).some(k => /^\d+$/.test(k) && !declared.has(k)));
      if (positionalSurplus) { note('no-native-form:positional-surplus', row.name); continue; }
    }

    // Load STOPPED EARLY: its codes are a strict prefix of the text route's, so the two agree on
    // every failure the load route got to and differ only in how many it went on to find. That is
    // ISSUE-28, parked under ADR 0001. Deliberately a PREFIX test rather than a subset or a count:
    // a different first code is a different phenomenon and must still be reported.
    const stoppedEarly =
      loadCodes.length > 0 &&
      loadCodes.length < textCodes.length &&
      loadCodes.every((c, i) => c === textCodes[i]);
    if (stoppedEarly && valuesAgree) { note('DEFERRED:accumulation-mode', row.name); continue; }

    diverge++; suiteDiverge++;
    console.log(`DIVERGE ${file} :: ${row.name}`);
    console.log(`   schema  ${row.schema}`);
    console.log(`   input   ${JSON.stringify(row.input)}`);
    console.log(`   native  ${JSON.stringify(norm(native))}`);
    if (!codesAgree) {
      console.log(`   codes   text=${JSON.stringify(textCodes)}  load=${JSON.stringify(loadCodes)}`);
    }
    if (!valuesAgree) {
      console.log(`   value   text=${JSON.stringify(norm(textValue))}`);
      console.log(`           load=${JSON.stringify(norm(loadValue))}`);
    }
  }

  const tag = suiteDiverge > 0 ? 'DIVERGE' : '  ok   ';
  console.log(`${tag} ${file.padEnd(48)} ${String(suiteAgree).padStart(3)} agree, ${suiteDiverge} diverge`);
}

console.log(`\n${agree + diverge} cases run both ways: ${agree} agree, ${diverge} DIVERGE`);
for (const [why, names] of [...unbridgeable].sort()) {
  const label = DEFERRED.has(why as Unbridgeable) ? 'KNOWN DEFECT, carved out' : 'not compared';
  console.log(`${String(names.length).padStart(3)} ${label} — ${why.padEnd(34)} ${names.join(', ')}`);
}
process.exit(diverge > 0 ? 1 : 0);
