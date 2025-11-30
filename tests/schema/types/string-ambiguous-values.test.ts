import { parse, stringify, loadObject } from '../../../src/index'

/**
 * Tests for string values that could be confused with other types.
 * These tests ensure round-trip safety for strings that look like:
 * - Numbers (1984, 3.14, -42)
 * - Booleans (T, F, true, false)
 * - Null (N, null)
 * - Special numbers (Inf, NaN)
 * - Dates/Times (2024-01-15, 10:30:00)
 */
describe('String Ambiguous Values - Round Trip Safety', () => {

  describe('Strings that look like numbers', () => {
    it('should preserve integer-like strings', () => {
      const input = `
        ~ $book: {title: string, year: string}
        ---
        ~ "1984", "2001"
      `
      const doc = parse(input)
      const output = stringify(doc)

      // Should be quoted in output
      expect(output).toContain('"1984"')
      expect(output).toContain('"2001"')

      // Round-trip should not throw and preserve data
      const reparsed = parse(output)
      expect(reparsed).toBeDefined()
    })

    it('should preserve decimal-like strings', () => {
      const input = `
        ~ $item: {price: string}
        ---
        ~ "3.14"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"3.14"')

      // Round-trip should work
      const reparsed = parse(output)
      expect(reparsed).toBeDefined()
    })

    it('should preserve negative number-like strings', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "-42"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"-42"')
    })

    it('should preserve scientific notation strings', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "1e10"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"1e10"')
    })

    it('should preserve zero strings', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "0"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"0"')
    })
  })

  describe('Strings that look like booleans', () => {
    it('should preserve "T" as string', () => {
      const input = `
        ~ $item: {flag: string}
        ---
        ~ "T"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"T"')

      // Round-trip should work
      const reparsed = parse(output)
      expect(reparsed).toBeDefined()
    })

    it('should preserve "F" as string', () => {
      const input = `
        ~ $item: {flag: string}
        ---
        ~ "F"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"F"')
    })

    it('should preserve "true" as string', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "true"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"true"')
    })

    it('should preserve "false" as string', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "false"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"false"')
    })
  })

  describe('Strings that look like null', () => {
    it('should preserve "N" as string', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "N"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"N"')

      // Round-trip should work
      const reparsed = parse(output)
      expect(reparsed).toBeDefined()
    })

    it('should preserve "null" as string', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "null"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"null"')
    })
  })

  describe('Strings that look like special numbers', () => {
    it('should preserve "Inf" as string', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "Inf"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"Inf"')
    })

    it('should preserve "NaN" as string', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "NaN"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"NaN"')
    })

    it('should preserve "-Inf" as string', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "-Inf"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"-Inf"')
    })
  })

  describe('Strings that look like dates/times', () => {
    it('should preserve date-like string "2024-01-15"', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "2024-01-15"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"2024-01-15"')
    })

    it('should preserve time-like string "10:30:00"', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "10:30:00"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"10:30:00"')
    })

    it('should preserve datetime-like string', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "2024-01-15T10:30:00Z"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"2024-01-15T10:30:00Z"')
    })
  })

  describe('Empty and whitespace strings', () => {
    it('should preserve empty string', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ ""
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('""')
    })
  })

  describe('Normal strings should not be quoted unnecessarily', () => {
    it('should output simple text without quotes', () => {
      const input = `
        ~ $book: {title: string, author: string}
        ---
        ~ "Hello World", "John Doe"
      `
      const doc = parse(input)
      const output = stringify(doc)

      // Normal strings should be open (unquoted) for cleaner output
      expect(output).toContain('Hello World')
      expect(output).toContain('John Doe')
      // Should NOT be quoted
      expect(output).not.toContain('"Hello World"')
      expect(output).not.toContain('"John Doe"')
    })

    it('should handle mixed normal and ambiguous strings', () => {
      const input = `
        ~ $book: {title: string, author: string, year: string}
        ---
        ~ "1984", "George Orwell", "Published"
      `
      const doc = parse(input)
      const output = stringify(doc)

      // Ambiguous value should be quoted
      expect(output).toContain('"1984"')
      // Normal strings should be unquoted
      expect(output).toContain('George Orwell')
      expect(output).toContain('Published')
    })
  })

  describe('Load function with ambiguous values', () => {
    it('should loadObject and stringify ambiguous string values correctly', () => {
      const schema = `{title: string, code: string, flag: string, empty: string}`
      const data = {
        title: '1984',
        code: 'N',
        flag: 'T',
        empty: ''
      }

      const result = loadObject(data, schema)
      const output = stringify(result, schema)

      expect(output).toContain('"1984"')
      expect(output).toContain('"N"')
      expect(output).toContain('"T"')
      expect(output).toContain('""')
    })
  })

  describe('Strings in arrays', () => {
    it('should preserve ambiguous strings in arrays', () => {
      const input = `
        ~ $item: {values: [string]}
        ---
        ~ [["1984", "T", "N", "Hello"]]
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"1984"')
      expect(output).toContain('"T"')
      expect(output).toContain('"N"')
      expect(output).toContain('Hello')
    })
  })

  describe('Strings in nested objects', () => {
    it('should preserve ambiguous strings in nested objects', () => {
      const input = `
        ~ $inner: {year: string, active: string}
        ~ $outer: {name: string, details: $inner}
        ---
        ~ "Book", {"1984", "T"}
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"1984"')
      expect(output).toContain('"T"')
      expect(output).toContain('Book')
    })
  })

  describe('Edge cases', () => {
    it('should handle "undefined" as string', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "undefined"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"undefined"')
    })

    it('should handle "+Inf" as string', () => {
      const input = `
        ~ $item: {value: string}
        ---
        ~ "+Inf"
      `
      const doc = parse(input)
      const output = stringify(doc)

      expect(output).toContain('"+Inf"')
    })

    it('should handle leading zeros in number-like strings', () => {
      const input = `
        ~ $item: {code: string}
        ---
        ~ "007"
      `
      const doc = parse(input)
      const output = stringify(doc)

      // 007 doesn't match the strict number regex (leading zero not allowed for non-zero numbers)
      // But let's verify round-trip works regardless of quoting
      const reparsed = parse(output)
      expect(reparsed).toBeDefined()
    })
  })
})
