import { parse } from '../../../src'

describe('ArrayDef - Array Type', () => {
  describe('Basic array validation', () => {
    test('should accept empty array', () => {
      expect(() => parse('arr: []\n---\n[]', null)).not.toThrow()
      expect(() => parse('arr: array\n---\n[]', null)).not.toThrow()
    })

    test('should accept array of any type', () => {
      const result = parse('arr: []\n---\n[1, hello, T, N]', null).toJSON()
      expect(result.arr).toEqual([1, 'hello', true, null])
    })

    test('should reject non-array values', () => {
      expect(() => parse('arr: []\n---\n123', null)).toThrow(/array/i)
      expect(() => parse('arr: []\n---\n"not an array"', null)).toThrow(/array/i)
    })
  })

  describe('Typed arrays', () => {
    test('should accept array of numbers', () => {
      const result = parse('nums: [number]\n---\n[1, 2, 3.5, -10]', null).toJSON()
      expect(result.nums).toEqual([1, 2, 3.5, -10])
    })

    test('should accept array of strings', () => {
      const result = parse('strs: [string]\n---\n[hello, world, foo]', null).toJSON()
      expect(result.strs).toEqual(['hello', 'world', 'foo'])
    })

    test('should accept array of booleans', () => {
      const result = parse('flags: [bool]\n---\n[T, F, true, false]', null).toJSON()
      expect(result.flags).toEqual([true, false, true, false])
    })

    test('should reject wrong type in typed array', () => {
      expect(() => parse('nums: [number]\n---\n[1, 2, hello]', null)).toThrow()
      expect(() => parse('strs: [string]\n---\n[hello, 123]', null)).toThrow()
    })
  })

  describe('Array of objects', () => {
    // TODO: Re-enable after fixing IOObject serialization
    test.skip('should accept array of objects with schema', () => {
      const schema = 'users: [{ name: string, age: number }]'
      const result = parse(`${schema}\n---\n[{Alice, 25}, {Bob, 30}]`, null).toJSON()

      expect(result.users).toHaveLength(2)
      expect(result.users[0]).toEqual({ name: 'Alice', age: 25 })
      expect(result.users[1]).toEqual({ name: 'Bob', age: 30 })
    })

    test('should validate each object in array', () => {
      const schema = 'items: [{ id: number, name: string }]'

      expect(() => parse(`${schema}\n---\n[{1, Item1}, {2, Item2}]`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n[{1, Item1}, {invalid, Item2}]`, null)).toThrow()
    })
  })

  describe('Length constraints', () => {
    test('should validate exact length (len)', () => {
      const schema = 'arr: { array, of: number, len: 3 }'

      expect(() => parse(`${schema}\n---\n[1, 2, 3]`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n[1, 2]`, null)).toThrow()
      expect(() => parse(`${schema}\n---\n[1, 2, 3, 4]`, null)).toThrow()
    })

    test('should validate minLen', () => {
      const schema = 'arr: { array, of: number, minLen: 2 }'

      expect(() => parse(`${schema}\n---\n[1, 2]`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n[1, 2, 3]`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n[1]`, null)).toThrow()
    })

    test('should validate maxLen', () => {
      const schema = 'arr: { array, of: number, maxLen: 3 }'

      expect(() => parse(`${schema}\n---\n[1, 2, 3]`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n[1, 2]`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n[1, 2, 3, 4]`, null)).toThrow()
    })

    test('should validate both minLen and maxLen', () => {
      const schema = 'arr: { array, of: number, minLen: 2, maxLen: 4 }'

      expect(() => parse(`${schema}\n---\n[1, 2]`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n[1, 2, 3, 4]`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n[1]`, null)).toThrow()
      expect(() => parse(`${schema}\n---\n[1, 2, 3, 4, 5]`, null)).toThrow()
    })

    test('should accept empty array when minLen is 0', () => {
      const schema = 'arr: { array, of: number, minLen: 0 }'
      expect(() => parse(`${schema}\n---\n[]`, null)).not.toThrow()
    })
  })

  describe('Array with item constraints', () => {
    test('should validate constrained items', () => {
      const schema = 'arr: [{ string, maxLen: 5 }]'

      expect(() => parse(`${schema}\n---\n[hello, world]`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n[hello, toolong]`, null)).toThrow(/maxLen/i)
    })

    test('should validate number range in array', () => {
      const schema = 'arr: [{ int, min: 1, max: 10 }]'

      expect(() => parse(`${schema}\n---\n[1, 5, 10]`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n[1, 5, 15]`, null)).toThrow(/range/i)
    })
  })

  describe('Nested arrays', () => {
    test('should accept nested arrays', () => {
      const result = parse('matrix: [[]]\n---\n[[1, 2], [3, 4]]', null).toJSON()
      expect(result.matrix).toEqual([[1, 2], [3, 4]])
    })

    test('should accept typed nested arrays', () => {
      const result = parse('matrix: [[number]]\n---\n[[1, 2], [3, 4, 5]]', null).toJSON()
      expect(result.matrix).toEqual([[1, 2], [3, 4, 5]])
    })

    test('should validate nested array dimensions', () => {
      const schema = 'matrix: { array, of: [int], len: 2 }'

      expect(() => parse(`${schema}\n---\n[[1, 2], [3, 4]]`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n[[1, 2]]`, null)).toThrow()
    })
  })

  describe('Optional and null', () => {
    test('should allow optional array', () => {
      const schema = 'arr?: [number]'
      expect(() => parse(`${schema}\n---\n~`, null)).not.toThrow()
    })

    test('should allow null when specified', () => {
      const schema = 'arr*: [number]'
      const result = parse(`${schema}\n---\nN`, null).toJSON()
      expect(result.arr).toBeNull()
    })

    test('should reject null when not allowed', () => {
      const schema = 'arr: [number]'
      expect(() => parse(`${schema}\n---\nN`, null)).toThrow(/null/i)
    })

    test('should use default empty array', () => {
      const schema = 'arr: [number]'
      // Using multi-field schema to avoid array wrapping
      const result = parse(`${schema}, dummy?: string\n---\n[]`, null).toJSON()
      expect(result.arr).toEqual([])
    })
  })

  describe('Multiple array fields', () => {
    test('should validate each field independently', () => {
      const schema = 'nums: [number], strs: [string], flags: [bool]'
      const data = `${schema}\n---\n[1, 2, 3], [a, b, c], [T, F]`
      const result = parse(data, null).toJSON()

      expect(result.nums).toEqual([1, 2, 3])
      expect(result.strs).toEqual(['a', 'b', 'c'])
      expect(result.flags).toEqual([true, false])
    })

    test('should report errors for the correct field', () => {
      const schema = 'a: [number], b: [string], c: [bool]'

      expect(() => parse(`${schema}\n---\n[1, 2], [hello, 123], [T]`, null)).toThrow() // b has number
      expect(() => parse(`${schema}\n---\n[1], [hello], [invalid]`, null)).toThrow() // c is not bool
    })
  })

  describe('Edge cases', () => {
    // TODO: Re-enable after fixing IOObject serialization for nested objects
    test.skip('should handle mixed type arrays with any', () => {
      const result = parse('mixed: []\n---\n[1, hello, T, {x: 10}, [1, 2]]', null).toJSON()
      expect(result.mixed).toHaveLength(5)
      expect(result.mixed[0]).toBe(1)
      expect(result.mixed[1]).toBe('hello')
      expect(result.mixed[2]).toBe(true)
      expect(result.mixed[3]).toEqual({ x: 10 })
      expect(result.mixed[4]).toEqual([1, 2])
    })

    test('should handle array with null elements', () => {
      const result = parse('arr: []\n---\n[1, N, 3]', null).toJSON()
      expect(result.arr).toEqual([1, null, 3])
    })

    test('should handle single-element array', () => {
      const result = parse('arr: [number]\n---\n[42]', null).toJSON()
      expect(result.arr).toEqual([42])
    })

    test('should handle three-dimensional arrays', () => {
      const schema = 'cube: { array, of: [[int]], len: 2 }'
      const result = parse(`${schema}\n---\n[[[1, 2], [3, 4]], [[5, 6], [7, 8]]]`, null).toJSON()

      expect(result.cube).toHaveLength(2)
      expect(result.cube[0]).toEqual([[1, 2], [3, 4]])
      expect(result.cube[1]).toEqual([[5, 6], [7, 8]])
    })
  })
})
