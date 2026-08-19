import { describe, test, expect } from 'vitest'
import parse from '../../../src/parser/index'

/**
 * ISSUE-4: a binary literal `b'…'` is a first-class value. The tokenizer decodes it to native bytes
 * (a Buffer); the parser must accept it anywhere a value is expected (keyed, positional, array
 * element). "Hello" = base64 SGVsbG8= = bytes [72,101,108,108,111]. A malformed base64 still errors.
 */
const HELLO = [72, 101, 108, 108, 111]

// Extract the byte sequence however the bytes are spelled. `toJSON()` is the JSON PROJECTION and
// JSON has no binary type, so bytes become a base64 string (io-specs json-compatibility.md), while
// `toObject()` hands back live bytes. A plain byte array is accepted too, so cross-language runners
// can map their own byte type onto this same sequence.
function bytesOf(v: any): number[] | null {
  if (Buffer.isBuffer(v) || v instanceof Uint8Array) return [...v]   // live native bytes
  if (Array.isArray(v)) return v                                     // plain byte array
  if (typeof v === 'string') return [...Buffer.from(v, 'base64')]    // base64 projection (toJSON)
  return null
}

function parseCode(input: string): { threw: boolean; code?: string; value?: any } {
  try {
    const doc: any = parse(input, null)
    return { threw: false, value: doc.toJSON?.() }
  } catch (e: any) {
    return { threw: true, code: e?.errorCode }
  }
}

describe('ISSUE-4 — binary literals usable as values (decode to native bytes)', () => {
  test('keyed binary value', () => {
    const r = parseCode("{ pic: b'SGVsbG8=' }")
    expect(r.threw).toBe(false)
    expect(bytesOf(r.value.pic)).toEqual(HELLO)
  })

  test('positional binary value in a schema-typed collection', () => {
    const r = parseCode("~ $schema: {name, data}\n---\n~ Alice, b'SGVsbG8='")
    expect(r.threw).toBe(false)
    expect(r.value[0].name).toBe('Alice')
    expect(bytesOf(r.value[0].data)).toEqual(HELLO)
  })

  test('binary as an array element', () => {
    const r = parseCode("{ items: [b'SGVsbG8='] }")
    expect(r.threw).toBe(false)
    expect(bytesOf(r.value.items[0])).toEqual(HELLO)
  })

  test('malformed base64 still errors with invalid-base64 (control)', () => {
    const doc: any = parse("{ pic: b'@@@' }", null)
    const codes = (doc.getErrors?.() ?? []).map((e: any) => e?.errorCode)
    expect(codes).toContain('invalid-base64')
  })
})
