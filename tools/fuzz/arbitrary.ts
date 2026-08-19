import { Rng } from './rng';
import Decimal from '../../src/core/decimal/decimal';

/**
 * Value generation for the round-trip fuzzer.
 *
 * Deliberately NOT a generic JS-value generator. Every bug this project has actually shipped came
 * from a narrow set of shapes -- ambiguous strings, arrays of arrays, maps with dynamic keys,
 * heterogeneous arrays, empty containers -- so the distribution is weighted toward those rather
 * than toward uniformly random junk, which mostly re-tests the easy paths.
 */

export interface GenOptions {
  /** Nesting budget. Depth 0 yields only scalars. */
  maxDepth: number;
  /** Include inputs that trip KNOWN, already-tracked defects (off by default -- see KNOWN_LIMITATIONS). */
  includeKnownFailures: boolean;
}

export const DEFAULT_OPTS: GenOptions = { maxDepth: 4, includeKnownFailures: false };

/**
 * Inputs excluded by default because they fail for a REASON WE ALREADY KNOW. Keeping them out
 * means a quiet run is meaningful; a fuzzer that rediscovers the same open issue on every seed
 * teaches nothing. Flip `includeKnownFailures` to confirm one is still broken (or fixed).
 */
export const KNOWN_LIMITATIONS = [
  'ISSUE-17: a string beginning `@` or `$` is resolved as a variable/schema reference even when ' +
    'quoted, and throws; there is currently no way to represent one as data.',
];

/** Strings that are ambiguous, structural, or have historically broken something. */
const NASTY_STRINGS = [
  '',                      // empty -- must quote or it vanishes
  ' ', '  pad  ', 'trail ', ' lead',   // whitespace is lost by an open string
  'T', 'F', 'N', 'true', 'false', 'null',   // keyword collisions
  '0', '007', '3.14', '-5', '.5', '1e10', 'Inf', '-Inf', 'NaN',  // number-lookalikes
  '2024-03-20', '14:30:00', '2024-03-20T14:30:00.000Z',          // date/time-lookalikes
  'has, comma', 'has: colon', 'has {brace}', 'has [bracket]',
  'has "quote"', "has 'apostrophe'", 'has \\backslash',
  'has ~tilde', 'has #hash', 'has\nnewline', 'has\ttab',
  '---', 'x --- y', 'a---b',   // the section separator, mid-value
  'plain', 'Hello World', 'cafe', 'unicode-text', 'emoji',
];

/** Keys carry the same hazards as strings, plus wildcard/positional collisions. */
const NASTY_KEYS = [
  'a', 'b', 'name', 'id', 'value',
  '0', '1', '2', '10',           // positional-looking
  'true', 'null', 'N',           // keyword-looking
  'a:b', 'code:en', 'a,b',       // colon/comma (issue #61)
  'has space', ' lead', 'trail ',
  '*',                            // wildcard token -- must degrade, not corrupt
  'kebab-case', 'snake_case', 'notref', 'cafe',
];

const SPECIAL_NUMBERS = [0, -0, 1, -1, 0.5, -0.5, 3.14159, 1e21, 1e-7, Number.MAX_SAFE_INTEGER,
  -Number.MAX_SAFE_INTEGER, Infinity, -Infinity, NaN];

function genString(rng: Rng, opts: GenOptions): string {
  if (rng.chance(0.7)) {
    const s = rng.pick(NASTY_STRINGS);
    // `@`/`$`-leading strings are a known parser defect (ISSUE-17).
    if (!opts.includeKnownFailures && /^[@$]/.test(s)) return 'plain';
    return s;
  }
  const len = rng.int(0, 12);
  let out = '';
  for (let i = 0; i < len; i++) out += String.fromCharCode(rng.int(32, 126));
  if (!opts.includeKnownFailures && /^[@$]/.test(out)) out = 'x' + out;
  return out;
}

function genKey(rng: Rng, opts: GenOptions): string {
  const k = rng.chance(0.8) ? rng.pick(NASTY_KEYS) : genString(rng, opts);
  if (!opts.includeKnownFailures && /^[@$]/.test(k)) return 'k' + k;
  return k === '' ? 'empty' : k;
}

function genScalar(rng: Rng, opts: GenOptions): any {
  switch (rng.int(0, 8)) {
    case 0: return genString(rng, opts);
    case 1: return rng.pick(SPECIAL_NUMBERS);
    case 2: return rng.int(-1000, 1000);
    case 3: return rng.chance(0.5);
    case 4: return null;
    case 5: return BigInt(rng.int(-1000000, 1000000));
    case 6: return new Decimal(`${rng.int(-9999, 9999)}.${rng.int(0, 99)}`);
    case 7: return new Date(rng.int(0, 2000000000) * 1000);
    default: return new Uint8Array(Array.from({ length: rng.int(0, 5) }, () => rng.int(0, 255)));
  }
}

/** An array, biased toward the shapes that have broken: empty, nested, heterogeneous. */
function genArray(rng: Rng, opts: GenOptions, depth: number): any[] {
  const n = rng.chance(0.15) ? 0 : rng.int(1, 4);
  const kind = rng.int(0, 3);
  return Array.from({ length: n }, () => {
    if (kind === 0) return genScalar(rng, opts);                    // primitives
    if (kind === 1) return genRecord(rng, opts, depth - 1);          // records -> item schema
    if (kind === 2) return genArray(rng, opts, depth - 1);           // arrays of arrays
    return genValue(rng, opts, depth - 1);                           // heterogeneous
  });
}

/** A map-shaped object: many keys, one repeated value shape (drives wildcard inference). */
function genMap(rng: Rng, opts: GenOptions, depth: number): Record<string, any> {
  const n = rng.int(2, 4);
  const shapeKeys = Array.from({ length: rng.int(1, 3) }, () => genKey(rng, opts));
  const out: Record<string, any> = {};
  for (let i = 0; i < n; i++) {
    const entry: Record<string, any> = {};
    for (const k of shapeKeys) entry[k] = genScalar(rng, opts);
    out[rng.chance(0.5) ? String(i + 1) : genKey(rng, opts)] = entry;
  }
  return out;
}

export function genRecord(rng: Rng, opts: GenOptions, depth: number): Record<string, any> {
  if (depth <= 0) return {};
  if (rng.chance(0.12)) return {};              // empty record
  if (rng.chance(0.2)) return genMap(rng, opts, depth);
  const n = rng.int(1, 5);
  const out: Record<string, any> = {};
  for (let i = 0; i < n; i++) out[genKey(rng, opts)] = genValue(rng, opts, depth - 1);
  return out;
}

export function genValue(rng: Rng, opts: GenOptions, depth: number): any {
  if (depth <= 0) return genScalar(rng, opts);
  switch (rng.int(0, 5)) {
    case 0: case 1: return genScalar(rng, opts);
    case 2: case 3: return genRecord(rng, opts, depth);
    default: return genArray(rng, opts, depth);
  }
}

/** A top-level document value: a record, or a collection of records. */
export function genDocument(rng: Rng, opts: GenOptions = DEFAULT_OPTS): any {
  if (rng.chance(0.3)) {
    return Array.from({ length: rng.int(1, 4) }, () => genRecord(rng, opts, opts.maxDepth));
  }
  return genRecord(rng, opts, opts.maxDepth);
}

/**
 * One-step simplifications of a failing value, simplest first.
 *
 * Without shrinking a fuzzer reports a 200-node counterexample and the bug stays unread; the point
 * is to hand back the smallest input that still fails.
 */
export function shrink(value: any): any[] {
  const out: any[] = [];

  if (Array.isArray(value)) {
    if (value.length === 0) return out;
    out.push([]);
    if (value.length > 1) {
      out.push(value.slice(0, Math.floor(value.length / 2)));   // drop half
      out.push(value.slice(1));                                  // drop first
      out.push(value.slice(0, -1));                              // drop last
    }
    for (let i = 0; i < value.length; i++) {
      for (const s of shrink(value[i])) {
        const copy = value.slice();
        copy[i] = s;
        out.push(copy);
      }
    }
    return out;
  }

  if (value !== null && typeof value === 'object' &&
      !(value instanceof Date) && !(value instanceof Uint8Array) && !(value instanceof Decimal)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return out;
    out.push({});
    for (const k of keys) {                                      // drop one key
      const copy: Record<string, any> = { ...value };
      delete copy[k];
      out.push(copy);
    }
    for (const k of keys) {                                      // simplify one value
      for (const s of shrink(value[k])) out.push({ ...value, [k]: s });
    }
    return out;
  }

  if (typeof value === 'string' && value.length > 0) {
    out.push('');
    if (value.length > 1) out.push(value.slice(0, Math.floor(value.length / 2)));
    return out;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value !== 0) { out.push(0); return out; }
  if (typeof value === 'bigint' && value !== 0n) { out.push(0n); return out; }
  if (value instanceof Uint8Array && value.length > 0) { out.push(new Uint8Array()); return out; }

  return out;
}
