import { loadObject } from '../../../src/schema/load-processor'
import { compileSchema } from '../../../src/schema'
import InternetObject from '../../../src/core/internet-object'
import { stringify, stringifyObject } from '../../../src/serializer/stringify'
import ValidationError from '../../../src/errors/io-validation-error'
import Definitions from '../../../src/core/definitions'

// Helper to create defs with schema
function createDefsWithSchema(schema: any): Definitions {
  const defs = new Definitions();
  defs.push('$schema', schema, true);
  return defs;
}

describe('load() and stringify() - complex types (array, object, any)', () => {
  // ============================================================
  // Array type via loadObject
  // ============================================================
  describe('Array type via loadObject', () => {
    test('loads object with simple array field', () => {
      const schema = compileSchema('TestSchema', '{ items: [number] }')
      const result = loadObject({ items: [1, 2, 3] }, schema)
      expect(result.get('items')).toEqual([1, 2, 3])
    })

    test('rejects non-array for array field', () => {
      const schema = compileSchema('TestSchema', '{ items: [number] }')
      expect(() => loadObject({ items: 'not an array' }, schema)).toThrow(ValidationError)
    })

    test('validates array item types', () => {
      const schema = compileSchema('TestSchema', '{ items: [number] }')
      expect(() => loadObject({ items: [1, 'two', 3] }, schema)).toThrow(ValidationError)
    })

    test('loads object with string array', () => {
      const schema = compileSchema('TestSchema', '{ names: [string] }')
      const result = loadObject({ names: ['Alice', 'Bob'] }, schema)
      expect(result.get('names')).toEqual(['Alice', 'Bob'])
    })

    test('loads object with boolean array', () => {
      const schema = compileSchema('TestSchema', '{ flags: [bool] }')
      const result = loadObject({ flags: [true, false, true] }, schema)
      expect(result.get('flags')).toEqual([true, false, true])
    })

    test('loads empty array', () => {
      const schema = compileSchema('TestSchema', '{ items: [number] }')
      const result = loadObject({ items: [] }, schema)
      expect(result.get('items')).toEqual([])
    })

    test('loads nested arrays', () => {
      const schema = compileSchema('TestSchema', '{ matrix: [[number]] }')
      const result = loadObject({ matrix: [[1, 2], [3, 4]] }, schema)
      expect(result.get('matrix')).toEqual([[1, 2], [3, 4]])
    })

    test('loads array of objects', () => {
      const schema = compileSchema('TestSchema', '{ people: [{name: string, age: number}] }')
      const result = loadObject({
        people: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 }
        ]
      }, schema)
      const people = result.get('people')
      expect(people).toHaveLength(2)
      expect(people[0]).toEqual({ name: 'Alice', age: 30 })
      expect(people[1]).toEqual({ name: 'Bob', age: 25 })
    })

    test('allows null array when nullable', () => {
      const schema = compileSchema('TestSchema', '{ items*: [number] }')
      const result = loadObject({ items: null }, schema)
      expect(result.get('items')).toBeNull()
    })
  })

  // ============================================================
  // Object type via loadObject (nested objects)
  // ============================================================
  describe('Object type via loadObject (nested objects)', () => {
    test('loads nested object', () => {
      const schema = compileSchema('TestSchema', '{ address: {city: string, zip: number} }')
      const result = loadObject({
        address: { city: 'NYC', zip: 10001 }
      }, schema)
      expect(result.get('address')).toEqual({ city: 'NYC', zip: 10001 })
    })

    test('validates nested object field types', () => {
      const schema = compileSchema('TestSchema', '{ address: {city: string, zip: number} }')
      expect(() => loadObject({
        address: { city: 123, zip: 10001 }
      }, schema)).toThrow(ValidationError)
    })

    test('enforces required nested fields', () => {
      const schema = compileSchema('TestSchema', '{ address: {city: string, zip: number} }')
      expect(() => loadObject({
        address: { city: 'NYC' }
      }, schema)).toThrow(ValidationError)
    })

    test('allows optional nested fields', () => {
      const schema = compileSchema('TestSchema', '{ address: {city: string, zip?: number} }')
      const result = loadObject({
        address: { city: 'NYC' }
      }, schema)
      expect(result.get('address')).toEqual({ city: 'NYC' })
    })

    test('loads deeply nested objects', () => {
      const schema = compileSchema('TestSchema', '{ person: {name: string, address: {city: string, country: {name: string}}} }')
      const result = loadObject({
        person: {
          name: 'Alice',
          address: {
            city: 'NYC',
            country: { name: 'USA' }
          }
        }
      }, schema)
      const person = result.get('person')
      expect(person.name).toBe('Alice')
      expect(person.address.city).toBe('NYC')
      expect(person.address.country.name).toBe('USA')
    })

    test('rejects non-object for nested object field', () => {
      const schema = compileSchema('TestSchema', '{ address: {city: string} }')
      expect(() => loadObject({ address: 'not an object' }, schema)).toThrow(ValidationError)
    })

    test('rejects arrays for object fields', () => {
      const schema = compileSchema('TestSchema', '{ address: {city: string} }')
      expect(() => loadObject({ address: ['NYC'] }, schema)).toThrow(ValidationError)
    })
  })

  // ============================================================
  // Any type via loadObject
  // ============================================================
  describe('Any type via loadObject', () => {
    test('loads any with string value', () => {
      const schema = compileSchema('TestSchema', '{ value: any }')
      const result = loadObject({ value: 'hello' }, schema)
      expect(result.get('value')).toBe('hello')
    })

    test('loads any with number value', () => {
      const schema = compileSchema('TestSchema', '{ value: any }')
      const result = loadObject({ value: 42 }, schema)
      expect(result.get('value')).toBe(42)
    })

    test('loads any with boolean value', () => {
      const schema = compileSchema('TestSchema', '{ value: any }')
      const result = loadObject({ value: true }, schema)
      expect(result.get('value')).toBe(true)
    })

    test('loads any with array value', () => {
      const schema = compileSchema('TestSchema', '{ value: any }')
      const result = loadObject({ value: [1, 2, 3] }, schema)
      expect(result.get('value')).toEqual([1, 2, 3])
    })

    test('loads any with object value', () => {
      const schema = compileSchema('TestSchema', '{ value: any }')
      const result = loadObject({ value: { a: 1, b: 2 } }, schema)
      expect(result.get('value')).toEqual({ a: 1, b: 2 })
    })

    test('loads any with null value when nullable', () => {
      const schema = compileSchema('TestSchema', '{ value*: any }')
      const result = loadObject({ value: null }, schema)
      expect(result.get('value')).toBeNull()
    })

    test('loads any with Date value', () => {
      const schema = compileSchema('TestSchema', '{ value: any }')
      const date = new Date('2024-06-15T10:30:00Z')
      const result = loadObject({ value: date }, schema)
      expect(result.get('value')).toEqual(date)
    })
  })

  // ============================================================
  // Any type Date inference tests
  // ============================================================
  describe('Any type Date inference for stringify', () => {
    test('infers date type when time is 00:00:00.000Z', () => {
      const schema = compileSchema('TestSchema', '{ value: any }')
      const dateOnly = new Date('2024-06-15T00:00:00.000Z')
      const loaded = loadObject({ value: dateOnly }, schema)
      const result = stringifyObject(loaded, schema)
      // Should use d"..." format, not dt"..."
      expect(result).toContain('d"2024-06-15"')
      expect(result).not.toContain('dt"')
    })

    test('infers time type when date is 1900-01-01', () => {
      const schema = compileSchema('TestSchema', '{ value: any }')
      const timeOnly = new Date('1900-01-01T14:30:45.000Z')
      const loaded = loadObject({ value: timeOnly }, schema)
      const result = stringifyObject(loaded, schema)
      // Should use t"..." format
      expect(result).toContain('t"14:30:45"')
      expect(result).not.toContain('dt"')
    })

    test('infers datetime type when both date and time components exist', () => {
      const schema = compileSchema('TestSchema', '{ value: any }')
      const fullDatetime = new Date('2024-06-15T14:30:45.000Z')
      const loaded = loadObject({ value: fullDatetime }, schema)
      const result = stringifyObject(loaded, schema)
      // Should use dt"..." format
      expect(result).toContain('dt"')
      expect(result).toContain('2024-06-15')
      expect(result).toContain('14:30:45')
    })

    test('infers datetime when time has milliseconds', () => {
      const schema = compileSchema('TestSchema', '{ value: any }')
      const withMs = new Date('2024-06-15T00:00:00.123Z')
      const loaded = loadObject({ value: withMs }, schema)
      const result = stringifyObject(loaded, schema)
      // Should use dt"..." because ms !== 0
      expect(result).toContain('dt"')
    })
  })

  // ============================================================
  // Stringify tests via stringify()
  // ============================================================
  describe('Stringify via stringify()', () => {
    test('stringifies object with array field', () => {
      const schema = compileSchema('TestSchema', '{ items: [number] }')
      const loaded = loadObject({ items: [1, 2, 3] }, schema)
      const result = stringifyObject(loaded, schema)
      expect(result).toContain('[1, 2, 3]')
    })

    test('stringifies object with string array', () => {
      const schema = compileSchema('TestSchema', '{ names: [string] }')
      const loaded = loadObject({ names: ['Alice', 'Bob'] }, schema)
      const result = stringifyObject(loaded, schema)
      expect(result).toContain('Alice')
      expect(result).toContain('Bob')
    })

    test('stringifies object with boolean array', () => {
      const schema = compileSchema('TestSchema', '{ flags: [bool] }')
      const loaded = loadObject({ flags: [true, false, true] }, schema)
      const result = stringifyObject(loaded, schema)
      expect(result).toContain('T')
      expect(result).toContain('F')
    })

    test('stringifies nested object', () => {
      const schema = compileSchema('TestSchema', '{ address: {city: string, zip: number} }')
      const loaded = loadObject({ address: { city: 'NYC', zip: 10001 } }, schema)
      const result = stringifyObject(loaded, schema)
      expect(result).toContain('NYC')
      expect(result).toContain('10001')
    })

    test('stringifies object with any field', () => {
      const schema = compileSchema('TestSchema', '{ value: any }')
      const loaded = loadObject({ value: 42 }, schema)
      const result = stringifyObject(loaded, schema)
      expect(result).toContain('42')
    })

    test('stringifies complex nested structure', () => {
      const schema = compileSchema('TestSchema', '{ person: {name: string, active: bool} }')
      const loaded = loadObject({
        person: { name: 'Alice', active: true }
      }, schema)
      const result = stringifyObject(loaded, schema)
      expect(result).toContain('Alice')
      expect(result).toContain('T')
    })

    test('stringifies array of objects', () => {
      const schema = compileSchema('TestSchema', '{ people: [{name: string, age: number}] }')
      const loaded = loadObject({
        people: [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 }
        ]
      }, schema)
      const result = stringifyObject(loaded, schema)
      expect(result).toContain('Alice')
      expect(result).toContain('Bob')
      expect(result).toContain('30')
      expect(result).toContain('25')
    })
  })

  // ============================================================
  // Round-trip tests
  // ============================================================
  describe('Round-trip: loadObject → stringify', () => {
    test('round-trip with array field', () => {
      const schema = compileSchema('TestSchema', '{ items: [number] }')
      const original = { items: [1, 2, 3] }
      const loaded = loadObject(original, schema)
      const stringified = stringifyObject(loaded, schema)

      expect(stringified).toBe('[1, 2, 3]')
    })

    test('round-trip with nested object', () => {
      const schema = compileSchema('TestSchema', '{ name: string, address: {city: string} }')
      const original = { name: 'Alice', address: { city: 'NYC' } }
      const loaded = loadObject(original, schema)
      const stringified = stringifyObject(loaded, schema)

      expect(stringified).toContain('Alice')
      expect(stringified).toContain('NYC')
    })

    test('round-trip with any type containing object', () => {
      const schema = compileSchema('TestSchema', '{ data: any }')
      const original = { data: { nested: 'value' } }
      const loaded = loadObject(original, schema)
      const stringified = stringifyObject(loaded, schema)

      expect(stringified).toContain('nested')
      expect(stringified).toContain('value')
    })

    test('round-trip with mixed types', () => {
      const schema = compileSchema('TestSchema', '{ name: string, scores: [number], active: bool }')
      const original = { name: 'Test', scores: [90, 85, 95], active: true }
      const loaded = loadObject(original, schema)
      const stringified = stringifyObject(loaded, schema)

      expect(stringified).toContain('Test')
      expect(stringified).toContain('90')
      expect(stringified).toContain('85')
      expect(stringified).toContain('95')
      expect(stringified).toContain('T')
    })
  })

  // ============================================================
  // Edge cases
  // ============================================================
  describe('Edge cases', () => {
    test('empty nested object', () => {
      const schema = compileSchema('TestSchema', '{ data?: {value?: string} }')
      const result = loadObject({ data: {} }, schema)
      expect(result.get('data')).toEqual({})
    })

    test('nested array in object in array', () => {
      const schema = compileSchema('TestSchema', '{ items: [{values: [number]}] }')
      const result = loadObject({
        items: [
          { values: [1, 2] },
          { values: [3, 4] }
        ]
      }, schema)
      const items = result.get('items')
      expect(items[0].values).toEqual([1, 2])
      expect(items[1].values).toEqual([3, 4])
    })

    test('any type with complex nested structure', () => {
      const schema = compileSchema('TestSchema', '{ config: any }')
      const complexData = {
        config: {
          settings: {
            enabled: true,
            values: [1, 2, 3],
            metadata: {
              name: 'test'
            }
          }
        }
      }
      const result = loadObject(complexData, schema)
      expect(result.get('config')).toEqual(complexData.config)
    })
  })
})
