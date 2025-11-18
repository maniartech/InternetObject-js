import { parse } from '../../../src'

describe('Decimal - multipleOf Constraint', () => {
  describe('Basic multipleOf validation', () => {
    test('should accept values that are multiples', () => {
      const schema = 'num: { decimal, multipleOf: 5m }'

      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n100m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-10m`, null)).not.toThrow()
    })

    test('should reject values that are not multiples', () => {
      const schema = 'num: { decimal, multipleOf: 5m }'

      expect(() => parse(`${schema}\n---\n1m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n3m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n7m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n-3m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n103m`, null)).toThrow(/multiple/)
    })
  })

  describe('Fractional multipleOf values', () => {
    test('should work with multipleOf 0.5', () => {
      const schema = 'num: { decimal, multipleOf: 0.5m }'

      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1.5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n2m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-1.5m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n0.3m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n1.2m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n2.7m`, null)).toThrow(/multiple/)
    })

    test('should work with multipleOf 0.1', () => {
      const schema = 'num: { decimal, multipleOf: 0.1m }'

      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.1m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n2.3m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-1.7m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n0.15m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n1.23m`, null)).toThrow(/multiple/)
    })

    test('should work with multipleOf 0.25 (quarters)', () => {
      const schema = 'num: { decimal, multipleOf: 0.25m }'

      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.25m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.75m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n2.5m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n0.1m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n0.33m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n1.1m`, null)).toThrow(/multiple/)
    })

    test('should work with multipleOf 0.01 (cents)', () => {
      const schema = 'num: { decimal, multipleOf: 0.01m }'

      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.01m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.99m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1.23m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10.50m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n0.001m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n1.234m`, null)).toThrow(/multiple/)
    })
  })

  describe('Integer multipleOf values', () => {
    test('should work with multipleOf 2 (even numbers)', () => {
      const schema = 'num: { decimal, multipleOf: 2m }'

      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n2m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n42m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-8m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n1m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n43m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n-7m`, null)).toThrow(/multiple/)
    })

    test('should work with multipleOf 10', () => {
      const schema = 'num: { decimal, multipleOf: 10m }'

      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n100m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-50m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n5m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n99m`, null)).toThrow(/multiple/)
    })
  })

  describe('Combining multipleOf with min/max', () => {
    test('should work with min constraint', () => {
      const schema = 'num: { decimal, multipleOf: 5m, min: 10m }'

      expect(() => parse(`${schema}\n---\n10m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n15m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n100m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n5m`, null)).toThrow(/range/) // valid multiple but below min
      expect(() => parse(`${schema}\n---\n11m`, null)).toThrow(/multiple/) // above min but not multiple
      expect(() => parse(`${schema}\n---\n0m`, null)).toThrow(/range/)
    })

    test('should work with max constraint', () => {
      const schema = 'num: { decimal, multipleOf: 5m, max: 50m }'

      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n25m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n50m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n55m`, null)).toThrow(/range/) // valid multiple but above max
      expect(() => parse(`${schema}\n---\n49m`, null)).toThrow(/multiple/) // below max but not multiple
    })

    test('should work with both min and max constraints', () => {
      const schema = 'num: { decimal, multipleOf: 10m, min: 20m, max: 80m }'

      expect(() => parse(`${schema}\n---\n20m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n50m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n80m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n10m`, null)).toThrow(/range/) // valid multiple but below min
      expect(() => parse(`${schema}\n---\n90m`, null)).toThrow(/range/) // valid multiple but above max
      expect(() => parse(`${schema}\n---\n45m`, null)).toThrow(/multiple/) // within range but not multiple
    })

    test('should work with fractional multipleOf and min/max', () => {
      const schema = 'num: { decimal, multipleOf: 0.5m, min: 1m, max: 5m }'

      expect(() => parse(`${schema}\n---\n1m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1.5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n2m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n4.5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n5m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n0.5m`, null)).toThrow(/range/) // valid multiple but below min
      expect(() => parse(`${schema}\n---\n5.5m`, null)).toThrow(/range/) // valid multiple but above max
      expect(() => parse(`${schema}\n---\n1.3m`, null)).toThrow(/multiple/) // within range but not multiple
    })
  })

  describe('Combining multipleOf with precision/scale', () => {
    test('should work with precision constraint', () => {
      const schema = 'num: { decimal, multipleOf: 0.1m, precision: 4 }'

      expect(() => parse(`${schema}\n---\n0.1m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n12.3m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n123.4m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n0.15m`, null)).toThrow(/multiple/)
    })

    test('should work with scale constraint', () => {
      const schema = 'num: { decimal, multipleOf: 0.01m, scale: 2 }'

      expect(() => parse(`${schema}\n---\n0.01m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1.23m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10.50m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n0.001m`, null)).toThrow(/scale/)
      expect(() => parse(`${schema}\n---\n1.234m`, null)).toThrow(/scale/)
    })
  })

  describe('Edge cases', () => {
    test('should handle zero as valid multiple', () => {
      const schema = 'num: { decimal, multipleOf: 5m }'
      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
    })

    test('should handle negative values', () => {
      const schema = 'num: { decimal, multipleOf: 7m }'

      expect(() => parse(`${schema}\n---\n-7m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-14m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-21m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n-1m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n-8m`, null)).toThrow(/multiple/)
    })

    test('should handle negative fractional multipleOf', () => {
      const schema = 'num: { decimal, multipleOf: 0.5m }'

      expect(() => parse(`${schema}\n---\n-0.5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-1m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-1.5m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n-0.3m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n-1.2m`, null)).toThrow(/multiple/)
    })

    test('should handle boundary value equals to multipleOf', () => {
      const schema = 'num: { decimal, multipleOf: 100m }'

      expect(() => parse(`${schema}\n---\n100m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n-100m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n99m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n101m`, null)).toThrow(/multiple/)
    })

    test('should handle very small multipleOf values', () => {
      const schema = 'num: { decimal, multipleOf: 0.001m }'

      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.001m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.123m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1.234m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n0.0001m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n1.2345m`, null)).toThrow(/multiple/)
    })
  })

  describe('Large decimal values', () => {
    test('should work with large multipleOf', () => {
      const schema = 'num: { decimal, multipleOf: 1000000m }'

      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1000000m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n5000000m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n1m`, null)).toThrow(/multiple/)
      expect(() => parse(`${schema}\n---\n999999m`, null)).toThrow(/multiple/)
    })

    test('should work with very large decimal values', () => {
      const schema = 'num: { decimal, multipleOf: 100m }'

      expect(() =>
        parse(`${schema}\n---\n999999999999999999999999999900m`, null)
      ).not.toThrow()
      expect(() =>
        parse(`${schema}\n---\n-999999999999999999999999999900m`, null)
      ).not.toThrow()

      expect(() =>
        parse(`${schema}\n---\n999999999999999999999999999999m`, null)
      ).toThrow(/multiple/)
    })
  })

  describe('Multiple fields with multipleOf', () => {
    test('should validate each field independently', () => {
      const schema = 'a: { decimal, multipleOf: 5m }, b: { decimal, multipleOf: 0.5m }'

      expect(() => parse(`${schema}\n---\n5m, 0.5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10m, 1m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n15m, 1.5m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n3m, 0.5m`, null)).toThrow() // a not multiple of 5
      expect(() => parse(`${schema}\n---\n5m, 0.3m`, null)).toThrow() // b not multiple of 0.5
    })

    test('should work with different constraints per field', () => {
      const schema =
        'a: { decimal, multipleOf: 2m, min: 0m }, b: { decimal, multipleOf: 0.5m, max: 100m }'

      expect(() => parse(`${schema}\n---\n2m, 0.5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10m, 50m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n3m, 0.5m`, null)).toThrow() // a not multiple of 2
      expect(() => parse(`${schema}\n---\n2m, 100.3m`, null)).toThrow() // b exceeds max
      expect(() => parse(`${schema}\n---\n-2m, 0.5m`, null)).toThrow() // a below min
    })
  })

  describe('Real-world use cases', () => {
    test('should work for prices with cents (multipleOf 0.01)', () => {
      const schema = 'price: { decimal, multipleOf: 0.01m, min: 0m, scale: 2 }'

      expect(() => parse(`${schema}\n---\n0.00m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.01m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1.99m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n99.99m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n-0.01m`, null)).toThrow()
    })

    test('should work for measurements in quarters (multipleOf 0.25)', () => {
      const schema = 'measurement: { decimal, multipleOf: 0.25m, min: 0m }'

      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.25m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n1.5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n10.75m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n0.1m`, null)).toThrow()
      expect(() => parse(`${schema}\n---\n1.33m`, null)).toThrow()
    })

    test('should work for percentages (multipleOf 0.01)', () => {
      const schema = 'percentage: { decimal, multipleOf: 0.01m, min: 0m, max: 100m }'

      expect(() => parse(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n0.01m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n50.5m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n99.99m`, null)).not.toThrow()
      expect(() => parse(`${schema}\n---\n100m`, null)).not.toThrow()

      expect(() => parse(`${schema}\n---\n0.001m`, null)).toThrow()
      expect(() => parse(`${schema}\n---\n100.01m`, null)).toThrow()
    })
  })
})
