import Schema from '../../../src/schema/schema';
import { SchemaUtils } from '../../../src/schema/schema-utils';
import MemberDef from '../../../src/schema/types/memberdef';

describe('SchemaUtils', () => {
  let baseSchema: Schema;
  let extensionSchema: Schema;

  beforeEach(() => {
    baseSchema = Schema.create('BaseSchema')
      .addMember('id', { type: 'number', path: 'id' })
      .addMember('name', { type: 'string', path: 'name' })
      .setOpen(false)
      .build();

    extensionSchema = Schema.create('ExtensionSchema')
      .addMember('email', { type: 'string', path: 'email' })
      .addMember('age', { type: 'number', path: 'age' })
      .setOpen(true)
      .build();
  });

  describe('cloneSchema', () => {
    test('should create exact clone of schema', () => {
      const cloned = SchemaUtils.cloneSchema(baseSchema);

      expect(cloned.name).toBe(baseSchema.name);
      expect(cloned.names).toEqual(baseSchema.names);
      expect(cloned.open).toBe(baseSchema.open);
      expect(cloned.memberCount).toBe(baseSchema.memberCount);

      // Should have same member definitions
      for (const name of baseSchema.names) {
        expect(cloned.get(name)).toEqual(baseSchema.get(name));
      }
    });

    test('should create independent clone (deep copy)', () => {
      const cloned = SchemaUtils.cloneSchema(baseSchema);

      // Cloned schema should be independent
      expect(cloned).not.toBe(baseSchema);
      expect(cloned.names).not.toBe(baseSchema.names);
      expect(cloned.defs).not.toBe(baseSchema.defs);
    });

    test('should preserve open flag in clone', () => {
      const openSchema = Schema.create('OpenSchema')
        .setOpen(true)
        .build();

      const cloned = SchemaUtils.cloneSchema(openSchema);
      expect(cloned.open).toBe(true);
    });
  });

  describe('mergeSchemas', () => {
    test('should merge two schemas with all members', () => {
      const merged = SchemaUtils.mergeSchemas(baseSchema, extensionSchema);

      expect(merged.name).toBe('BaseSchema_ExtensionSchema');
      expect(merged.memberCount).toBe(4); // id, name, email, age
      expect(merged.names).toEqual(expect.arrayContaining(['id', 'name', 'email', 'age']));
    });

    test('should handle open flag correctly in merge', () => {
      // Base closed, extension open -> result should be open
      let merged = SchemaUtils.mergeSchemas(baseSchema, extensionSchema);
      expect(merged.open).toBe(true);

      // Both closed -> result should be closed
      const closedExtension = Schema.create('ClosedExtension')
        .addMember('extra', { type: 'string' })
        .setOpen(false)
        .build();

      merged = SchemaUtils.mergeSchemas(baseSchema, closedExtension);
      expect(merged.open).toBe(false);
    });

    test('should include all members from both schemas', () => {
      const merged = SchemaUtils.mergeSchemas(baseSchema, extensionSchema);

      // Check base schema members
      expect(merged.has('id')).toBe(true);
      expect(merged.has('name')).toBe(true);
      expect(merged.get('id')?.type).toBe('number');
      expect(merged.get('name')?.type).toBe('string');

      // Check extension schema members
      expect(merged.has('email')).toBe(true);
      expect(merged.has('age')).toBe(true);
      expect(merged.get('email')?.type).toBe('string');
      expect(merged.get('age')?.type).toBe('number');
    });

    test('should handle empty schemas', () => {
      const emptySchema = Schema.create('EmptySchema').build();

      const merged1 = SchemaUtils.mergeSchemas(baseSchema, emptySchema);
      expect(merged1.memberCount).toBe(baseSchema.memberCount);

      const merged2 = SchemaUtils.mergeSchemas(emptySchema, baseSchema);
      expect(merged2.memberCount).toBe(baseSchema.memberCount);
    });
  });

  describe('getSchemaMetrics', () => {
    test('should return correct basic metrics', () => {
      const metrics = SchemaUtils.getSchemaMetrics(baseSchema);

      expect(metrics.memberCount).toBe(2);
      expect(metrics.isOpen).toBe(false);
      expect(typeof metrics.typeDistribution).toBe('object');
    });

    test('should calculate type distribution correctly', () => {
      const complexSchema = Schema.create('ComplexSchema')
        .addMember('id', { type: 'number' })
        .addMember('count', { type: 'number' })
        .addMember('name', { type: 'string' })
        .addMember('email', { type: 'string' })
        .addMember('active', { type: 'boolean' })
        .build();

      const metrics = SchemaUtils.getSchemaMetrics(complexSchema);

      expect(metrics.typeDistribution).toEqual({
        number: 2,
        string: 2,
        boolean: 1
      });
    });

    test('should handle empty schema metrics', () => {
      const emptySchema = Schema.create('EmptySchema').build();
      const metrics = SchemaUtils.getSchemaMetrics(emptySchema);

      expect(metrics.memberCount).toBe(0);
      expect(metrics.isOpen).toBe(false);
      expect(metrics.typeDistribution).toEqual({});
    });

    test('should handle open schema flag', () => {
      const openSchema = Schema.create('OpenSchema')
        .addMember('name', { type: 'string' })
        .setOpen(true)
        .build();

      const metrics = SchemaUtils.getSchemaMetrics(openSchema);
      expect(metrics.isOpen).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle schema with single member', () => {
      const singleMemberSchema = Schema.create('SingleMember')
        .addMember('only', { type: 'string' })
        .build();

      const cloned = SchemaUtils.cloneSchema(singleMemberSchema);
      expect(cloned.memberCount).toBe(1);
      expect(cloned.get('only')?.type).toBe('string');

      const metrics = SchemaUtils.getSchemaMetrics(singleMemberSchema);
      expect(metrics.typeDistribution).toEqual({ string: 1 });
    });

    test('should preserve member paths in operations', () => {
      const schemaWithPaths = Schema.create('WithPaths')
        .addMember('shortName', { type: 'string', path: 'very.long.nested.path' })
        .build();

      const cloned = SchemaUtils.cloneSchema(schemaWithPaths);
      expect(cloned.get('shortName')?.path).toBe('very.long.nested.path');
    });
  });

  describe('Performance Tests', () => {
    test('should handle large schemas efficiently', () => {
      // Create large schema
      const builder = Schema.create('LargeSchema');
      for (let i = 0; i < 1000; i++) {
        builder.addMember(`field${i}`, { type: i % 2 === 0 ? 'string' : 'number' });
      }
      const largeSchema = builder.build();

      const startTime = performance.now();

      // Test operations
      const cloned = SchemaUtils.cloneSchema(largeSchema);
      const metrics = SchemaUtils.getSchemaMetrics(largeSchema);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100);
      expect(cloned.memberCount).toBe(1000);
      expect(metrics.memberCount).toBe(1000);
      expect(metrics.typeDistribution.string).toBe(500);
      expect(metrics.typeDistribution.number).toBe(500);
    });
  });
});
