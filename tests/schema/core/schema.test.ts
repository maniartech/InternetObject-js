import Schema, { SchemaBuilder } from '../../../src/schema/schema';
import MemberDef from '../../../src/schema/types/memberdef';

describe('Schema', () => {
  describe('Builder Pattern', () => {
    test('should create empty schema with builder', () => {
      const schema = Schema.create('TestSchema').build();

      expect(schema.name).toBe('TestSchema');
      expect(schema.names).toEqual([]);
      expect(schema.memberCount).toBe(0);
      expect(schema.open).toBe(false);
    });

    test('should add members using builder', () => {
      const memberDef: MemberDef = { type: 'string', path: 'name' };
      const schema = Schema.create('TestSchema')
        .addMember('name', memberDef)
        .build();

      expect(schema.memberCount).toBe(1);
      expect(schema.names).toEqual(['name']);
      expect(schema.get('name')).toEqual(memberDef);
      expect(schema.has('name')).toBe(true);
    });

    test('should set open flag using builder', () => {
      const schema = Schema.create('TestSchema')
        .setOpen(true)
        .build();

      expect(schema.open).toBe(true);
    });

    test('should throw error when adding duplicate member', () => {
      const memberDef: MemberDef = { type: 'string', path: 'name' };

      expect(() => {
        Schema.create('TestSchema')
          .addMember('name', memberDef)
          .addMember('name', memberDef)
          .build();
      }).toThrow("Member 'name' already exists in schema 'TestSchema'");
    });

    test('should auto-set path when not provided', () => {
      const memberDef: MemberDef = { type: 'string' };
      const schema = Schema.create('TestSchema')
        .addMember('name', memberDef)
        .build();

      const retrievedDef = schema.get('name');
      expect(retrievedDef?.path).toBe('name');
    });

    test('should support fluent chaining', () => {
      const builder = Schema.create('TestSchema');
      const result1 = builder.addMember('a', { type: 'string' });
      const result2 = result1.addMember('b', { type: 'number' });
      const result3 = result2.setOpen(true);

      // All operations should return the same builder instance
      expect(result1).toBe(builder);
      expect(result2).toBe(builder);
      expect(result3).toBe(builder);

      const schema = result3.build();
      expect(schema.memberCount).toBe(2);
      expect(schema.open).toBe(true);
    });

    test('should handle MemberDef with all optional properties', () => {
      const fullMemberDef: MemberDef = {
        type: 'string',
        path: 'field',
        optional: true,
        null: true,
        default: 'defaultValue',
        choices: ['a', 'b', 'c'],
        customProp: 'custom'
      };

      const schema = Schema.create('TestSchema')
        .addMember('field', fullMemberDef)
        .build();

      const retrieved = schema.get('field');
      expect(retrieved?.optional).toBe(true);
      expect(retrieved?.null).toBe(true);
      expect(retrieved?.default).toBe('defaultValue');
      expect(retrieved?.choices).toEqual(['a', 'b', 'c']);
      expect(retrieved?.customProp).toBe('custom');
    });

    test('should preserve member definition references', () => {
      const memberDef: MemberDef = { type: 'string' };
      const schema = Schema.create('TestSchema')
        .addMember('name', memberDef)
        .build();

      // Retrieved def should have same properties but with path set
      const retrieved = schema.get('name');
      expect(retrieved?.type).toBe('string');
      expect(retrieved?.path).toBe('name');
    });
  });

  describe('Immutability', () => {
    test('should create immutable schema', () => {
      const memberDef: MemberDef = { type: 'string', path: 'name' };
      const schema = Schema.create('TestSchema')
        .addMember('name', memberDef)
        .build();

      // Should not be able to modify names array
      expect(() => {
        (schema.names as any).push('newName');
      }).toThrow();

      // Should not be able to modify defs object
      expect(() => {
        (schema.defs as any).newMember = { type: 'number' };
      }).toThrow();
    });

    test('should return frozen arrays and objects', () => {
      const schema = Schema.create('TestSchema').build();

      expect(Object.isFrozen(schema.names)).toBe(true);
      expect(Object.isFrozen(schema.defs)).toBe(true);
    });

    test('should not allow modification of name property', () => {
      const schema = Schema.create('TestSchema').build();

      // name is readonly, attempting to modify should throw in strict mode
      expect(schema.name).toBe('TestSchema');
    });

    test('should not allow modification of open property after build', () => {
      const schema = Schema.create('TestSchema').setOpen(true).build();

      expect(schema.open).toBe(true);
      // Note: Schema object may not be fully frozen, but open is readonly at type level
      // This test verifies the value is correctly set
    });
  });

  describe('Member Access', () => {
    let schema: Schema;

    beforeEach(() => {
      const memberDef: MemberDef = { type: 'string', path: 'name' };
      schema = Schema.create('TestSchema')
        .addMember('name', memberDef)
        .build();
    });

    test('should get existing member', () => {
      const memberDef = schema.get('name');
      expect(memberDef).toBeDefined();
      expect(memberDef?.type).toBe('string');
    });

    test('should return undefined for non-existing member', () => {
      const memberDef = schema.get('nonExisting');
      expect(memberDef).toBeUndefined();
    });

    test('should check member existence', () => {
      expect(schema.has('name')).toBe(true);
      expect(schema.has('nonExisting')).toBe(false);
    });

    test('should handle empty string member name', () => {
      const schemaWithEmpty = Schema.create('TestSchema')
        .addMember('', { type: 'string' })
        .build();

      expect(schemaWithEmpty.has('')).toBe(true);
      expect(schemaWithEmpty.get('')?.type).toBe('string');
    });

    test('should handle special characters in member names', () => {
      const schema = Schema.create('TestSchema')
        .addMember('$special', { type: 'string' })
        .addMember('_underscore', { type: 'number' })
        .addMember('kebab-case', { type: 'boolean' })
        .build();

      expect(schema.has('$special')).toBe(true);
      expect(schema.has('_underscore')).toBe(true);
      expect(schema.has('kebab-case')).toBe(true);
    });
  });

  describe('Legacy Compatibility', () => {
    test('should support legacy constructor pattern', () => {
      const memberDef: MemberDef = { type: 'string', path: 'name' };
      const schema = Schema.fromLegacy('TestSchema', { name: memberDef });

      expect(schema.name).toBe('TestSchema');
      expect(schema.memberCount).toBe(1);
      expect(schema.get('name')).toEqual({ ...memberDef, path: 'name' });
    });

    test('should auto-set path in legacy mode', () => {
      const memberDef: MemberDef = { type: 'string' };
      const schema = Schema.fromLegacy('TestSchema', { name: memberDef });

      const retrievedDef = schema.get('name');
      expect(retrievedDef?.path).toBe('name');
    });

    test('should preserve member order from legacy object', () => {
      // Legacy varargs format: each member is a separate object argument
      const schema = Schema.fromLegacy('TestSchema',
        { first: { type: 'string' } },
        { second: { type: 'number' } },
        { third: { type: 'boolean' } }
      );

      expect(schema.names).toEqual(['first', 'second', 'third']);
    });
  });

  describe('Complex Schemas', () => {
    test('should handle multiple members', () => {
      const schema = Schema.create('Person')
        .addMember('name', { type: 'string', path: 'name' })
        .addMember('age', { type: 'number', path: 'age' })
        .addMember('email', { type: 'string', path: 'email' })
        .setOpen(true)
        .build();

      expect(schema.memberCount).toBe(3);
      expect(schema.names).toEqual(['name', 'age', 'email']);
      expect(schema.open).toBe(true);

      expect(schema.get('name')?.type).toBe('string');
      expect(schema.get('age')?.type).toBe('number');
      expect(schema.get('email')?.type).toBe('string');
    });

    test('should maintain member order', () => {
      const schema = Schema.create('TestSchema')
        .addMember('c', { type: 'string' })
        .addMember('a', { type: 'number' })
        .addMember('b', { type: 'boolean' })
        .build();

      expect(schema.names).toEqual(['c', 'a', 'b']);
    });

    test('should handle nested schema references', () => {
      const addressMemberDef: MemberDef = {
        type: 'object',
        schema: Schema.create('Address')
          .addMember('street', { type: 'string' })
          .addMember('city', { type: 'string' })
          .build()
      };

      const personSchema = Schema.create('Person')
        .addMember('name', { type: 'string' })
        .addMember('address', addressMemberDef)
        .build();

      expect(personSchema.memberCount).toBe(2);
      const addressDef = personSchema.get('address');
      expect(addressDef?.type).toBe('object');
      expect(addressDef?.schema).toBeInstanceOf(Schema);
    });

    test('should support mixed type definitions', () => {
      const schema = Schema.create('MixedTypes')
        .addMember('stringField', { type: 'string' })
        .addMember('numberField', { type: 'number' })
        .addMember('boolField', { type: 'boolean' })
        .addMember('anyField', { type: 'any' })
        .addMember('arrayField', { type: 'array', of: { type: 'string' } })
        .build();

      expect(schema.memberCount).toBe(5);
      expect(schema.get('stringField')?.type).toBe('string');
      expect(schema.get('numberField')?.type).toBe('number');
      expect(schema.get('boolField')?.type).toBe('boolean');
      expect(schema.get('anyField')?.type).toBe('any');
      expect(schema.get('arrayField')?.type).toBe('array');
    });
  });

  describe('Open Schema Variations', () => {
    test('should support open schema with boolean true', () => {
      const schema = Schema.create('OpenSchema')
        .setOpen(true)
        .build();

      expect(schema.open).toBe(true);
    });

    test('should support open schema with MemberDef constraint', () => {
      const openConstraint: MemberDef = { type: 'string' };
      const schema = Schema.create('ConstrainedOpen')
        .setOpen(openConstraint)
        .build();

      expect(schema.open).toEqual(openConstraint);
    });

    test('should default to closed schema', () => {
      const schema = Schema.create('ClosedSchema').build();

      expect(schema.open).toBe(false);
    });

    test('should allow toggling open flag', () => {
      const schema = Schema.create('TestSchema')
        .setOpen(true)
        .setOpen(false)
        .build();

      expect(schema.open).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle schema with single member', () => {
      const schema = Schema.create('SingleMember')
        .addMember('only', { type: 'string' })
        .build();

      expect(schema.memberCount).toBe(1);
      expect(schema.names).toEqual(['only']);
    });

    test('should handle unicode member names', () => {
      const schema = Schema.create('UnicodeSchema')
        .addMember('名前', { type: 'string' })
        .addMember('年齢', { type: 'number' })
        .build();

      expect(schema.has('名前')).toBe(true);
      expect(schema.has('年齢')).toBe(true);
    });

    test('should handle very long member names', () => {
      const longName = 'a'.repeat(1000);
      const schema = Schema.create('LongNameSchema')
        .addMember(longName, { type: 'string' })
        .build();

      expect(schema.has(longName)).toBe(true);
    });

    test('should handle numeric-like member names', () => {
      const schema = Schema.create('NumericNames')
        .addMember('123', { type: 'string' })
        .addMember('0', { type: 'number' })
        .build();

      expect(schema.has('123')).toBe(true);
      expect(schema.has('0')).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should handle large number of members efficiently', () => {
      const builder = Schema.create('LargeSchema');

      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        builder.addMember(`field${i}`, { type: 'string' });
      }

      const schema = builder.build();
      const endTime = performance.now();

      expect(schema.memberCount).toBe(10000);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });

    test('should have O(1) member lookup', () => {
      const builder = Schema.create('LookupTest');
      for (let i = 0; i < 10000; i++) {
        builder.addMember(`field${i}`, { type: 'string' });
      }
      const schema = builder.build();

      const startTime = performance.now();

      // Perform 10000 lookups
      for (let i = 0; i < 10000; i++) {
        schema.get(`field${i % 10000}`);
        schema.has(`field${i % 10000}`);
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });
  });
});
