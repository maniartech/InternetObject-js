import { parseDocument } from '../../../src'

describe('Decimal Validation Modes', () => {
  describe('Mode 1: Natural Comparison (no precision/scale)', () => {
    const schema = `num: { decimal, min: 10m, max: 100m }`

    test('should accept values with different scales', () => {
      expect(() => parseDocument(`${schema}\n---\n50m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n50.0m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n50.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n50.123m`, null)).not.toThrow()
    })

    test('should accept values with different precisions', () => {
      expect(() => parseDocument(`${schema}\n---\n10m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n10.5m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n99.99m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n100m`, null)).not.toThrow()
    })

    test('should validate min constraint naturally', () => {
      expect(() => parseDocument(`${schema}\n---\n9.99m`, null)).toThrow()
      expect(() => parseDocument(`${schema}\n---\n10m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n10.00m`, null)).not.toThrow()
    })

    test('should validate max constraint naturally', () => {
      expect(() => parseDocument(`${schema}\n---\n100m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n100.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n100.01m`, null)).toThrow()
    })

    test('should treat trailing zeros as equal for comparison', () => {
      // With min/max, different scales should work
      expect(() => parseDocument(`num: { decimal, min: 10m, max: 100m }\n---\n50m`, null)).not.toThrow()
      expect(() => parseDocument(`num: { decimal, min: 10m, max: 100m }\n---\n50.0m`, null)).not.toThrow()
      expect(() => parseDocument(`num: { decimal, min: 10m, max: 100m }\n---\n50.00m`, null)).not.toThrow()
    })
  })

  describe('Mode 2: Scale-Only Validation', () => {
    const schema = `amount: { decimal, scale: 2, min: 10.00m, max: 100.00m }`

    test('should accept values with exact scale', () => {
      expect(() => parseDocument(`${schema}\n---\n50.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n10.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n99.99m`, null)).not.toThrow()
    })

    test('should reject values with wrong scale', () => {
      expect(() => parseDocument(`${schema}\n---\n50m`, null)).toThrow(/scale/)
      expect(() => parseDocument(`${schema}\n---\n50.0m`, null)).toThrow(/scale/)
      expect(() => parseDocument(`${schema}\n---\n50.000m`, null)).toThrow(/scale/)
      expect(() => parseDocument(`${schema}\n---\n50.1m`, null)).toThrow(/scale/)
    })

    test('should allow any precision with exact scale', () => {
      expect(() => parseDocument(`${schema}\n---\n10.00m`, null)).not.toThrow() // precision 4
      expect(() => parseDocument(`${schema}\n---\n99.99m`, null)).not.toThrow() // precision 4
      expect(() => parseDocument(`amount: { decimal, scale: 2 }\n---\n123456.78m`, null)).not.toThrow() // precision 8
    })

    test('should validate min/max naturally with scale enforcement', () => {
      expect(() => parseDocument(`${schema}\n---\n9.99m`, null)).toThrow(expect.objectContaining({ errorCode: expect.stringMatching(/^mismatched-(min|max)$|^out-of-range-/) }))
      expect(() => parseDocument(`${schema}\n---\n10.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n100.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n100.01m`, null)).toThrow(expect.objectContaining({ errorCode: expect.stringMatching(/^mismatched-(min|max)$|^out-of-range-/) }))
    })

    test('should work for currency (USD)', () => {
      const usdSchema = `price: { decimal, scale: 2, min: 0.00m, max: 999999.99m }`

      expect(() => parseDocument(`${usdSchema}\n---\n19.99m`, null)).not.toThrow()
      expect(() => parseDocument(`${usdSchema}\n---\n0.01m`, null)).not.toThrow()
      expect(() => parseDocument(`${usdSchema}\n---\n999999.99m`, null)).not.toThrow()

      expect(() => parseDocument(`${usdSchema}\n---\n19.9m`, null)).toThrow(/scale/)
      expect(() => parseDocument(`${usdSchema}\n---\n1000000.00m`, null)).toThrow(expect.objectContaining({ errorCode: expect.stringMatching(/^mismatched-(min|max)$|^out-of-range-/) }))
    })

    test('should work for percentages', () => {
      const pctSchema = `rate: { decimal, scale: 2, min: 0.00m, max: 100.00m }`

      expect(() => parseDocument(`${pctSchema}\n---\n99.99m`, null)).not.toThrow()
      expect(() => parseDocument(`${pctSchema}\n---\n0.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${pctSchema}\n---\n100.00m`, null)).not.toThrow()

      expect(() => parseDocument(`${pctSchema}\n---\n99.9m`, null)).toThrow(/scale/)
      expect(() => parseDocument(`${pctSchema}\n---\n100.01m`, null)).toThrow(expect.objectContaining({ errorCode: expect.stringMatching(/^mismatched-(min|max)$|^out-of-range-/) }))
    })
  })

  describe('Mode 3: Precision-Only Validation', () => {
    const schema = `value: { decimal, precision: 5, min: 0m, max: 99999m }`

    test('should accept values within precision limit', () => {
      expect(() => parseDocument(`${schema}\n---\n123m`, null)).not.toThrow() // precision 3
      expect(() => parseDocument(`${schema}\n---\n123.4m`, null)).not.toThrow() // precision 4
      expect(() => parseDocument(`${schema}\n---\n123.45m`, null)).not.toThrow() // precision 5
      expect(() => parseDocument(`${schema}\n---\n12345m`, null)).not.toThrow() // precision 5
      expect(() => parseDocument(`${schema}\n---\n0.1234m`, null)).not.toThrow() // precision 4
      expect(() => parseDocument(`${schema}\n---\n0.12345m`, null)).not.toThrow() // precision 5
    })

    test('should reject values exceeding precision limit', () => {
      expect(() => parseDocument(`${schema}\n---\n123.456m`, null)).toThrow(/precision/)
      expect(() => parseDocument(`${schema}\n---\n123456m`, null)).toThrow(/precision/)
      expect(() => parseDocument(`${schema}\n---\n0.123456m`, null)).toThrow(/precision/)
    })

    test('should allow any scale within precision', () => {
      expect(() => parseDocument(`${schema}\n---\n12345m`, null)).not.toThrow() // scale 0
      expect(() => parseDocument(`${schema}\n---\n1234.5m`, null)).not.toThrow() // scale 1
      expect(() => parseDocument(`${schema}\n---\n123.45m`, null)).not.toThrow() // scale 2
      expect(() => parseDocument(`${schema}\n---\n12.345m`, null)).not.toThrow() // scale 3
      expect(() => parseDocument(`${schema}\n---\n1.2345m`, null)).not.toThrow() // scale 4
      expect(() => parseDocument(`${schema}\n---\n0.12345m`, null)).not.toThrow() // scale 5
    })

    test('should validate min/max naturally with precision enforcement', () => {
      expect(() => parseDocument(`${schema}\n---\n0m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n99999m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n100000m`, null)).toThrow() // exceeds max OR precision
    })

    test('should work for scientific measurements', () => {
      const sciSchema = `measurement: { decimal, precision: 5 }`

      expect(() => parseDocument(`${sciSchema}\n---\n123.45m`, null)).not.toThrow()
      expect(() => parseDocument(`${sciSchema}\n---\n0.12345m`, null)).not.toThrow()
      expect(() => parseDocument(`${sciSchema}\n---\n12345m`, null)).not.toThrow()

      expect(() => parseDocument(`${sciSchema}\n---\n123.456m`, null)).toThrow(/precision/)
      expect(() => parseDocument(`${sciSchema}\n---\n123456m`, null)).toThrow(/precision/)
    })
  })

  describe('Mode 4: Strict Validation (both precision and scale)', () => {
    const schema = `price: { decimal, precision: 10, scale: 2, min: 0m, max: 99999999.99m }`

    test('should accept values with exact scale within precision', () => {
      expect(() => parseDocument(`${schema}\n---\n1234.56m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n99.90m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n0.01m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n99999999.99m`, null)).not.toThrow()
    })

    test('should reject values with wrong scale', () => {
      expect(() => parseDocument(`${schema}\n---\n99.9m`, null)).toThrow(/scale/)
      expect(() => parseDocument(`${schema}\n---\n99.900m`, null)).toThrow(/scale/)
      expect(() => parseDocument(`${schema}\n---\n99m`, null)).toThrow(/scale/)
    })

    test('should reject values exceeding precision', () => {
      // 10 precision with scale 2 means max 8 integer digits
      expect(() => parseDocument(`${schema}\n---\n999999999.99m`, null)).toThrow(/precision/)
      expect(() => parseDocument(`${schema}\n---\n100000000.00m`, null)).toThrow(/precision/)
    })

    test('should calculate integer digits correctly', () => {
      // DECIMAL(10, 2) = 8 integer digits + 2 scale
      expect(() => parseDocument(`${schema}\n---\n99999999.99m`, null)).not.toThrow() // 8 int digits
      expect(() => parseDocument(`${schema}\n---\n999999999.99m`, null)).toThrow(/precision/) // 9 int digits
    })

    test('should work like SQL DECIMAL(10,2)', () => {
      const sqlSchema = `amount: { decimal, precision: 10, scale: 2 }`

      // Valid DECIMAL(10,2) values
      expect(() => parseDocument(`${sqlSchema}\n---\n0.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${sqlSchema}\n---\n12345678.90m`, null)).not.toThrow()
      expect(() => parseDocument(`${sqlSchema}\n---\n99999999.99m`, null)).not.toThrow()

      // Invalid - wrong scale
      expect(() => parseDocument(`${sqlSchema}\n---\n100.0m`, null)).toThrow(/scale/)
      expect(() => parseDocument(`${sqlSchema}\n---\n100.000m`, null)).toThrow(/scale/)

      // Invalid - exceeds precision
      expect(() => parseDocument(`${sqlSchema}\n---\n999999999.99m`, null)).toThrow(/precision/)
    })

    test('should validate min/max naturally in strict mode', () => {
      expect(() => parseDocument(`${schema}\n---\n0.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n99999999.99m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n100000000.00m`, null)).toThrow() // exceeds both max and precision
    })

    test('should work for database mapping', () => {
      const dbSchema = `salary: { decimal, precision: 10, scale: 2, min: 0m }`

      expect(() => parseDocument(`${dbSchema}\n---\n75000.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${dbSchema}\n---\n99999999.99m`, null)).not.toThrow()

      expect(() => parseDocument(`${dbSchema}\n---\n75000.0m`, null)).toThrow(/scale/)
      expect(() => parseDocument(`${dbSchema}\n---\n100000000.00m`, null)).toThrow(/precision/)
    })
  })

  describe('Edge Cases and Combinations', () => {
    test('should handle zero with different scales', () => {
      expect(() => parseDocument(`num: { decimal, scale: 2 }\n---\n0.00m`, null)).not.toThrow()
      expect(() => parseDocument(`num: { decimal, scale: 0 }\n---\n0m`, null)).not.toThrow()
      expect(() => parseDocument(`num: { decimal, scale: 5 }\n---\n0.00000m`, null)).not.toThrow()
    })

    test('should handle negative numbers', () => {
      const schema = `num: { decimal, scale: 2, min: -100.00m, max: 100.00m }`

      expect(() => parseDocument(`${schema}\n---\n-50.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n-100.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n-100.01m`, null)).toThrow(expect.objectContaining({ errorCode: expect.stringMatching(/^mismatched-(min|max)$|^out-of-range-/) }))
      expect(() => parseDocument(`${schema}\n---\n-50.0m`, null)).toThrow(/scale/)
    })

    test('should handle very small decimals', () => {
      const schema = `num: { decimal, scale: 5, min: 0.00000m, max: 1.00000m }`

      expect(() => parseDocument(`${schema}\n---\n0.00001m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n0.99999m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n0.000001m`, null)).toThrow(/scale/)
    })

    test('should handle large precision values', () => {
      const schema = `num: { decimal, precision: 20, scale: 5 }`

      expect(() => parseDocument(`${schema}\n---\n123456789012345.12345m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n1234567890123456.12345m`, null)).toThrow(/precision/)
    })

    test('should allow omitting min/max in any mode', () => {
      expect(() => parseDocument(`num1: { decimal, scale: 2 }\n---\n999999.99m`, null)).not.toThrow()
      expect(() => parseDocument(`num2: { decimal, precision: 5 }\n---\n99999m`, null)).not.toThrow()
      expect(() => parseDocument(`num3: { decimal, precision: 10, scale: 2 }\n---\n99999999.99m`, null)).not.toThrow()
    })

    test('should handle boundary values correctly', () => {
      const schema = `num: { decimal, precision: 5, scale: 2, min: 0.00m, max: 999.99m }`

      // Exactly at boundaries
      expect(() => parseDocument(`${schema}\n---\n0.00m`, null)).not.toThrow()
      expect(() => parseDocument(`${schema}\n---\n999.99m`, null)).not.toThrow()

      // Just outside boundaries
      expect(() => parseDocument(`${schema}\n---\n-0.01m`, null)).toThrow(expect.objectContaining({ errorCode: expect.stringMatching(/^mismatched-(min|max)$|^out-of-range-/) }))
      expect(() => parseDocument(`${schema}\n---\n1000.00m`, null)).toThrow(/precision/) // exceeds precision
    })
  })

  describe('Multiple decimal fields', () => {
    test('should validate each field independently', () => {
      const schema = `price: { decimal, scale: 2 }, quantity: { decimal, precision: 5 }, total: decimal`
      const validData = `${schema}\n---\n19.99m, 100m, 1999m`

      expect(() => parseDocument(validData, null)).not.toThrow()
    })

    test('should report errors for the correct field', () => {
      const schema = `price: { decimal, scale: 2 }, quantity: { decimal, precision: 5 }`

      expect(() => parseDocument(`${schema}\n---\n19.9m, 100m`, null)).toThrow() // price wrong scale
      expect(() => parseDocument(`${schema}\n---\n19.99m, 123456m`, null)).toThrow() // quantity exceeds precision
    })
  })
})
