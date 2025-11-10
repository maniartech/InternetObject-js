import { parse } from '../../../src'

describe('NumberDef - Integer and Float Types', () => {
  describe('int type (unbounded integer)', () => {
    test('should accept any integer', () => {
      expect(() => parse('num: int\n---\n42', null)).not.toThrow()
      expect(() => parse('num: int\n---\n-42', null)).not.toThrow()
      expect(() => parse('num: int\n---\n0', null)).not.toThrow()
      expect(() => parse('num: int\n---\n999999999', null)).not.toThrow()
    })

    test('should respect min/max constraints', () => {
      const schema = 'num: { int, min: 10, max: 100 }'

      expect(() => parse(`${schema}\n---\n10`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n50`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n100`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n9`, null)).toThrow(/range/)
      expect(() => parse(`${schema}\n---\n101`, null)).toThrow(/range/)
    })

    test('should respect min-only constraint', () => {
      const schema = 'num: { int, min: 0 }'

      expect(() => parse(`${schema}\n---\n0`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n100`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-1`, null)).toThrow(/range/)
    })

    test('should respect max-only constraint', () => {
      const schema = 'num: { int, max: 100 }'

      expect(() => parse(`${schema}\n---\n100`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n101`, null)).toThrow(/range/)
    })
  })

  describe('uint type (unsigned integer)', () => {
    test('should accept non-negative integers', () => {
      expect(() => parse('num: uint\n---\n0', null)).not.toThrow()
      expect(() => parse('num: uint\n---\n42', null)).not.toThrow()
      expect(() => parse('num: uint\n---\n999999', null)).not.toThrow()
    })

    test('should reject negative integers', () => {
      expect(() => parse('num: uint\n---\n-1', null)).toThrow(/range/)
      expect(() => parse('num: uint\n---\n-100', null)).toThrow(/range/)
    })

    test('should respect min/max constraints', () => {
      const schema = 'num: { uint, min: 10, max: 100 }'

      expect(() => parse(`${schema}\n---\n50`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n9`, null)).toThrow(/range/)
      expect(() => parse(`${schema}\n---\n101`, null)).toThrow(/range/)
    })
  })

  describe('int8 type (-128 to 127)', () => {
    test('should accept values within int8 range', () => {
      expect(() => parse('num: int8\n---\n-128', null)).not.toThrow()
      expect(() => parse('num: int8\n---\n0', null)).not.toThrow()
      expect(() => parse('num: int8\n---\n127', null)).not.toThrow()
    })

    test('should reject values outside int8 range', () => {
      expect(() => parse('num: int8\n---\n-129', null)).toThrow(/range/)
      expect(() => parse('num: int8\n---\n128', null)).toThrow(/range/)
    })

    test('should respect custom min/max within bounds', () => {
      const schema = 'num: { int8, min: -10, max: 10 }'

      expect(() => parse(`${schema}\n---\n-10`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-11`, null)).toThrow(/range/)
      expect(() => parse(`${schema}\n---\n11`, null)).toThrow(/range/)
    })
  })

  describe('uint8 type (0 to 255)', () => {
    test('should accept values within uint8 range', () => {
      expect(() => parse('num: uint8\n---\n0', null)).not.toThrow()
      expect(() => parse('num: uint8\n---\n128', null)).not.toThrow()
      expect(() => parse('num: uint8\n---\n255', null)).not.toThrow()
    })

    test('should reject values outside uint8 range', () => {
      expect(() => parse('num: uint8\n---\n-1', null)).toThrow(/range/)
      expect(() => parse('num: uint8\n---\n256', null)).toThrow(/range/)
    })

    test('should respect custom min/max within bounds', () => {
      const schema = 'num: { uint8, min: 10, max: 200 }'

      expect(() => parse(`${schema}\n---\n100`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n9`, null)).toThrow(/range/)
      expect(() => parse(`${schema}\n---\n201`, null)).toThrow(/range/)
    })
  })

  describe('int16 type (-32768 to 32767)', () => {
    test('should accept values within int16 range', () => {
      expect(() => parse('num: int16\n---\n-32768', null)).not.toThrow()
      expect(() => parse('num: int16\n---\n0', null)).not.toThrow()
      expect(() => parse('num: int16\n---\n32767', null)).not.toThrow()
    })

    test('should reject values outside int16 range', () => {
      expect(() => parse('num: int16\n---\n-32769', null)).toThrow(/range/)
      expect(() => parse('num: int16\n---\n32768', null)).toThrow(/range/)
    })
  })

  describe('uint16 type (0 to 65535)', () => {
    test('should accept values within uint16 range', () => {
      expect(() => parse('num: uint16\n---\n0', null)).not.toThrow()
      expect(() => parse('num: uint16\n---\n32768', null)).not.toThrow()
      expect(() => parse('num: uint16\n---\n65535', null)).not.toThrow()
    })

    test('should reject values outside uint16 range', () => {
      expect(() => parse('num: uint16\n---\n-1', null)).toThrow(/range/)
      expect(() => parse('num: uint16\n---\n65536', null)).toThrow(/range/)
    })
  })

  describe('int32 type (-2147483648 to 2147483647)', () => {
    test('should accept values within int32 range', () => {
      expect(() => parse('num: int32\n---\n-2147483648', null)).not.toThrow()
      expect(() => parse('num: int32\n---\n0', null)).not.toThrow()
      expect(() => parse('num: int32\n---\n2147483647', null)).not.toThrow()
    })

    test('should reject values outside int32 range', () => {
      expect(() => parse('num: int32\n---\n-2147483649', null)).toThrow(/range/)
      expect(() => parse('num: int32\n---\n2147483648', null)).toThrow(/range/)
    })
  })

  describe('uint32 type (0 to 4294967295)', () => {
    test('should accept values within uint32 range', () => {
      expect(() => parse('num: uint32\n---\n0', null)).not.toThrow()
      expect(() => parse('num: uint32\n---\n2147483648', null)).not.toThrow()
      expect(() => parse('num: uint32\n---\n4294967295', null)).not.toThrow()
    })

    test('should reject values outside uint32 range', () => {
      expect(() => parse('num: uint32\n---\n-1', null)).toThrow(/range/)
      expect(() => parse('num: uint32\n---\n4294967296', null)).toThrow(/range/)
    })
  })

  describe('float and number types', () => {
    test('should accept float values', () => {
      expect(() => parse('num: float\n---\n3.14', null)).not.toThrow()
      expect(() => parse('num: float\n---\n-3.14', null)).not.toThrow()
      expect(() => parse('num: number\n---\n42.5', null)).not.toThrow()
    })

    test('should accept integers', () => {
      expect(() => parse('num: float\n---\n42', null)).not.toThrow()
      expect(() => parse('num: number\n---\n42', null)).not.toThrow()
    })

    test('should respect min/max constraints', () => {
      const schema = 'num: { float, min: 0.0, max: 100.0 }'

      expect(() => parse(`${schema}\n---\n50.5`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-0.1`, null)).toThrow(/range/)
      expect(() => parse(`${schema}\n---\n100.1`, null)).toThrow(/range/)
    })
  })

  describe('Unsupported types', () => {
    test('should throw for int64', () => {
      expect(() => parse('num: int64\n---\n42', null)).toThrow(/not supported/)
    })

    test('should throw for uint64', () => {
      expect(() => parse('num: uint64\n---\n42', null)).toThrow(/not supported/)
    })

    test('should throw for float32', () => {
      expect(() => parse('num: float32\n---\n42', null)).toThrow(/not supported/)
    })

    test('should throw for float64', () => {
      expect(() => parse('num: float64\n---\n42', null)).toThrow(/not supported/)
    })
  })

  describe('Multiple number fields', () => {
    test('should validate each field independently', () => {
      const schema = 'a: int8, b: uint8, c: int16, d: { int, min: 0, max: 100 }'
      const validData = `${schema}\n---\n-50, 200, -1000, 50`

      expect(() => parse(validData, null)).not.toThrow()
    })

    test('should report errors for the correct field', () => {
      const schema = 'a: int8, b: uint8'

      expect(() => parse(`${schema}\n---\n-129, 100`, null)).toThrow() // a out of range
      expect(() => parse(`${schema}\n---\n100, 256`, null)).toThrow() // b out of range
    })
  })

  describe('Edge cases', () => {
    test('should handle zero correctly', () => {
      expect(() => parse('num: int\n---\n0', null)).not.toThrow()
      expect(() => parse('num: uint\n---\n0', null)).not.toThrow()
      expect(() => parse('num: { int, min: 0 }\n---\n0', null)).not.toThrow()
    })

    test('should handle boundary values', () => {
      expect(() => parse('num: { int, min: 10, max: 10 }\n---\n10', null)).not.toThrow()
      expect(() => parse('num: { int, min: 10, max: 10 }\n---\n9', null)).toThrow(/range/)
      expect(() => parse('num: { int, min: 10, max: 10 }\n---\n11', null)).toThrow(/range/)
    })

    test('should handle very large integers', () => {
      expect(() => parse('num: int\n---\n9007199254740991', null)).not.toThrow()
      expect(() => parse('num: int\n---\n-9007199254740991', null)).not.toThrow()
    })

    test('should handle very small floats', () => {
      expect(() => parse('num: float\n---\n0.000001', null)).not.toThrow()
      expect(() => parse('num: float\n---\n-0.000001', null)).not.toThrow()
    })
  })
})
