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
  });
});
