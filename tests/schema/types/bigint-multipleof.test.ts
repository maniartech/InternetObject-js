import { parse } from '../../../src'

describe('BigIntDef - multipleOf Constraint', () => {
  describe('Basic multipleOf validation', () => {
    test('should accept values that are multiples', () => {
      const schema = 'num: { bigint, multipleOf: 5n }'

      expect(() => parse(`${schema}\n---\n0n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n5n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n100n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-5n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-10n`, null)).not.toThrow()
    })

    test('should reject values that are not multiples', () => {
      const schema = 'num: { bigint, multipleOf: 5n }'

      expect(() => parse(`${schema}\n---\n1n`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n3n`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n7n`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n-3n`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n103n`, null)).toThrow(/multiple/)
    })
  })

  describe('Different multipleOf values', () => {
    test('should work with multipleOf 2 (even numbers)', () => {
      const schema = 'num: { bigint, multipleOf: 2n }'

      expect(() => parse(`${schema}\n---\n2n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n42n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-8n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n1n`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n43n`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n-7n`, null)).toThrow(/multiple/)
    })

    test('should work with multipleOf 10', () => {
      const schema = 'num: { bigint, multipleOf: 10n }'

      expect(() => parse(`${schema}\n---\n0n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n100n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-50n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n5n`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n99n`, null)).toThrow(/multiple/)
    })

    test('should work with multipleOf 1 (all values valid)', () => {
      const schema = 'num: { bigint, multipleOf: 1n }'

      expect(() => parse(`${schema}\n---\n0n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n42n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-17n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n999999n`, null)).not.toThrow()
    })
  })

  describe('Large multipleOf values', () => {
    test('should work with large multipleOf', () => {
      const schema = 'num: { bigint, multipleOf: 1000000n }'

      expect(() => parse(`${schema}\n---\n0n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1000000n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n5000000n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-3000000n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n1n`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n999999n`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n1000001n`, null)).toThrow(/multiple/)
    })

    test('should work with very large multipleOf beyond Number.MAX_SAFE_INTEGER', () => {
      const schema = 'num: { bigint, multipleOf: 10000000000000000n }'

      expect(() => parse(`${schema}\n---\n0n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10000000000000000n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n30000000000000000n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n1n`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n9999999999999999n`, null)).toThrow(/multiple/)
    })
  })

  describe('Combining multipleOf with min/max', () => {
    test('should work with min constraint', () => {
      const schema = 'num: { bigint, multipleOf: 5n, min: 10n }'

      expect(() => parse(`${schema}\n---\n10n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n15n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n100n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n5n`, null)).toThrow(/range/) // valid multiple but below min
      expect(() => parse(`${schema}\n---\n11n`, null)).toThrow(/multiple/) // above min but not multiple
      expect(() => parse(`${schema}\n---\n0n`, null)).toThrow(/range/)
    })

    test('should work with max constraint', () => {
      const schema = 'num: { bigint, multipleOf: 5n, max: 50n }'

      expect(() => parse(`${schema}\n---\n0n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n25n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n50n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n55n`, null)).toThrow(/range/) // valid multiple but above max
      expect(() => parse(`${schema}\n---\n49n`, null)).toThrow(/multiple/) // below max but not multiple
    })

    test('should work with both min and max constraints', () => {
      const schema = 'num: { bigint, multipleOf: 10n, min: 20n, max: 80n }'

      expect(() => parse(`${schema}\n---\n20n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n50n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n80n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n10n`, null)).toThrow(/range/) // valid multiple but below min
      expect(() => parse(`${schema}\n---\n90n`, null)).toThrow(/range/) // valid multiple but above max
      expect(() => parse(`${schema}\n---\n45n`, null)).toThrow(/multiple/) // within range but not multiple
    })
  })

  describe('Edge cases', () => {
    test('should handle zero as valid multiple', () => {
      const schema = 'num: { bigint, multipleOf: 5n }'
      expect(() => parse(`${schema}\n---\n0n`, null)).not.toThrow()
    })

    test('should handle negative values', () => {
      const schema = 'num: { bigint, multipleOf: 7n }'

      expect(() => parse(`${schema}\n---\n-7n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-14n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-21n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n-1n`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n-8n`, null)).toThrow(/multiple/)
    })

    test('should handle boundary value equals to multipleOf', () => {
      const schema = 'num: { bigint, multipleOf: 100n }'

      expect(() => parse(`${schema}\n---\n100n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-100n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n99n`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n101n`, null)).toThrow(/multiple/)
    })
  })

  describe('Multiple fields with multipleOf', () => {
    test('should validate each field independently', () => {
      const schema = 'a: { bigint, multipleOf: 5n }, b: { bigint, multipleOf: 10n }'

      expect(() => parse(`${schema}\n---\n5n, 10n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10n, 20n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n15n, 30n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n3n, 10n`, null)).toThrow() // a not multiple of 5
      expect(() => parse(`${schema}\n---\n5n, 15n`, null)).toThrow() // b not multiple of 10
    })

    test('should work with different constraints per field', () => {
      const schema =
        'a: { bigint, multipleOf: 2n, min: 0n }, b: { bigint, multipleOf: 5n, max: 100n }'

      expect(() => parse(`${schema}\n---\n2n, 5n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10n, 50n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n3n, 5n`, null)).toThrow() // a not multiple of 2
      expect(() => parse(`${schema}\n---\n2n, 103n`, null)).toThrow() // b exceeds max
      expect(() => parse(`${schema}\n---\n-2n, 5n`, null)).toThrow() // a below min
    })
  })

  describe('Real-world use cases', () => {
    test('should work for prices in cents (multipleOf 1)', () => {
      const schema = 'priceInCents: { bigint, multipleOf: 1n, min: 0n }'

      expect(() => parse(`${schema}\n---\n0n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n100n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n9999n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n-1n`, null)).toThrow()
    })

    test('should work for quantities in dozens (multipleOf 12)', () => {
      const schema = 'quantityInDozens: { bigint, multipleOf: 12n, min: 0n }'

      expect(() => parse(`${schema}\n---\n0n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n12n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n24n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n144n`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n1n`, null)).toThrow()
      expect(() => parse(`${schema}\n---\n13n`, null)).toThrow()
      expect(() => parse(`${schema}\n---\n25n`, null)).toThrow()
    })

    test('should work for data sizes in KB (multipleOf 1024)', () => {
      const schema = 'sizeInBytes: { bigint, multipleOf: 1024n, min: 0n }'

      expect(() => parse(`${schema}\n---\n0n`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1024n`, null)).not.toThrow() // 1KB
      expect(() => parse(`${schema}\n---\n2048n`, null)).not.toThrow() // 2KB
      expect(() => parse(`${schema}\n---\n1048576n`, null)).not.toThrow() // 1MB

      expect(() => parse(`${schema}\n---\n1n`, null)).toThrow()
      expect(() => parse(`${schema}\n---\n1025n`, null)).toThrow()
      expect(() => parse(`${schema}\n---\n2000n`, null)).toThrow()
    })
  })
})
