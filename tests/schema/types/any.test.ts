import { parse } from '../../../src'

describe('AnyDef - Any Type', () => {
  describe('Basic any validation', () => {
    test('should accept any primitive type', () => {
      expect(() => parse('val: any\n---\n42', null)).not.toThrow()
      expect(() => parse('val: any\n---\nhello', null)).not.toThrow()
      expect(() => parse('val: any\n---\nT', null)).not.toThrow()
      expect(() => parse('val*: any\n---\nN', null)).not.toThrow() // null requires nullable marker
    })

    test('should accept objects', () => {
      const result = parse('val: any\n---\n{name: John, age: 25}', null).toJSON()
      expect(result.val).toEqual({ name: 'John', age: 25 })
    })

    test('should accept arrays', () => {
      const result = parse('val: any\n---\n[1, 2, 3]', null).toJSON()
      expect(result.val).toEqual([1, 2, 3])
    })

    test('should accept nested structures', () => {
      const result = parse('val: any\n---\n{items: [1, 2, 3], meta: {count: 3}}', null).toJSON()
      expect(result.val.items).toEqual([1, 2, 3])
      expect(result.val.meta.count).toBe(3)
    })
  })

  describe('Default values', () => {
    test('should use default when value is not provided', () => {
      const schema = 'val?: { any, default: hello }'
      const result = parse(`${schema}\n---\n~`, null).toJSON()
      expect(result[0].val).toBe('hello')
    })

    test('should use numeric default', () => {
      const schema = 'val?: { any, default: 42 }'
      const result = parse(`${schema}\n---\n~`, null).toJSON()
      expect(result[0].val).toBe(42)
    })

    test('should use null default', () => {
      const schema = 'val?*: { any, default: N }'
      const result = parse(`${schema}\n---\n~`, null).toJSON()
      expect(result[0].val).toBeNull()
    })

    test('should override default with provided value', () => {
      const schema = 'val?: { any, default: hello }'
      const result = parse(`${schema}\n---\nworld`, null).toJSON()
      expect(result.val).toBe('world')
    })
  })

  describe('Choices constraint', () => {
    test('should accept value from choices', () => {
      const schema = 'status: { any, choices: [active, inactive, pending] }'

      expect(() => parse(`${schema}\n---\nactive`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\ninactive`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\npending`, null)).not.toThrow()
    })

    test('should reject value not in choices', () => {
      const schema = 'status: { any, choices: [active, inactive] }'
      expect(() => parse(`${schema}\n---\ncompleted`, null)).toThrow(/must be one of/i)
    })

    test('should handle mixed type choices', () => {
      const schema = 'val: { any, choices: [1, one, T] }'

      expect(() => parse(`${schema}\n---\n1`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\none`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\nT`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n2`, null)).toThrow(/must be one of/i)
    })
  })

  describe('anyOf constraint', () => {
    test('should accept string or number', () => {
      const schema = 'val: { any, anyOf: [string, number] }'

      expect(() => parse(`${schema}\n---\nhello`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n42`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\nT`, null)).toThrow()
    })

    test('should accept constrained number types', () => {
      const schema = 'val: { any, anyOf: [{ int, min: 0, max: 10 }, { int, min: 100, max: 200 }] }'

      expect(() => parse(`${schema}\n---\n5`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n150`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n50`, null)).toThrow() // not in either range
    })

    test('should accept multiple of 3 or 5', () => {
      const schema = 'val: { any, anyOf: [{ int, multipleOf: 3 }, { int, multipleOf: 5 }] }'

      expect(() => parse(`${schema}\n---\n9`, null)).not.toThrow() // multiple of 3
      expect(() => parse(`${schema}\n---\n10`, null)).not.toThrow() // multiple of 5
      expect(() => parse(`${schema}\n---\n15`, null)).not.toThrow() // multiple of both
      expect(() => parse(`${schema}\n---\n7`, null)).toThrow() // neither
    })

    test('should accept different object schemas', () => {
      const schema = 'address: { any, anyOf: [{ city: string, state: string }, { street: string, city: string, state: string }] }'

      expect(() => parse(`${schema}\n---\n{{NYC, NY}}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{{Main St, NYC, NY}}`, null)).not.toThrow()
    })

    test('should accept string with different constraints', () => {
      const schema = 'code: { any, anyOf: [{ string, len: 3 }, { string, len: 5 }] }'

      expect(() => parse(`${schema}\n---\nABC`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\nABCDE`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\nAB`, null)).toThrow() // wrong length
    })
  })

  describe('Optional and null', () => {
    test('should allow optional any', () => {
      const schema = 'val?: any'
      expect(() => parse(`${schema}\n---\n~`, null)).not.toThrow()
    })

    test('should allow null when specified', () => {
      const schema = 'val*: any'
      const result = parse(`${schema}\n---\nN`, null).toJSON()
      expect(result.val).toBeNull()
    })

    test('should reject null when not allowed', () => {
      const schema = 'val: any'
      expect(() => parse(`${schema}\n---\nN`, null)).toThrow(/null/i)
    })

    test('should allow both optional and null', () => {
      const schema = 'val?*: any'

      expect(() => parse(`${schema}\n---\n~`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\nN`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n42`, null)).not.toThrow()
    })
  })

  describe('Multiple any fields', () => {
    test('should validate each field independently', () => {
      const schema = 'a: any, b: any, c: any'
      const result = parse(`${schema}\n---\n42, hello, T`, null).toJSON()

      expect(result.a).toBe(42)
      expect(result.b).toBe('hello')
      expect(result.c).toBe(true)
    })

    test('should report errors for anyOf constraints', () => {
      const schema = 'a: { any, anyOf: [string, number] }, b: { any, anyOf: [string, number] }'

      expect(() => parse(`${schema}\n---\nhello, 42`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\nhello, T`, null)).toThrow() // b is not string or number
    })
  })

  describe('Edge cases', () => {
    test('should handle any in objects', () => {
      const schema = 'data: { id: number, value: any }'
      const result = parse(`${schema}\n---\n{{42, hello}}`, null).toJSON()

      expect(result.data.id).toBe(42)
      expect(result.data.value).toBe('hello')
    })

    test('should handle any in arrays', () => {
      const schema = 'items: [any]'
      const result = parse(`${schema}\n---\n{[1, hello, T, {x: 10}]}`, null).toJSON()

      expect(result.items).toHaveLength(4)
      expect(result.items[0]).toBe(1)
      expect(result.items[1]).toBe('hello')
      expect(result.items[2]).toBe(true)
      expect(result.items[3].x).toEqual(10)
    })

    test('should handle deeply nested any', () => {
      const result = parse('val: any\n---\n{a: {b: {c: [1, 2, {d: hello}]}}}', null).toJSON()

      expect(result.val.a.b.c[2].d).toBe('hello')
    })

    test('should accept bigint, decimal, datetime', () => {
      expect(() => parse('val: any\n---\n123n', null)).not.toThrow()
      expect(() => parse('val: any\n---\n123.45m', null)).not.toThrow()
      expect(() => parse('val: any\n---\ndt"2024-01-15T10:30:00"', null)).not.toThrow()
    })
  })

  describe('anyOf with complex schemas', () => {
    test('should match first valid schema', () => {
      const schema = 'result: { any, anyOf: [{ success: bool, data: any }, { error: string, code: number }] }'

      expect(() => parse(`${schema}\n---\n{{T, {id: 42}}}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{{Not found, 404}}`, null)).not.toThrow()
    })

    test('should reject when no schema matches', () => {
      const schema = 'val: { any, anyOf: [{ x: number }, { y: string }] }'

      expect(() => parse(`${schema}\n---\n{x: 10}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{y: hello}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{z: 10}`, null)).toThrow()
    })
  })

  describe('Implicit any type', () => {
    test('should default to any when type is not specified', () => {
      const result = parse('a, b, c\n---\n42, hello, T', null).toJSON()

      expect(result.a).toBe(42)
      expect(result.b).toBe('hello')
      expect(result.c).toBe(true)
    })

    test('should accept mixed types without schema', () => {
      const result = parse('data\n---\n{items: [1, hello, T], count: 3}', null).toJSON()

      expect(result.data.items).toEqual([1, 'hello', true])
      expect(result.data.count).toBe(3)
    })
  })
})
