import { parse } from '../../../src'

describe('ObjectDef - Object Type', () => {
  describe('Basic object validation', () => {
    test('should accept empty object', () => {
      expect(() => parse('obj: {}\n---\n{}', null)).not.toThrow()
      expect(() => parse('obj: object\n---\n{}', null)).not.toThrow()
    })

    test('should accept object with simple properties', () => {
      const schema = 'user: { name: string, age: number }'
      const result = parse(`${schema}\n---\n{John, 25}`, null).toJSON()

      expect(result.user.name).toBe('John')
      expect(result.user.age).toBe(25)
    })

    test('should reject non-object values', () => {
      expect(() => parse('obj: {}\n---\n123', null)).toThrow(/object/i)
      expect(() => parse('obj: {}\n---\n"not an object"', null)).toThrow(/object/i)
      expect(() => parse('obj: {}\n---\n[1, 2, 3]', null)).toThrow(/object/i)
    })
  })

  describe('Object with typed properties', () => {
    test('should validate string properties', () => {
      const schema = 'user: { name: string, email: string }'

      expect(() => parse(`${schema}\n---\n{John, john@example.com}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{John, 123}`, null)).toThrow()
    })

    test('should validate number properties', () => {
      const schema = 'point: { x: number, y: number }'

      expect(() => parse(`${schema}\n---\n{10, 20}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{10, invalid}`, null)).toThrow()
    })

    test('should validate boolean properties', () => {
      const schema = 'flags: { active: bool, verified: bool }'

      expect(() => parse(`${schema}\n---\n{T, F}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{T, 1}`, null)).toThrow()
    })

    test('should validate mixed type properties', () => {
      const schema = 'item: { id: number, name: string, active: bool }'
      const result = parse(`${schema}\n---\n{42, Widget, T}`, null).toJSON()

      expect(result.item.id).toBe(42)
      expect(result.item.name).toBe('Widget')
      expect(result.item.active).toBe(true)
    })
  })

  describe('Nested objects', () => {
    test('should accept nested objects', () => {
      const schema = 'user: { name: string, address: { city: string, zip: string } }'
      const result = parse(`${schema}\n---\n{John, {NYC, 10001}}`, null).toJSON()

      expect(result.user.name).toBe('John')
      expect(result.user.address.city).toBe('NYC')
      expect(result.user.address.zip).toBe('10001')
    })

    test('should validate nested object properties', () => {
      const schema = 'data: { info: { id: number, name: string } }'

      expect(() => parse(`${schema}\n---\n{{42, Test}}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{{invalid, Test}}`, null)).toThrow()
    })

    test('should handle deeply nested objects', () => {
      const schema = 'root: { level1: { level2: { level3: string } } }'
      const result = parse(`${schema}\n---\n{{{deep}}}`, null).toJSON()

      expect(result.root.level1.level2.level3).toBe('deep')
    })
  })

  describe('Optional and null properties', () => {
    test('should allow optional properties', () => {
      const schema = 'user: { name: string, email?: string }'

      expect(() => parse(`${schema}\n---\n{John, ~}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{John, john@example.com}`, null)).not.toThrow()
    })

    test('should allow null properties when specified', () => {
      const schema = 'user: { name: string, phone*: string }'
      const result = parse(`${schema}\n---\n{John, N}`, null).toJSON()

      expect(result.user.name).toBe('John')
      expect(result.user.phone).toBeNull()
    })

    test('should reject null when not allowed', () => {
      const schema = 'user: { name: string, age: number }'
      expect(() => parse(`${schema}\n---\n{John, N}`, null)).toThrow(/null/i)
    })

    test('should allow optional and null together', () => {
      const schema = 'user: { name: string, middle?*: string }'

      expect(() => parse(`${schema}\n---\n{John, ~}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{John, N}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{John, M}`, null)).not.toThrow()
    })
  })

  describe('Object with property constraints', () => {
    test('should validate string length constraints', () => {
      const schema = 'user: { name: { string, maxLen: 10 } }'

      expect(() => parse(`${schema}\n---\n{John}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{VeryLongName}`, null)).toThrow(/maxLen/i)
    })

    test('should validate number range constraints', () => {
      const schema = 'item: { quantity: { int, min: 1, max: 100 } }'

      expect(() => parse(`${schema}\n---\n{50}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{0}`, null)).toThrow(/range/i)
      expect(() => parse(`${schema}\n---\n{101}`, null)).toThrow(/range/i)
    })

    test('should validate pattern constraints', () => {
      const schema = 'user: { code: { string, pattern: "^[A-Z]{3}$" } }'

      expect(() => parse(`${schema}\n---\n{ABC}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{ab12}`, null)).toThrow(/pattern/i)
    })
  })

  describe('Object with arrays', () => {
    test('should accept object with array property', () => {
      const schema = 'user: { name: string, tags: [string] }'
      const result = parse(`${schema}\n---\n{John, [admin, user]}`, null).toJSON()

      expect(result.user.name).toBe('John')
      expect(result.user.tags).toEqual(['admin', 'user'])
    })

    test('should validate array property constraints', () => {
      const schema = 'data: { items: { [number], minLen: 2 } }'

      expect(() => parse(`${schema}\n---\n{[1, 2, 3]}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{[1]}`, null)).toThrow()
    })
  })

  describe('Optional and null objects', () => {
    test('should allow optional object', () => {
      const schema = 'user?: { name: string, age: number }'
      expect(() => parse(`${schema}\n---\n~`, null)).not.toThrow()
    })

    test('should allow null object when specified', () => {
      const schema = 'user*: { name: string, age: number }'
      const result = parse(`${schema}\n---\nN`, null).toJSON()
      expect(result.user).toBeNull()
    })

    test('should reject null when not allowed', () => {
      const schema = 'user: { name: string, age: number }'
      expect(() => parse(`${schema}\n---\nN`, null)).toThrow(/null/i)
    })

    test('should use default null for optional nullable object', () => {
      const schema = 'user?*: { { name: string }, default: N }'
      const result = parse(`${schema}\n---\n~`, null).toJSON()
      expect(result.user).toBeNull()
    })
  })

  describe('Multiple object fields', () => {
    test('should validate each object independently', () => {
      const schema = 'user: { name: string }, point: { x: number, y: number }'
      const result = parse(`${schema}\n---\n{Alice}, {10, 20}`, null).toJSON()

      expect(result.user.name).toBe('Alice')
      expect(result.point.x).toBe(10)
      expect(result.point.y).toBe(20)
    })

    test('should report errors for the correct object', () => {
      const schema = 'a: { x: number }, b: { y: string }'

      expect(() => parse(`${schema}\n---\n{10}, {hello}`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n{invalid}, {hello}`, null)).toThrow() // a.x is not number
      expect(() => parse(`${schema}\n---\n{10}, {123}`, null)).toThrow() // b.y is not string
    })
  })

  describe('Edge cases', () => {
    test('should handle object with single property', () => {
      const schema = 'obj: { value: number }'
      const result = parse(`${schema}\n---\n{42}`, null).toJSON()
      expect(result.obj.value).toBe(42)
    })

    test('should handle object with many properties', () => {
      const schema = 'obj: { a: number, b: number, c: number, d: number }'
      const result = parse(`${schema}\n---\n{1, 2, 3, 4}`, null).toJSON()

      expect(result.obj.a).toBe(1)
      expect(result.obj.b).toBe(2)
      expect(result.obj.c).toBe(3)
      expect(result.obj.d).toBe(4)
    })

    test('should handle object in array', () => {
      const schema = 'items: [{ id: number, name: string }]'
      const result = parse(`${schema}\n---\n[{1, Item1}, {2, Item2}]`, null).toJSON()

      expect(result.items).toHaveLength(2)
      expect(result.items[0]).toEqual({ id: 1, name: 'Item1' })
      expect(result.items[1]).toEqual({ id: 2, name: 'Item2' })
    })

    test('should handle array in nested object', () => {
      const schema = 'data: { user: { name: string, roles: [string] } }'
      const result = parse(`${schema}\n---\n{{John, [admin, editor]}}`, null).toJSON()

      expect(result.data.user.name).toBe('John')
      expect(result.data.user.roles).toEqual(['admin', 'editor'])
    })
  })

  describe('Open objects', () => {
    test('should accept any properties in empty object schema', () => {
      const result = parse('obj: {}\n---\n{name: John, age: 25, active: T}', null).toJSON()

      expect(result.obj.name).toBe('John')
      expect(result.obj.age).toBe(25)
      expect(result.obj.active).toBe(true)
    })

    test('should accept any properties in object type', () => {
      const result = parse('obj: object\n---\n{x: 10, y: 20}', null).toJSON()

      expect(result.obj.x).toBe(10)
      expect(result.obj.y).toBe(20)
    })
  })
})
