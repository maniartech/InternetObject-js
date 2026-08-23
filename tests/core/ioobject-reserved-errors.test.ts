import { describe, test, expect } from 'vitest'
import IOObject from '../../src/core/internet-object'

describe('IOObject reserved-name collision: user member named `errors`', () => {
  test('set("errors", value) does not throw and round-trips via toObject/get', () => {
    const obj = new IOObject<any>()
    obj.set('name', 'Alice')
    expect(() => obj.set('errors', [1, 2, 3])).not.toThrow()

    // stored as data, retrievable + serialized
    expect(obj.get('errors')).toEqual([1, 2, 3])
    expect(obj.toObject()).toEqual({ name: 'Alice', errors: [1, 2, 3] })

    // internal error-collection channel is preserved (still an Error[], not the user value)
    expect(Array.isArray(obj.errors)).toBe(true)
    expect(obj.errors).toHaveLength(0)
  })

  test('constructing from a record with an `errors` key does not throw', () => {
    expect(() => new IOObject({ a: 1, errors: 'oops' } as any)).not.toThrow()
    const obj = new IOObject({ a: 1, errors: 'oops' } as any)
    expect(obj.get('errors')).toBe('oops')
    expect(Array.isArray(obj.errors)).toBe(true)
  })
})
