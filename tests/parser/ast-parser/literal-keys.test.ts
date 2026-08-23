import { describe, test, expect } from 'vitest'
import parse from '../../../src/parser/index'

/**
 * ISSUE-14: object keys must be STRINGS. Bare literal/keyword tokens (`null`/`true`/`false` and short
 * forms `N`/`T`/`F`) AND bare number tokens (`0`, `42`, `3.14`) are NOT valid bare keys — they raise
 * `invalid-key`. Quoting them (`"null"`, `"0"`) makes a normal string key, which stays valid. Bare
 * open-string identifiers (`name`, `a b`) are strings and remain valid.
 */
// Per policy P1, the parser accumulates errors (getErrors) rather than throwing; support either
// channel so the assertion is about the designated CODE, not the delivery mechanism.
function parseResult(input: string): { codes: string[]; value?: any } {
  try {
    const doc: any = parse(input, null)
    const codes = (doc.getErrors?.() ?? []).map((e: any) => e?.errorCode)
    return { codes, value: doc.toJSON?.() }
  } catch (e: any) {
    return { codes: [e?.errorCode] }
  }
}

describe('ISSUE-14 — literal/keyword tokens rejected as bare object keys', () => {
  test.each([
    ['{ null: 1 }'],
    ['{ N: 1 }'],
    ['{ true: 1 }'],
    ['{ T: 1 }'],
    ['{ false: 1 }'],
    ['{ F: 1 }'],
    ['{ x: 1, null: true }'],
    ['{ 0: 100 }'],
    ['{ 42: 1 }'],
    ['{ 3.14: 1 }'],
  ])('bare literal/number key %s -> invalid-key', (input) => {
    expect(parseResult(input).codes).toContain('invalid-key')
  })

  test('quoted "null" is a valid string key', () => {
    const r = parseResult('{ "null": 1 }')
    expect(r.codes).toEqual([])
    expect(r.value).toEqual({ null: 1 })
  })

  test('quoted "false" is a valid string key', () => {
    const r = parseResult('{ "false": true }')
    expect(r.codes).toEqual([])
    expect(r.value).toEqual({ false: true })
  })

  test('identifier key stays valid', () => {
    const r = parseResult('{ name: 1 }')
    expect(r.codes).toEqual([])
    expect(r.value).toEqual({ name: 1 })
  })

  test('quoted numeric key is valid', () => {
    const r = parseResult('{ "0": 100 }')
    expect(r.codes).toEqual([])
    expect(r.value).toEqual({ '0': 100 })
  })
})
