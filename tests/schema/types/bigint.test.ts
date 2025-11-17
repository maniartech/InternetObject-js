import { parse } from '../../../src'

describe('BigIntDef - BigInt Type Validation', () => {
  describe('Basic bigint validation', () => {
    test('should accept bigint values', () => {
      expect(() => parse('num: bigint\n---\n42n', null)).not.toThrow()
      expect(() => parse('num: bigint\n---\n-42n', null)).not.toThrow()
      expect(() => parse('num: bigint\n---\n0n', null)).not.toThrow()
    })

    test('should accept very large bigint values', () => {
      expect(() => parse('num: bigint\n---\n9007199254740992n', null)).not.toThrow()
      expect(() => parse('num: bigint\n---\n123456789012345678901234567890n', null)).not.toThrow()
    })

    test('should accept negative bigint values', () => {
      expect(() => parse('num: bigint\n---\n-9007199254740992n', null)).not.toThrow()
      expect(() => parse('num: bigint\n---\n-123456789012345678901234567890n', null)).not.toThrow()
    })
  })

  describe('Min/Max constraints', () => {
    test('should respect min constraint', () => {
      const schema = 'num: { bigint, min: 10n }'

      expect(() => parse(`${schema}\n---\n10n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n100n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n9n`, null)).toThrow(/range/)
    })

    test('should respect max constraint', () => {
      const schema = 'num: { bigint, max: 100n }'

      expect(() => parse(`${schema}\n---\n100n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n101n`, null)).toThrow(/range/)
    })

    test('should respect both min and max constraints', () => {
      const schema = 'num: { bigint, min: 10n, max: 100n }'

      expect(() => parse(`${schema}\n---\n10n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n50n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n100n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n9n`, null)).toThrow(/range/)
      expect(() => parse(`${schema}\n---\n101n`, null)).toThrow(/range/)
    })

    test('should handle very large min/max values', () => {
      const schema = 'num: { bigint, min: 1000000000000000000n, max: 9999999999999999999n }'

      expect(() => parse(`${schema}\n---\n5000000000000000000n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n999999999999999999n`, null)).toThrow(/range/)
      expect(() => parse(`${schema}\n---\n10000000000000000000n`, null)).toThrow(/range/)
    })

    test('should handle negative min/max values', () => {
      const schema = 'num: { bigint, min: -100n, max: -10n }'

      expect(() => parse(`${schema}\n---\n-50n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-101n`, null)).toThrow(/range/)
      expect(() => parse(`${schema}\n---\n-9n`, null)).toThrow(/range/)
    })
  })

  describe('Edge cases', () => {
    test('should handle zero', () => {
      expect(() => parse('num: bigint\n---\n0n', null)).not.toThrow()
      expect(() => parse('num: { bigint, min: 0n }\n---\n0n', null)).not.toThrow()
      expect(() => parse('num: { bigint, min: 0n }\n---\n-1n', null)).toThrow(/range/)
    })

    test('should handle boundary values', () => {
      const schema = 'num: { bigint, min: 10n, max: 10n }'

      expect(() => parse(`${schema}\n---\n10n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n9n`, null)).toThrow(/range/)
      expect(() => parse(`${schema}\n---\n11n`, null)).toThrow(/range/)
    })

    test('should handle very large numbers beyond Number.MAX_SAFE_INTEGER', () => {
      const beyondSafe = 'num: bigint\n---\n99999999999999999999999999999999n'
      expect(() => parse(beyondSafe, null)).not.toThrow()
    })
  })

  describe('Multiple bigint fields', () => {
    test('should validate each field independently', () => {
      const schema = 'a: bigint, b: { bigint, min: 0n }, c: { bigint, max: 1000n }'
      const validData = `${schema}\n---\n-100n, 50n, 500n`

      expect(() => parse(validData, null)).not.toThrow()
    })

    test('should report errors for the correct field', () => {
      const schema = 'a: { bigint, min: 10n }, b: { bigint, max: 100n }'

      expect(() => parse(`${schema}\n---\n9n, 50n`, null)).toThrow() // a out of range
      expect(() => parse(`${schema}\n---\n50n, 101n`, null)).toThrow() // b out of range
    })
  })

  describe('Type validation', () => {
    test('should reject non-bigint values', () => {
      // Note: This depends on parser behavior - if parser converts regular numbers to bigint
      // these tests may need adjustment based on actual implementation
      expect(() => parse('num: bigint\n---\n42', null)).toThrow()
    })
  })

  describe('Min-only and Max-only constraints', () => {
    test('should work with min-only', () => {
      const schema = 'num: { bigint, min: 1000000n }'

      expect(() => parse(`${schema}\n---\n1000000n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n9999999n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n999999n`, null)).toThrow(/range/)
    })

    test('should work with max-only', () => {
      const schema = 'num: { bigint, max: 1000000n }'

      expect(() => parse(`${schema}\n---\n1000000n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-9999999n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1000001n`, null)).toThrow(/range/)
    })
  })

  describe('Unsigned bigint behavior', () => {
    test('should allow non-negative values with min: 0n', () => {
      const schema = 'num: { bigint, min: 0n }'

      expect(() => parse(`${schema}\n---\n0n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n999999n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-1n`, null)).toThrow(/range/)
    })
  })
})
