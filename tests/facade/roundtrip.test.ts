import { describe, test, expect } from 'vitest'
import { parseDocument, stringify } from '../../src'

/**
 * ROUND-TRIP CONTRACT
 * ===================
 * Deserializing an IO document and serializing it back must reproduce the same thing. This suite is
 * the canonical, case-by-case proof of that.
 *
 * The primary contract uses `includeHeader: true` (a full document: header/schema + data):
 *   1. value preserved  — parse -> stringify -> parse yields the same value model (toObject deep-equal)
 *   2. idempotent       — stringify -> parse -> stringify is a fixed point (identical text)
 *
 * `includeHeader: false` is a DATA-ONLY projection by design (the schema is intentionally omitted), so
 * it is covered separately with the weaker contract "emits valid, re-parseable IO".
 */

/** Full round-trip helper (includeHeader: true). Returns both value models and both serializations. */
function roundTrip(src: string, opts: Record<string, unknown> = {}) {
  const options = { includeHeader: true, ...opts } as any
  const d1: any = parseDocument(src, null)
  const out1 = stringify(d1, options)
  const d2: any = parseDocument(out1, null)
  const out2 = stringify(d2, options)
  return { d1, d2, out1, out2 }
}

/** Assert a source document round-trips: value preserved AND serialization is idempotent. */
function expectRoundTrip(src: string, opts: Record<string, unknown> = {}) {
  const { d1, d2, out1, out2 } = roundTrip(src, opts)
  // (a) value preserved (toObject is bigint/Date-safe under vitest's deep-equal)
  expect(d2.toObject()).toEqual(d1.toObject())
  // (b) serialization is a fixed point
  expect(out2).toBe(out1)
  return out1
}

describe('round-trip · header schema forms', () => {
  test.each([
    ['inline header schema',        'name, age\n---\nJohn, 20'],
    ['explicit $schema',            '~ $schema: {name, age}\n---\nJohn, 20'],
    ['schema with typed members',   '~ $schema: {name: string, age: number}\n---\nJohn, 20'],
    ['header-only, no data',        '~ $schema: {name, age}\n---'],
  ])('%s', (_l, src) => { expectRoundTrip(src); })
})

describe('round-trip · single object shapes', () => {
  test.each([
    ['positional data',             '~ $schema: {name, age}\n---\nJohn, 20'],
    ['keyed data',                  '~ $schema: {name, age}\n---\nname: John, age: 20'],
    ['nested object',               '~ $schema: {name, address: {city, zip}}\n---\nJohn, {NYC, 10001}'],
    ['deeply nested',               '~ $schema: {name, addr: {city, geo: {lat, lng}}}\n---\nJohn, {NYC, {40, 70}}'],
    ['array member',               '~ $schema: {name, tags: [string]}\n---\nJohn, [a, b, c]'],
    ['array of objects',            '~ $schema: {items: [{x, y}]}\n---\n{[{1, 2}, {3, 4}]}'],
    ['empty array',                 '~ $schema: {tags: [string]}\n---\n{[]}'],
  ])('%s', (_l, src) => { expectRoundTrip(src); })
})

describe('round-trip · collections', () => {
  test.each([
    ['collection of records',       '~ $schema: {name, age}\n---\n~ John, 20\n~ Jane, 25'],
    ['single-record collection',    '~ $schema: {name}\n---\n~ Alice'],
    ['collection of nested',        '~ $schema: {name, addr: {city}}\n---\n~ A, {NYC}\n~ B, {LA}'],
  ])('%s', (_l, src) => { expectRoundTrip(src); })
})

describe('round-trip · value types', () => {
  test.each([
    ['string',                      '~ $schema: {a: string}\n---\nhello'],
    ['string with spaces',          '~ $schema: {a: string}\n---\nhello world'],
    ['quoted string (comma)',       '~ $schema: {a: string}\n---\n"has, comma"'],
    ['number',                      '~ $schema: {a: number}\n---\n42'],
    ['negative number',             '~ $schema: {a: number}\n---\n-5'],
    ['float',                       '~ $schema: {a: number}\n---\n3.14'],
    ['decimal',                     '~ $schema: {a: decimal}\n---\n3.14m'],
    ['bigint',                      '~ $schema: {a: bigint}\n---\n42n'],
    ['negative bigint',             '~ $schema: {a: bigint}\n---\n-42n'],
    ['large bigint',                '~ $schema: {a: bigint}\n---\n123456789012345678901234567890n'],
    ['array of bigint',             '~ $schema: {a: [bigint]}\n---\n{[1n, 2n]}'],
    ['datetime',                    "~ $schema: {a: datetime}\n---\nd'2024-01-15'"],
    ['bool T/F',                    '~ $schema: {a: bool, b: bool}\n---\nT, F'],
    ['null (nullable member)',      '~ $schema: {a, b, c*}\n---\n42, T, N'],
  ])('%s', (_l, src) => { expectRoundTrip(src); })
})

describe('round-trip · optional / nullable members', () => {
  test.each([
    ['optional + nullable, empty',  '~ $schema: {name, age?*}\n---\nJohn,'],
    ['nullable given null',         '~ $schema: {name, age*}\n---\nJohn, N'],
  ])('%s', (_l, src) => { expectRoundTrip(src); })
})

describe('round-trip · open {*} schema (no field mapping)', () => {
  test.each([
    ['positional only',             '~ $schema: {*}\n---\n{Alice, Bob}'],
    ['keyed only',                  '~ $schema: {*}\n---\n{name: Alice, age: 25}'],
    ['mixed positional + keyed',    '~ $schema: {*}\n---\n{Alice, "5": 100}'],
  ])('%s', (_l, src) => { expectRoundTrip(src); })
})

describe('round-trip · no schema at all', () => {
  test.each([
    ['keyed object',                '{name: John, age: 20}'],
    ['positional object',           '{Alice, Bob}'],
    ['mixed positional + keyed',    '{Alice, "5": 100}'],
    ['quoted numeric key',          '{"5": 100, name: Bob}'],
    ['bigint value',                '{count: 42n, name: X}'],
    ['decimal value',               '{price: 3.14m, name: X}'],
  ])('%s', (_l, src) => { expectRoundTrip(src); })
})

describe('round-trip · multiple named sections', () => {
  test.each([
    ['two named sections',          '~ $schema: {name}\n--- one\n~ Alice\n--- two\n~ Bob'],
  ])('%s', (_l, src) => { expectRoundTrip(src); })
})

describe('round-trip · with includeTypes', () => {
  test.each([
    ['typed schema + data',         '~ $schema: {name: string, age: number}\n---\nJohn, 20'],
    ['open {*} mixed',              '~ $schema: {*}\n---\n{Alice, "5": 100}'],
  ])('%s', (_l, src) => { expectRoundTrip(src, { includeTypes: true }); })
})

describe('data-only (includeHeader: false) emits valid, re-parseable IO', () => {
  // Data-only intentionally drops the schema, so the value model is NOT preserved for schema-mapped
  // data (positional data re-parses to index keys). The contract here is only: output is valid IO
  // that re-parses without errors.
  test.each([
    ['schema + positional data',    '~ $schema: {name, age}\n---\nJohn, 20'],
    ['open {*} mixed',              '~ $schema: {*}\n---\n{Alice, "5": 100}'],
    ['no schema keyed',             '{name: John, age: 20}'],
  ])('%s', (_l, src) => {
    const d1: any = parseDocument(src, null)
    const out = stringify(d1, { includeHeader: false } as any)
    const d2: any = parseDocument(out, null)
    expect((d2.getErrors?.() ?? []).length).toBe(0)
  })
})
