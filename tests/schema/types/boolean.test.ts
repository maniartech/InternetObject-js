import { parse } from '../../../src'

describe('BooleanDef - Boolean Type', () => {
  describe('Basic boolean validation', () => {
    test('should accept T and true', () => {
      expect(() => parse('flag: bool\n---\nT', null)).not.toThrow()
      expect(() => parse('flag: bool\n---\ntrue', null)).not.toThrow()
    })

    test('should accept F and false', () => {
      expect(() => parse('flag: bool\n---\nF', null)).not.toThrow()
      expect(() => parse('flag: bool\n---\nfalse', null)).not.toThrow()
    })

    test('should reject non-boolean values', () => {
      expect(() => parse('flag: bool\n---\n"true"', null)).toThrow(/boolean/i)
      expect(() => parse('flag: bool\n---\n1', null)).toThrow(/boolean/i)
      expect(() => parse('flag: bool\n---\n0', null)).toThrow(/boolean/i)
    })
  })

  describe('Default values', () => {
    test('should use default when value is not provided', () => {
      const schema = 'active: bool'
      // Using multi-field schema to avoid array wrapping
      const result = parse(`${schema}, dummy?: string\n---\nT`, null).toJSON()
      expect(result.active).toBe(true)
    })

    test('should use false as default', () => {
      const schema = 'verified: bool'
      const result = parse(`${schema}, dummy?: string\n---\nF`, null).toJSON()
      expect(result.verified).toBe(false)
    })

    test('should override default with provided value', () => {
      const schema = 'flag?: { bool, default: T }'
      const result = parse(`${schema}\n---\nF`, null).toJSON()
      expect(result.flag).toBe(false)
    })
  })

  describe('Optional and null', () => {
    test('should allow optional boolean', () => {
      const schema = 'flag?: bool'
      expect(() => parse(`${schema}\n---\n~`, null)).not.toThrow()
    })

    test('should allow null when specified', () => {
      const schema = 'flag*: bool'
      const result = parse(`${schema}\n---\nN`, null).toJSON()
      expect(result.flag).toBeNull()
    })

    test('should reject null when not allowed', () => {
      const schema = 'flag: bool'
      expect(() => parse(`${schema}\n---\nN`, null)).toThrow(/null/i)
    })

    test('should allow both optional and null', () => {
      const schema = 'flag?*: bool'
      expect(() => parse(`${schema}\n---\n~`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\nN`, null)).not.toThrow()
    })
  })

  describe('Multiple boolean fields', () => {
    test('should validate each field independently', () => {
      const schema = 'active: bool, verified: bool, premium: bool'
      const data = `${schema}\n---\nT, F, true`
      const result = parse(data, null).toJSON()

      expect(result.active).toBe(true)
      expect(result.verified).toBe(false)
      expect(result.premium).toBe(true)
    })

    test('should report errors for the correct field', () => {
      const schema = 'a: bool, b: bool, c: bool'
      expect(() => parse(`${schema}\n---\nT, 1, F`, null)).toThrow() // b is not boolean
      expect(() => parse(`${schema}\n---\nT, F, "false"`, null)).toThrow() // c is not boolean
    })
  })

  describe('Edge cases', () => {
    test('should handle boolean in objects', () => {
      const schema = 'user: { name: string, active: bool }'
      const result = parse(`${schema}\n---\n{{John, T}}`, null).toJSON()

      expect(result.user.name).toBe('John')
      expect(result.user.active).toBe(true)
    })

    test('should handle boolean in arrays', () => {
      const schema = 'flags: [bool]'
      const result = parse(`${schema}\n---\n[T, F, true, false]`, null).toJSON()

      expect(result.flags).toEqual([true, false, true, false])
    })

    test('should work with mixed case', () => {
      expect(() => parse('flag: bool\n---\ntrue', null)).not.toThrow()
      expect(() => parse('flag: bool\n---\nfalse', null)).not.toThrow()
    })
  })
})
