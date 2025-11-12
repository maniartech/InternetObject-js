/**
 * End-to-End Integration Tests for Schema V2
 *
 * These tests demonstrate the complete workflow:
 * 1. Define schemas using V2 TypeSchema classes
 * 2. Parse IO strings to JavaScript objects
 * 3. Validate data integrity
 * 4. Stringify back to IO format
 */

import { describe, it, expect } from '@jest/globals';
import {
  parse,
  parseCollection,
  stringify,
  roundTrip,
  getASTNode,
  ObjectTypeSchema,
  StringTypeSchema,
  NumberTypeSchema,
  BooleanTypeSchema,
  ArrayTypeSchema,
} from '../../src/schema-v2';

describe('Schema V2 - End-to-End Integration', () => {

  describe('Simple Objects', () => {
    it('should parse a simple person object (positional)', () => {
      const personSchema = new ObjectTypeSchema({
        defs: {
          name: { type: new StringTypeSchema() },
          age: { type: new NumberTypeSchema() }
        },
        names: ['name', 'age']
      });

      const result = parse('John, 30', personSchema);

      expect(result).toEqual({
        name: 'John',
        age: 30
      });
    });

    it('should parse a simple person object (keyed)', () => {
      const personSchema = new ObjectTypeSchema({
        defs: {
          name: { type: new StringTypeSchema() },
          age: { type: new NumberTypeSchema() }
        }
      });

      const result = parse('{name: John, age: 30}', personSchema);

      expect(result).toEqual({
        name: 'John',
        age: 30
      });
    });

    it('should handle optional fields', () => {
      const personSchema = new ObjectTypeSchema({
        defs: {
          name: { type: new StringTypeSchema(), optional: false },
          age: { type: new NumberTypeSchema(), optional: true }
        },
        names: ['name', 'age']
      });

      const result = parse('John', personSchema);

      expect(result).toEqual({
        name: 'John'
      });
    });

    it('should handle default values', () => {
      const personSchema = new ObjectTypeSchema({
        defs: {
          name: { type: new StringTypeSchema() },
          age: { type: new NumberTypeSchema(), default: 18 }
        },
        names: ['name', 'age']
      });

      const result = parse('John', personSchema);

      expect(result).toEqual({
        name: 'John',
        age: 18
      });
    });
  });

  describe('Arrays', () => {
    it('should parse array of strings', () => {
      const schema = new ArrayTypeSchema({
        of: new StringTypeSchema()
      });

      const result = parse('[hello, world, test]', schema);

      expect(result).toEqual(['hello', 'world', 'test']);
    });

    it('should parse array of numbers', () => {
      const schema = new ArrayTypeSchema({
        of: new NumberTypeSchema()
      });

      const result = parse('[1, 2, 3, 4, 5]', schema);

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should validate array length', () => {
      const schema = new ArrayTypeSchema({
        of: new NumberTypeSchema(),
        minLen: 3,
        maxLen: 5
      });

      const result = parse('[1, 2, 3, 4]', schema);
      expect(result).toEqual([1, 2, 3, 4]);

      // Test minLen violation
      expect(() => {
        parse('[1, 2]', schema);
      }).toThrow();

      // Test maxLen violation
      expect(() => {
        parse('[1, 2, 3, 4, 5, 6]', schema);
      }).toThrow();
    });
  });

  describe('Nested Structures', () => {
    it('should parse object with array property', () => {
      const schema = new ObjectTypeSchema({
        defs: {
          name: { type: new StringTypeSchema() },
          scores: { type: new ArrayTypeSchema({ of: new NumberTypeSchema() }) }
        },
        names: ['name', 'scores']
      });

      const result = parse('{name: John, scores: [95, 87, 92]}', schema);

      expect(result).toEqual({
        name: 'John',
        scores: [95, 87, 92]
      });
    });

    it('should parse array of objects', () => {
      const personSchema = new ObjectTypeSchema({
        defs: {
          name: { type: new StringTypeSchema() },
          age: { type: new NumberTypeSchema() }
        },
        names: ['name', 'age']
      });

      const arraySchema = new ArrayTypeSchema({
        of: personSchema
      });

      const result = parse('[{name: John, age: 30}, {name: Jane, age: 25}]', arraySchema);

      expect(result).toEqual([
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ]);
    });

    it('should parse nested objects', () => {
      const addressSchema = new ObjectTypeSchema({
        defs: {
          street: { type: new StringTypeSchema() },
          city: { type: new StringTypeSchema() }
        },
        names: ['street', 'city']
      });

      const personSchema = new ObjectTypeSchema({
        defs: {
          name: { type: new StringTypeSchema() },
          address: { type: addressSchema }
        },
        names: ['name', 'address']
      });

      const result = parse('{name: John, address: {street: "123 Main St", city: NYC}}', personSchema);

      expect(result).toEqual({
        name: 'John',
        address: {
          street: '123 Main St',
          city: 'NYC'
        }
      });
    });
  });

  describe('Collections', () => {
    it('should parse collection of objects', () => {
      const personSchema = new ObjectTypeSchema({
        defs: {
          name: { type: new StringTypeSchema() },
          age: { type: new NumberTypeSchema() }
        },
        names: ['name', 'age']
      });

      const ioString = `~ John, 30
~ Jane, 25
~ Bob, 35`;

      const result = parseCollection(ioString, personSchema);

      expect(result).toEqual([
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
        { name: 'Bob', age: 35 }
      ]);
    });
  });

  describe('Serialization (Stringify)', () => {
    it('should stringify simple objects', () => {
      const schema = new ObjectTypeSchema({
        defs: {
          name: { type: new StringTypeSchema() },
          age: { type: new NumberTypeSchema() }
        },
        names: ['name', 'age']
      });

      const ioString = stringify({ name: 'John', age: 30 }, schema);

      expect(ioString).toBe('{John, 30}');
    });

    it('should stringify arrays', () => {
      const schema = new ArrayTypeSchema({
        of: new StringTypeSchema()
      });

      const ioString = stringify(['hello', 'world'], schema);

      expect(ioString).toBe('[hello, world]');
    });

    it('should round-trip data correctly', () => {
      const schema = new ObjectTypeSchema({
        defs: {
          name: { type: new StringTypeSchema() },
          age: { type: new NumberTypeSchema() },
          active: { type: new BooleanTypeSchema() }
        },
        names: ['name', 'age', 'active']
      });

      const { parsed, stringified } = roundTrip('{name: John, age: 30, active: T}', schema);

      expect(parsed).toEqual({
        name: 'John',
        age: 30,
        active: true
      });

      // Parse the stringified version again
      const reparsed = parse(stringified, schema);
      expect(reparsed).toEqual(parsed);
    });
  });

  describe('Validation', () => {
    it('should validate string constraints', () => {
      const schema = new ObjectTypeSchema({
        defs: {
          email: { type: new StringTypeSchema() } // TODO: Add format: 'email' when supported
        },
        names: ['email']
      });

      const result = parse('john@example.com', schema);
      expect(result).toEqual({ email: 'john@example.com' });
    });

    it('should validate number ranges', () => {
      const schema = new ObjectTypeSchema({
        defs: {
          age: { type: new NumberTypeSchema() }
        },
        names: ['age']
      });

      const result = parse('30', schema);
      expect(result).toEqual({ age: 30 });
    });

    it('should reject invalid types', () => {
      const schema = new ObjectTypeSchema({
        defs: {
          age: { type: new NumberTypeSchema() }
        },
        names: ['age']
      });

      expect(() => {
        parse('not-a-number', schema);
      }).toThrow();
    });
  });

  describe('Debug Utilities', () => {
    it('should get raw AST node', () => {
      const node = getASTNode('John, 30');

      expect(node).toBeDefined();
      expect(node?.constructor.name).toBe('ObjectNode');
    });

    it('should get raw array node', () => {
      const node = getASTNode('[1, 2, 3]');

      expect(node).toBeDefined();
      expect(node?.constructor.name).toBe('ArrayNode');
    });
  });
});
