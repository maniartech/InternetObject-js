import { loadInferred } from '../../src/facade/load-inferred';
import { isErrorValue } from '../../src/parser/nodes/error';
import { stringifyDocument } from '../../src/facade/stringify-document';
import parse from '../../src/parser/index';
import Decimal from '../../src/core/decimal/decimal';

/**
 * The invariants a value must satisfy on its way through IO and back.
 *
 * Checked in BOTH compact and formatted output. That is not redundancy: the
 * array-printed-as-an-object bug reproduced ONLY with `indent` set -- the mode the playground
 * uses -- and a compact-only suite reported green throughout.
 */

export const MODES = [
  { label: 'compact', opts: { includeHeader: true, includeTypes: true } },
  { label: 'formatted', opts: { includeHeader: true, includeTypes: true, indent: 2 } },
] as const;

export interface Failure {
  property: string;
  mode: string;
  detail: string;
}

/**
 * Flatten the live objects a parsed document hands back into plain JS.
 *
 * `toJSON()` is only half a projection today (OPEN-DECISIONS D3): a nested record comes back as a
 * live `InternetObject`, whose data lives in an internal map rather than in own properties. Both
 * `shapeOf` and `normalize` read own keys, so an unflattened record looked EMPTY -- and every
 * document with a nested record was reported as a shape failure. That is a defect in this harness,
 * not in the library, and left in place it hides the failures worth reading.
 */
function plain(v: any): any {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof Date || v instanceof Uint8Array || v instanceof Decimal) return v;
  if (Array.isArray(v)) return v.map(plain);
  if (typeof v.entries === 'function' && typeof v.forEach === 'function' && !(v instanceof Map)) {
    const out: Record<string, any> = {};
    let i = 0;
    for (const [key, val] of v.entries()) out[key ?? i++] = plain(val);
    return out;
  }
  if (typeof (v as any)[Symbol.iterator] === 'function') return [...v].map(plain);
  const out: Record<string, any> = {};
  for (const k of Object.keys(v)) out[k] = plain(v[k]);
  return out;
}

/**
 * A value's SHAPE only -- the array/object/leaf skeleton, with no values in it.
 *
 * Keys are SORTED, because a record bound to a schema is written in SCHEMA order: give IO
 * `{"code:en": …, "true": …}` against a schema declaring `true` then `code:en` and it comes back in
 * the schema's order. That is the format working as designed, not a shape change -- the same reason
 * `deepEqual` below compares objects order-insensitively. Comparing key ORDER here reported those
 * documents as shape failures and buried the genuine ones (a Decimal printed as its internals was
 * sitting underneath).
 *
 * ARRAY order is still significant and still compared: sorting applies to object keys only.
 */
function shapeOf(v: any): any {
  if (Array.isArray(v)) return { k: 'a', i: v.map(shapeOf) };
  if (v !== null && typeof v === 'object' &&
      !(v instanceof Date) && !(v instanceof Uint8Array) && !(v instanceof Decimal)) {
    const out: Record<string, any> = {};
    for (const key of Object.keys(v).sort()) out[key] = shapeOf(v[key]);
    return { k: 'o', v: out };
  }
  return { k: 'l' };
}

/**
 * Normalize for value comparison. The two sides come from different worlds -- one is the JS input,
 * the other is a parsed document -- so typed values are reduced to comparable primitives. NaN is
 * tagged because `NaN !== NaN`, and -0 is folded into 0 because IO has one zero.
 */
function normalize(v: any): any {
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return '#NaN';
    if (v === 0) return 0;
    return v;
  }
  if (typeof v === 'bigint') return `#big:${v}`;
  if (v instanceof Decimal) return `#dec:${v.toString()}`;
  if (v instanceof Date) return `#date:${v.toISOString()}`;
  if (v instanceof Uint8Array) return `#bin:${Array.from(v).join(',')}`;
  if (Array.isArray(v)) return v.map(normalize);
  if (v !== null && typeof v === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(v)) out[k] = normalize(v[k]);
    return out;
  }
  return v;
}

/** Structural equality over normalized trees, ignoring key ORDER (schema order is canonical). */
function deepEqual(a: any, b: any): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.length !== kb.length || !ka.every((k, i) => k === kb[i])) return false;
    return ka.every(k => deepEqual(a[k], b[k]));
  }
  return Object.is(a, b);
}

/**
 * True when a value is carried as a record (or a collection of them) without promotion: a plain
 * object, or an array whose items are records. Anything else -- an array of scalars, an array of
 * arrays, a bare scalar -- is promoted by IO to `{ "0": <value> }`.
 */
function isRecordish(v: any): boolean {
  const isRecord = (x: any) => x !== null && typeof x === 'object' && !Array.isArray(x) &&
    !(x instanceof Date) && !(x instanceof Uint8Array) && !(x instanceof Decimal);
  if (Array.isArray(v)) return v.some(isRecord);
  return isRecord(v);
}

const brief = (s: string, n = 220) => (s.length > n ? s.slice(0, n) + ' …' : s);

/** The error codes of any failed records a document holds, in order. Empty for a clean document. */
function failedRecords(doc: any): string[] {
  const codes: string[] = [];
  const sections = doc?.sections;
  for (let i = 0; i < (sections?.length ?? 0); i++) {
    const data = sections.getAt(i)?.data;
    if (!data || typeof data[Symbol.iterator] !== 'function') continue;
    for (const item of data as Iterable<any>) {
      if (isErrorValue(item)) codes.push(item?.errorCode ?? item?.error?.errorCode ?? 'uncoded');
    }
  }
  return codes;
}

/**
 * Run every property against one generated value. Returns [] when the value is clean.
 *
 * Properties, in the order a failure would cascade:
 *  1. inference does not throw
 *  1a. inference produces no error node -- a document holding a failed record is a defect where
 *      it was BUILT, and saying so there beats reporting it at the step that catches it
 *  2. serialization does not throw
 *  3. the emitted document re-parses with zero errors  -- output must be readable at all
 *  4. SHAPE survives   -- an array stays an array, an object stays an object
 *  5. VALUE survives   -- the data itself is unchanged
 *  6. serialization is idempotent -- write(parse(write(v))) === write(v)
 */
export function checkValue(value: any): Failure[] {
  const failures: Failure[] = [];

  for (const { label, opts } of MODES) {
    let doc: any;
    try {
      doc = loadInferred(value);
    } catch (e: any) {
      failures.push({ property: 'infer-does-not-throw', mode: label, detail: brief(String(e?.message ?? e)) });
      continue;
    }

    // Inference must not produce a document that holds a FAILED record. Since B3 (ADR 0005)
    // serialization refuses such a document, so without this check the failure would be reported
    // against `stringify` -- naming the step that caught the fault rather than the one that
    // committed it. Before B3 the same input surfaced one step later still, as `output-reparses`:
    // the error blob went into the text and came back as something else.
    const embedded = failedRecords(doc);
    if (embedded.length > 0) {
      failures.push({ property: 'infer-produces-no-error-node', mode: label, detail: brief(embedded.join(', ')) });
      continue;
    }

    let io: string;
    try {
      io = stringifyDocument(doc, opts as any);
    } catch (e: any) {
      failures.push({ property: 'stringify-does-not-throw', mode: label, detail: brief(String(e?.message ?? e)) });
      continue;
    }

    let back: any;
    try {
      back = parse(io, null);
    } catch (e: any) {
      failures.push({ property: 'output-reparses', mode: label, detail: `THROW ${brief(String(e?.message ?? e))} || ${brief(io)}` });
      continue;
    }

    const errs = back.getErrors?.() ?? [];
    if (errs.length > 0) {
      // An error that escaped the validation machinery carries no `errorCode`. Printing it as an
      // empty slot made the detail read `errors []` -- a failure with no visible reason at all.
      const codes = errs.map((e: any) => e.errorCode ?? `<${e.name ?? 'uncoded'}>`).join(',');
      failures.push({ property: 'output-reparses', mode: label, detail: `errors [${codes}] || ${brief(io)}` });
      continue;
    }

    let result: any;
    try {
      // toObject(), NOT toJSON(): the round-trip property is about the VALUE surviving, and
      // toObject keeps values live (OPEN-DECISIONS D3). Comparing against toJSON's projection
      // reported every Date, Decimal and byte array as a value failure -- the projection doing
      // exactly its job.
      result = plain(back.toObject());
    } catch (e: any) {
      failures.push({ property: 'result-projects', mode: label, detail: brief(String(e?.message ?? e)) });
      continue;
    }

    // IO accepts a non-object root value and PROMOTES it to a record under its positional key:
    // `---` then `[1, 2, 3]` reads as `{ "0": [1, 2, 3] }`, by the format's own rule rather than by
    // any choice of this library. Compare against the promoted form so the fuzzer reports real
    // defects instead of re-reporting the spec.
    const expected = isRecordish(value) ? value : { '0': value };

    if (JSON.stringify(shapeOf(normalize(result))) !== JSON.stringify(shapeOf(normalize(expected)))) {
      failures.push({ property: 'shape-preserved', mode: label, detail: brief(io) });
    }

    if (!deepEqual(normalize(expected), normalize(result))) {
      failures.push({
        property: 'value-preserved',
        mode: label,
        detail: `in=${brief(JSON.stringify(normalize(expected)), 120)} out=${brief(JSON.stringify(normalize(result)), 120)}`,
      });
    }

    // Idempotence: re-serializing the re-parsed document must reproduce the same text. A writer
    // that keeps changing its mind has no canonical form, which makes diffing output meaningless.
    try {
      const again = stringifyDocument(back, opts as any);
      if (again !== io) {
        failures.push({ property: 'stringify-idempotent', mode: label, detail: `a=${brief(io, 110)} b=${brief(again, 110)}` });
      }
    } catch (e: any) {
      failures.push({ property: 'stringify-idempotent', mode: label, detail: `THROW ${brief(String(e?.message ?? e))}` });
    }
  }

  return failures;
}

/** True when a value fails at least one property -- the predicate the shrinker minimizes against. */
export function fails(value: any): boolean {
  try {
    return checkValue(value).length > 0;
  } catch {
    return true;
  }
}
