import IO, { stringify } from '../src'

/**
 * Tests for stringify "data only" mode.
 * When includeTypes is false (default), only data is output without schema definitions.
 * For simple single-section documents without a section name, the --- separator is omitted.
 */
describe('Stringify Data Only', () => {
  describe('Default behavior (data only) - with $schema definition', () => {
    it('should output only data values when no options provided', () => {
      const doc = IO.parse(`
~ $schema: {name: string, age: int}
---
John, 30
`)
      const result = stringify(doc)
      // Data only - no separator for simple single section
      expect(result).toBe('John, 30')
      expect(result).not.toContain('$schema')
      expect(result).not.toContain('~')
      expect(result).not.toContain('---')
    })

    it('should not include header definitions in output', () => {
      const doc = IO.parse(`
~ $address: {city: string, zip: string}
~ $schema: {name: string, address: $address}
---
John, {NYC, "10001"}
`)
      const result = stringify(doc)
      // "10001" is quoted because it's a string that looks like a number (round-trip safety)
      expect(result).toBe('John, {NYC, "10001"}')
      expect(result).not.toContain('$address')
      expect(result).not.toContain('~')
      expect(result).not.toContain('---')
    })

    it('should output nested objects without header', () => {
      const doc = IO.parse(`
~ $schema: {name: string, nested: {x: int, y: int}}
---
Alice, {10, 20}
`)
      const result = stringify(doc)
      expect(result).toBe('Alice, {10, 20}')
    })

    it('should handle documents with multiple definitions', () => {
      const doc = IO.parse(`
~ $point: {x: int, y: int}
~ $size: {w: int, h: int}
~ $schema: {name: string, location: $point, dimensions: $size}
---
Widget, {100, 200}, {50, 75}
`)
      const result = stringify(doc)
      expect(result).toBe('Widget, {100, 200}, {50, 75}')
      expect(result).not.toContain('$point')
      expect(result).not.toContain('$size')
    })

    it('should handle documents with metadata', () => {
      const doc = IO.parse(`
~ @version: 1.0
~ $schema: {name: string, value: int}
---
Test, 42
`)
      const result = stringify(doc)
      expect(result).toBe('Test, 42')
      expect(result).not.toContain('@version')
      expect(result).not.toContain('$schema')
    })
  })

  describe('Explicit data-only (includeTypes: false)', () => {
    it('should output only data with includeTypes: false', () => {
      const doc = IO.parse(`
~ $schema: {name: string, age: int}
---
John, 30
`)
      const result = stringify(doc, undefined, undefined, { includeTypes: false })
      expect(result).toBe('John, 30')
    })

    it('should not include header with explicit false', () => {
      const doc = IO.parse(`
~ $def: {a: int}
~ $schema: {x: $def}
---
{{5}}
`)
      const result = stringify(doc, undefined, undefined, { includeTypes: false })
      expect(result).toBe('{5}')
      expect(result).not.toContain('$def')
    })
  })

  describe('With header (includeTypes: true)', () => {
    it('should include bare schema line when includeTypes: true (schema-only mode)', () => {
      const doc = IO.parse(`
~ $schema: {name: string, age: int}
---
John, 30
`)
      const result = stringify(doc, undefined, undefined, { includeTypes: true })
      // In schema-only mode, outputs bare schema (backward compatible)
      expect(result).toContain('name: string')
      expect(result).toContain('age: int')
      expect(result).toContain('---')
      expect(result).toContain('John, 30')
    })

    it('should include definitions when includeTypes: true and has other definitions', () => {
      const doc = IO.parse(`
~ @version: 1.0
~ $schema: {name: string}
---
Alice
`)
      const result = stringify(doc, undefined, undefined, { includeTypes: true })
      expect(result).toContain('~ @version:')
      expect(result).toContain('$schema')
    })
  })

  describe('Named section with named schema', () => {
    it('should include section name and schema reference in data-only mode', () => {
      const doc = IO.parse(`
~ $person: {name: string, age: int}
--- p: $person
John, 30
`)
      const result = stringify(doc)
      // Section name and schema ref are retained (needed for re-parsing)
      expect(result).toBe('--- p: $person\nJohn, 30')
      expect(result).not.toContain('~ $person')
    })

    it('should include definitions when includeTypes: true', () => {
      const doc = IO.parse(`
~ $person: {name: string, age: int}
--- p: $person
John, 30
`)
      const result = stringify(doc, undefined, undefined, { includeTypes: true })
      expect(result).toContain('~ $person: {name: string, age: int}')
      expect(result).toContain('--- p: $person')
      expect(result).toContain('John, 30')
    })
  })

  describe('Collection data', () => {
    it('should output collection rows in data-only mode', () => {
      const doc = IO.parse(`
~ $schema: {name: string, age: int}
---
~ Alice, 28
~ Bob, 35
`)
      const result = stringify(doc)
      // Collection rows without separator for single section
      expect(result).toContain('Alice, 28')
      expect(result).toContain('Bob, 35')
      expect(result).not.toContain('$schema')
    })
  })

  describe('Document with only data (no schema)', () => {
    it('should output data directly', () => {
      const doc = IO.parse('---\nHello, 42, T')
      const result = stringify(doc)
      // Without schema, the output may vary based on how data is interpreted
      expect(result).toContain('Hello')
      expect(result).toContain('42')
      expect(result).toContain('T')
    })
  })

  describe('Round-trip with data-only output', () => {
    it('should allow re-parsing data-only output with same schema', () => {
      const original = IO.parse(`
~ $schema: {name: string, age: int}
---
John, 30
`)
      const dataOnly = stringify(original)

      // Data-only output has no ---, need to add separator for re-parsing
      const fullDoc = `~ $schema: {name: string, age: int}\n---\n${dataOnly}`
      const reparsed = IO.parse(fullDoc)
      expect(reparsed.toJSON()).toEqual(original.toJSON())
    })

    it('should preserve data integrity through round-trip', () => {
      const original = IO.parse(`
~ $schema: {x: int, y: int, label: string}
---
100, 200, "Point A"
`)
      const dataOnly = stringify(original)

      const fullDoc = `~ $schema: {x: int, y: int, label: string}\n---\n${dataOnly}`
      const reparsed = IO.parse(fullDoc)
      expect(reparsed.toJSON()).toEqual(original.toJSON())
    })

    it('should handle complex nested data through round-trip', () => {
      const original = IO.parse(`
~ $schema: {name: string, scores: [int], metadata: {created: string, active: bool}}
---
Alice, [95, 87, 92], {2024-01-15, T}
`)
      const dataOnly = stringify(original)

      const fullDoc = `~ $schema: {name: string, scores: [int], metadata: {created: string, active: bool}}\n---\n${dataOnly}`
      const reparsed = IO.parse(fullDoc)
      expect(reparsed.toJSON()).toEqual(original.toJSON())
    })
  })

  describe('Ambiguous string values', () => {
    it('should preserve string quoting for number-like values', () => {
      const doc = IO.parse(`
~ $schema: {title: string}
---
"1984"
`)
      const result = stringify(doc)
      // Should be quoted to prevent re-parsing as number
      expect(result).toContain('"1984"')
    })

    it('should preserve string quoting for boolean-like values', () => {
      const doc = IO.parse(`
~ $schema: {flag: string}
---
"T"
`)
      const result = stringify(doc)
      expect(result).toContain('"T"')
    })

    it('should preserve string quoting for null-like values', () => {
      const doc = IO.parse(`
~ $schema: {value: string}
---
"N"
`)
      const result = stringify(doc)
      expect(result).toContain('"N"')
    })
  })
})
