import { describe, test, expect } from 'vitest';
import { loadInferred } from '../../src/facade/load-inferred';
import { stringifyDocument } from '../../src/facade/stringify-document';
import parse from '../../src/parser/index';
import Decimal from '../../src/core/decimal/decimal';

/**
 * Round-trip defects found by the property fuzzer (`tools/fuzz`), pinned as cases.
 *
 * These took the fuzzer from 73 failures across 24,000 generated documents to zero. They are kept
 * here because the fuzzer is random: it will not necessarily generate any of these shapes again,
 * and several are silent — the value changes with no error raised, so only an explicit comparison
 * catches a regression.
 *
 * The full analysis, with one minimised repro per fingerprint, is in
 * ../io-test-cases/FUZZ-TRIAGE.md.
 */

const MODES = [
  { label: 'compact', opts: { includeHeader: true, includeTypes: true } },
  { label: 'formatted', opts: { includeHeader: true, includeTypes: true, indent: 2 } },
] as const;

/** Round-trip a value through IO and return the re-parsed tree as plain JSON. */
function roundTrip(value: any, opts: any) {
  const io = stringifyDocument(loadInferred(value) as any, opts);
  const back: any = parse(io, null);
  expect(back.getErrors()).toEqual([]);
  return JSON.parse(JSON.stringify(back.toJSON()));
}

/** What the value looks like once projected to JSON, i.e. the round trip's target. */
function expectedJson(value: any) {
  return JSON.parse(JSON.stringify(loadInferred(value).toJSON()));
}

describe('fuzzer findings — a document the writer emits, its own reader must read', () => {
  /**
   * One schema name collects instances from SEVERAL paths, and a nested member's schema name is
   * looked up BY path. Resolving every instance against the first instance's path handed later
   * instances the first one's schemas, so a member was typed by whichever sibling happened to be
   * collected first, and the writer emitted one instance's record against the other's schema.
   *
   * It surfaced under six different error codes — `value-required` when a key was missing, and
   * `invalid-type` / `not-an-array` / `invalid-object` / `not-a-bool` / `not-a-string` /
   * `invalid-datetime` when a key was present but differently typed — which is why it read as six
   * separate bugs. One case per code.
   */
  const CROSS_PATH: [string, any][] = [
    ['missing key (value-required)', { x: { t: { N: { q: false } } }, t: { N: {} } }],
    ['differently-typed key', { x: { t: { N: { q: false } } }, t: { N: { r: 1 } } }],
    ['bigint vs empty (invalid-type)', { 'trail ': { ' lead': { N: { 'trail ': 0n } } }, ' lead': { N: { 'has\ttab': {} } } }],
    ['array vs record (not-an-array)', [{ s: { '2': { '0': [] } } }, { u: { s: [{ '2': { n: '' } }] } }]],
    ['record vs array (invalid-object)', [{ t: { n: { h: { '1': { t: new Date(0) }, '2': { t: null } } } } }, { n: { h: { r: [] } } }]],
    ['bool vs decimal (not-a-bool)', { '2': { ' lead': { n: { h: true } } }, ' lead': { n: { u: new Decimal('9173.35') } } }],
    ['string vs bytes (not-a-string)', [{ '10': { k: { t: { N: 0 } } }, h: { '0': '' } }, { N: { t: { h: { v: {} }, N: new Uint8Array([]) } } }]],
    ['datetime vs record (invalid-datetime)', { b: { b: { t: { '3.14': {} } }, t: { '0': { k: new Date(0) } } } }],
  ];

  for (const [name, value] of CROSS_PATH) {
    for (const { label, opts } of MODES) {
      test(`${name} — ${label}`, () => {
        expect(roundTrip(value, opts)).toEqual(expectedJson(value));
      });
    }
  }

  /**
   * A section name is written RAW after `---` and the grammar has no quoted form for one: the
   * tokenizer accepts only letters, marks, digits, `-` and `_`. `--- code:en: $b` truncated at the
   * colon and `--- a,b: $x` at the comma; `---  lead: $x` silently dropped the leading space with
   * no error at all. Such keys must not take the multi-section route.
   */
  const ILLEGAL_SECTION_NAMES: [string, any][] = [
    ['colon in key', { b: [{ x: 1 }], 'code:en': [{ y: 2 }] }],
    ['comma in key', { 'a,b': [{ x: 1 }], N: [{ y: 2 }] }],
    ['leading space in key', { ' lead': [{ x: 1 }], b: [{ y: 2 }] }],
    ['tab in key', { 'has\ttab': [{ x: 1 }], b: [{ y: 2 }] }],
    ['bracket in key', { 'has [bracket]': [{ x: 1 }], b: [{ y: 2 }] }],
    ['legal names still take the multi-section route', { accounting: [{ x: 1 }], sales: [{ y: 2 }] }],
  ];

  for (const [name, value] of ILLEGAL_SECTION_NAMES) {
    for (const { label, opts } of MODES) {
      test(`section name: ${name} — ${label}`, () => {
        expect(roundTrip(value, opts)).toEqual(expectedJson(value));
      });
    }
  }

  /**
   * `{}` and `{*}` are the same schema to the reader — compile-object forces `open` on a
   * member-less schema — but the writer picked whichever the in-memory flag said, so a re-write
   * was not stable. Serializing twice must reach a fixed point.
   */
  test('stringify is idempotent for a member-less schema', () => {
    const value = { '10': [{}], value: [{ '10': { 'has\nnewline': '' } }] };
    const opts = { includeHeader: true, includeTypes: true };
    const first = stringifyDocument(loadInferred(value) as any, opts);
    const second = stringifyDocument(parse(first, null) as any, opts);
    expect(second).toBe(first);
  });
});

describe('fuzzer findings — scalar-shaped objects are values, not records', () => {
  /**
   * A Date, Decimal or byte array is `typeof 'object'` but is a VALUE. Treating one as a record
   * walked its enumerable own properties and turned them into schema members: an array of Decimals
   * inferred `{coefficient, exponent, precision, scale}` and a byte array inferred `{"0": number}`.
   * Both the value and the shape changed, with no error raised.
   */
  const SCALAR_SHAPED: [string, any][] = [
    ['decimals as section records', { true: [new Date(0), new Decimal('-9717.70')], id: [{}] }],
    ['bytes as section records', { cafe: [new Uint8Array([20])], null: [{ '2': { N: '' } }] }],
    ['decimal first in a mixed array', { value: [new Decimal('5316.54'), { '2': { '10': true, N: 0 } }], s: [{}] }],
    ['bytes in one section, records in another', { N: [{ 'a:b': [] }, { cafe: {} }], b: [new Uint8Array([])] }],
  ];

  for (const [name, value] of SCALAR_SHAPED) {
    for (const { label, opts } of MODES) {
      test(`${name} — ${label}`, () => {
        expect(roundTrip(value, opts)).toEqual(expectedJson(value));
      });
    }
  }

  /**
   * The same rule at the ROOT. A bare `new Date(0)` decoded as `{}` — total, silent data loss.
   * These are promoted to the positional member `"0"`, exactly as a root array of scalars is.
   *
   * The fuzzer never generated a bare scalar root, so none of these was ever reported by it; they
   * came out of auditing the sites that decide "object-shaped but scalar" by hand.
   */
  const SCALAR_ROOTS: [string, any][] = [
    ['decimal', new Decimal('1.5')],
    ['byte array', new Uint8Array([1, 2])],
    ['date', new Date(0)],
    ['number', 42],
    ['string', 'hi'],
    ['boolean', true],
    ['bigint', 7n],
    ['array of scalars', [1, 2, 3]],
  ];

  for (const [name, value] of SCALAR_ROOTS) {
    test(`root value: ${name}`, () => {
      const opts = { includeHeader: true, includeTypes: true };
      expect(roundTrip(value, opts)).toEqual(expectedJson(value));
    });
  }
});

describe('fuzzer findings — every reported error carries a code', () => {
  /**
   * A record under a `decimal` member fell through to `Decimal.ensureDecimal`, which throws a bare
   * `DecimalError` carrying neither an error code nor a position. The document's error list then
   * held an entry no caller could classify.
   */
  test('a record under a decimal member is a coded type error', () => {
    const doc: any = parse('~ $schema: {a: decimal}\n---\n~ {y: 1}', null);
    const errors = doc.getErrors();
    expect(errors.length).toBeGreaterThan(0);
    for (const e of errors) expect(e.errorCode).toBeTruthy();
  });

  test('a valid decimal is unaffected', () => {
    const doc: any = parse('~ $schema: {a: decimal}\n---\n~ {a: 12.5m}', null);
    expect(doc.getErrors()).toEqual([]);
  });
});
