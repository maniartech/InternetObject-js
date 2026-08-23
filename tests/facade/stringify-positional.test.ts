import { describe, test, expect } from 'vitest'
import { parse, stringify } from '../../src'

/**
 * FINDINGS #25: serializing (`stringify`, IO -> IO text) must not drop members. A positional
 * (keyless) member serializes as a bare value; a keyed member serializes as `key: value` with
 * numeric/keyword keys quoted. Round-trips must preserve the value model. (`toJSON` was never
 * affected — this is only the IO-text serializer.)
 */
function roundtrips(src: string): { out: string; jsonBefore: any; jsonAfter: any } {
  const d1: any = parse(src, null)
  const out = stringify(d1)
  const d2: any = parse(out, null)
  return { out, jsonBefore: d1.toJSON(), jsonAfter: d2.toJSON() }
}

describe('#25 — stringify preserves positional + keyed members (no data loss)', () => {
  test.each([
    ['no schema, positional only',      '{ Alice, Bob }'],
    ['no schema, mixed pos + keyed',    '{ Alice, "5": 100 }'],
    ['open {*}, positional only',       '~ $schema: {*}\n---\n{ Alice, Bob }'],
    ['open {*}, mixed pos + keyed',     '~ $schema: {*}\n---\n{ Alice, "5": 100 }'],
    ['open {*}, keyed only',            '~ $schema: {*}\n---\n{ name: Alice, age: 25 }'],
  ])('%s round-trips through stringify', (_label, src) => {
    const r = roundtrips(src)
    // no member vanished: the re-parsed value model equals the original
    expect(r.jsonAfter).toEqual(r.jsonBefore)
    // and the emitted text is not empty when there was data
    expect(r.out.length).toBeGreaterThan(0)
  })

  test('mixed member emits bare positional + quoted numeric key', () => {
    const { out } = roundtrips('{ Alice, "5": 100 }')
    // Alice bare (positional), "5" as a quoted key
    expect(out).toContain('Alice')
    expect(out).toContain('"5": 100')
  })
})
