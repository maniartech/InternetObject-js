import { describe, test, expect } from 'vitest'
import parse from '../../src/parser/index'
import loadInferred from '../../src/facade/load-inferred'
import Decimal from '../../src/core/decimal/decimal'

/**
 * OPEN-DECISIONS D3 — `toObject()` and `toJSON()` are two different projections.
 *
 * They used to be the same method, and it converted a value only when the value sat at the TOP
 * level: `doc.toJSON().when` came back an ISO string while `doc.toJSON().events[0].when` came back
 * a live `Date` — the same type, spelled differently according to how deep it was nested. Binary
 * was worse: it reached `Buffer.toJSON()` and emitted `{ type: 'Buffer', data: [...] }`, Node's
 * internal bookkeeping rather than anything another language could read.
 *
 * The contract now:
 *   toObject() → plain structure, LIVE values   (Date, Decimal, bytes, bigint survive)
 *   toJSON()   → the JSON projection, RECURSIVE (io-specs json-compatibility.md)
 *
 * Depth must make no difference to either. Every test here therefore checks a value at the top
 * level AND the same value nested inside an array.
 */

const SRC = `when: datetime, price: decimal, big: bigint, id, events: [{when: datetime, price: decimal, id}]
---
dt"2024-01-01T10:00:00Z", 1.50m, 123n, b"AQI=", [{dt"2024-01-01T11:00:00Z", 2.25m, b"AwQ="}]`

describe('D3 — toObject() keeps values live, at any depth', () => {
  const o: any = parse(SRC, null).toObject()

  test('datetime stays a Date', () => {
    expect(o.when).toBeInstanceOf(Date)
    expect(o.events[0].when).toBeInstanceOf(Date)
  })

  test('decimal stays a Decimal', () => {
    expect(o.price).toBeInstanceOf(Decimal)
    expect(o.events[0].price).toBeInstanceOf(Decimal)
  })

  test('binary stays bytes', () => {
    expect(o.id).toBeInstanceOf(Uint8Array)
    expect([...o.id]).toEqual([1, 2])
    expect(o.events[0].id).toBeInstanceOf(Uint8Array)
    expect([...o.events[0].id]).toEqual([3, 4])
  })

  test('bigint stays a bigint', () => {
    expect(typeof o.big).toBe('bigint')
    expect(o.big).toBe(123n)
  })

  test('a nested record is a plain object, not a live container', () => {
    // The structure flattens even though the values do not: `toObject` is about shape.
    expect(typeof o.events[0].get).toBe('undefined')
    expect(Object.keys(o.events[0]).sort()).toEqual(['id', 'price', 'when'])
  })
})

describe('D3 — toJSON() projects to JSON, at any depth', () => {
  const j: any = parse(SRC, null).toJSON()

  test('datetime becomes an ISO-8601 string', () => {
    expect(j.when).toBe('2024-01-01T10:00:00.000Z')
    expect(j.events[0].when).toBe('2024-01-01T11:00:00.000Z')
  })

  test('decimal becomes a string — a JSON number would drop precision and scale', () => {
    expect(j.price).toBe('1.50')
    expect(j.events[0].price).toBe('2.25')
  })

  test('binary becomes base64, never Node\'s Buffer shape', () => {
    expect(j.id).toBe('AQI=')
    expect(j.events[0].id).toBe('AwQ=')
    expect(j.id).not.toHaveProperty('type')
  })

  test('bigint becomes a string', () => {
    expect(j.big).toBe('123')
  })

  test('JSON.stringify(doc) round-trips through JSON.parse', () => {
    // This THREW before the split: JSON.stringify refuses a bigint outright.
    const text = JSON.stringify(parse(SRC, null))
    expect(() => JSON.parse(text)).not.toThrow()
    expect(JSON.parse(text).events[0].id).toBe('AwQ=')
  })
})

describe('D3 — every core container offers both methods', () => {
  // "Where there is a toJSON, there should be a toObject", and both should agree on shape.
  const doc: any = loadInferred([{ a: 1 }, { a: 2 }])

  test('document', () => {
    expect(typeof doc.toObject).toBe('function')
    expect(typeof doc.toJSON).toBe('function')
  })

  test('section collection', () => {
    expect(typeof doc.sections.toObject).toBe('function')
    expect(typeof doc.sections.toJSON).toBe('function')
    // A lone section IS the data, matching how a Document composes its sections.
    expect(doc.sections.toJSON()).toEqual([{ a: 1 }, { a: 2 }])
  })

  test('section, collection, header, definitions', () => {
    const section: any = doc.sections.get(0)
    for (const target of [section, section.data, doc.header, doc.header.definitions]) {
      expect(typeof target.toObject).toBe('function')
      expect(typeof target.toJSON).toBe('function')
    }
  })

  test('decimal', () => {
    const d = new Decimal('1.50')
    expect(d.toJSON()).toBe('1.50')
    // A Decimal is already a value and JS has no lossless plain equivalent, so it hands back itself.
    expect(d.toObject()).toBe(d)
  })
})
