import { vi } from 'vitest';
import Schema, { SchemaBuilder } from '../../../src/schema/schema';
import TypedefRegistry from '../../../src/schema/typedef-registry';
import { SchemaValidator } from '../../../src/schema/validation/schema-validator';
import { SchemaUtils } from '../../../src/schema/schema-utils';
import { SchemaResolver } from '../../../src/schema/utils/schema-resolver';
import processSchema from '../../../src/schema/processor';
import ObjectNode from '../../../src/parser/nodes/objects';
import CollectionNode from '../../../src/parser/nodes/collections';
import TokenNode from '../../../src/parser/nodes/tokens';
import Token from '../../../src/parser/tokenizer/tokens';
import Definitions from '../../../src/core/definitions';
import MemberDef from '../../../src/schema/types/memberdef';

// Mock implementations for testing
class MockStringTypeDef {
  static types = ['string'];
  constructor(public type: string) {}
  get schema() { return Schema.create('StringSchema').build(); }
  parse(value: any) { return String(value || ''); }
}

class MockNumberTypeDef {
  static types = ['number'];
  constructor(public type: string) {}
  get schema() { return Schema.create('NumberSchema').build(); }
  parse(value: any) { return Number(value || 0); }
}

class MockObjectTypeDef {
  static types = ['object'];
  constructor(public type: string) {}
  get schema() { return Schema.create('ObjectSchema').build(); }
  parse(value: any) { return value || {}; }
}

// Helper functions
function createTestToken(value: any, type: string = 'string'): Token {
  const token = new Token();
  token.value = value;
  token.type = type;
  token.token = String(value);
  token.pos = 0;
  token.row = 1;
  token.col = 1;
  return token;
}

describe('Schema System Integration Tests', () => {
  beforeEach(() => {
    TypedefRegistry.clear();
  // Keep tests quiet and deterministic; warnings are covered elsewhere
  TypedefRegistry.setWarnOnDuplicates(false);
    TypedefRegistry.register(MockStringTypeDef, MockNumberTypeDef, MockObjectTypeDef);
  });

  afterEach(() => {
    TypedefRegistry.clear();
  });

  describe('Complete Schema Workflow', () => {
    test('should create, validate, and process a complete user schema', () => {
      // Step 1: Create schema using builder pattern
      const userSchema = Schema.create('UserProfile')
        .addMember('id', { type: 'number', path: 'id', min: 1 })
        .addMember('username', { type: 'string', path: 'username', minLength: 3, maxLength: 30 })
        .addMember('email', { type: 'string', path: 'email' })
        .addMember('profile', { type: 'object', path: 'profile' })
        .setOpen(true)
        .build();

      // Step 2: Validate the schema
      const validationResult = SchemaValidator.validateSchema(userSchema);
      expect(validationResult.isValid).toBe(true);

      // Step 3: Get schema metrics
      const metrics = SchemaUtils.getSchemaMetrics(userSchema);
      expect(metrics.memberCount).toBe(4);
      expect(metrics.isOpen).toBe(true);
      expect(metrics.typeDistribution).toEqual({
        number: 1,
        string: 2,
        object: 1
      });

      // Step 4: Verify schema properties
      expect(userSchema.name).toBe('UserProfile');
      expect(userSchema.has('id')).toBe(true);
      expect(userSchema.has('username')).toBe(true);
      expect(userSchema.get('id')?.type).toBe('number');
    });

    test('should handle schema references and resolution', () => {
      // Create a schema that can be referenced
      const addressSchema = Schema.create('Address')
        .addMember('street', { type: 'string', path: 'street' })
        .addMember('city', { type: 'string', path: 'city' })
        .build();

      // Create definitions with the address schema
      const definitions = new Definitions();
      definitions.set('$Address', addressSchema);

      // Create token reference
      const tokenRef = new TokenNode(createTestToken('$Address'));

      // Test schema resolution
      const resolved = SchemaResolver.resolve(tokenRef, definitions);
      expect(resolved).toBe(addressSchema);
      expect(resolved.name).toBe('Address');

      // Test schema variable detection
      expect(SchemaResolver.isSchemaVariable(tokenRef)).toBe(true);
      expect(SchemaResolver.isSchemaVariable(addressSchema)).toBe(false);
    });

    test('should handle complex nested schema validation', () => {
      // Create nested schemas
      const addressSchema = Schema.create('Address')
        .addMember('street', { type: 'string', path: 'street' })
        .addMember('city', { type: 'string', path: 'city' })
        .addMember('zipCode', { type: 'number', path: 'zipCode' })
        .build();

      const userSchema = Schema.create('User')
        .addMember('name', { type: 'string', path: 'name' })
        .addMember('age', { type: 'number', path: 'age', min: 0, max: 150 })
        .addMember('address', { type: 'object', path: 'address', schema: addressSchema })
        .build();

      // Validate both schemas
      const addressValidation = SchemaValidator.validateSchema(addressSchema);
      const userValidation = SchemaValidator.validateSchema(userSchema);

      expect(addressValidation.isValid).toBe(true);
      expect(userValidation.isValid).toBe(true);

      // Test schema utilities on nested structure
      const userMetrics = SchemaUtils.getSchemaMetrics(userSchema);
      expect(userMetrics.memberCount).toBe(3);
      expect(userMetrics.typeDistribution.string).toBe(1);
      expect(userMetrics.typeDistribution.number).toBe(1);
      expect(userMetrics.typeDistribution.object).toBe(1);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle validation errors across multiple schema components', () => {
      // Create schema with multiple validation errors
      const problematicSchema = Schema.create('ProblematicSchema')
        .addMember('validField', { type: 'string', path: 'validField' })
        .addMember('invalidType', { type: 'nonExistentType', path: 'invalidType' } as MemberDef)
        .addMember('badConstraints', {
          type: 'string',
          path: 'badConstraints',
          minLength: 100,
          maxLength: 10
        })
        .build();

      const validationResult = SchemaValidator.validateSchema(problematicSchema);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors).toHaveLength(2);
      expect(validationResult.errors).toEqual(expect.arrayContaining([
        'invalidType: Unknown type: nonExistentType',
        'badConstraints: minLength cannot be greater than maxLength'
      ]));
    });

    test('should handle schema resolution errors gracefully', () => {
      const definitions = new Definitions();
      const invalidTokenRef = new TokenNode(createTestToken('$NonExistentSchema'));

      expect(() => {
        SchemaResolver.resolve(invalidTokenRef, definitions);
      }).toThrow("Schema $NonExistentSchema is not defined.");
    });
  });

  describe('Performance Integration Tests', () => {
    test('should handle large-scale schema operations efficiently', () => {
      const startTime = performance.now();

      // Create large schema
      const builder = Schema.create('LargeSchema');
      for (let i = 0; i < 200; i++) {
        builder.addMember(`field${i}`, {
          type: i % 3 === 0 ? 'string' : i % 3 === 1 ? 'number' : 'object',
          path: `field${i}`
        });
      }
      const largeSchema = builder.build();

      // Perform multiple operations
      const validationResult = SchemaValidator.validateSchema(largeSchema);
      const metrics = SchemaUtils.getSchemaMetrics(largeSchema);
      const clonedSchema = SchemaUtils.cloneSchema(largeSchema);

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify results
      expect(validationResult.isValid).toBe(true);
      expect(metrics.memberCount).toBe(200);
      expect(clonedSchema.memberCount).toBe(200);

      // Performance check
      expect(duration).toBeLessThan(200);
    });

    test('should handle registry operations with many types efficiently', () => {
      TypedefRegistry.clear();

      const startTime = performance.now();

      // Register and unregister many times
      for (let i = 0; i < 50; i++) {
        TypedefRegistry.register(MockStringTypeDef, MockNumberTypeDef, MockObjectTypeDef);

        // Test lookups
        for (let j = 0; j < 10; j++) {
          TypedefRegistry.get('string');
          TypedefRegistry.get('number');
          TypedefRegistry.get('object');
          TypedefRegistry.isRegisteredType('string');
        }

        if (i % 10 === 0) {
          TypedefRegistry.clear();
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Real-World Scenarios', () => {
    test('should handle e-commerce product schema', () => {
      const categorySchema = Schema.create('Category')
        .addMember('id', { type: 'number', path: 'id' })
        .addMember('name', { type: 'string', path: 'name' })
        .addMember('parent', { type: 'object', path: 'parent', optional: true })
        .build();

      const productSchema = Schema.create('Product')
        .addMember('id', { type: 'number', path: 'id' })
        .addMember('sku', { type: 'string', path: 'sku', minLength: 3, maxLength: 20 })
        .addMember('name', { type: 'string', path: 'name', minLength: 1, maxLength: 100 })
        .addMember('price', { type: 'number', path: 'price', min: 0 })
        .addMember('category', { type: 'object', path: 'category', schema: categorySchema })
        .addMember('inStock', { type: 'number', path: 'inStock', min: 0 })
        .setOpen(true)
        .build();

      // Validate schemas
      expect(SchemaValidator.validateSchema(categorySchema).isValid).toBe(true);
      expect(SchemaValidator.validateSchema(productSchema).isValid).toBe(true);

      // Get metrics
      const productMetrics = SchemaUtils.getSchemaMetrics(productSchema);
      expect(productMetrics.memberCount).toBe(6);
      expect(productMetrics.isOpen).toBe(true);
    });

    test('should handle user management system schema', () => {
      const roleSchema = Schema.create('Role')
        .addMember('id', { type: 'number', path: 'id' })
        .addMember('name', { type: 'string', path: 'name' })
        .addMember('permissions', { type: 'object', path: 'permissions' })
        .build();

      const userSchema = Schema.create('User')
        .addMember('id', { type: 'number', path: 'id' })
        .addMember('username', { type: 'string', path: 'username', minLength: 3 })
        .addMember('email', { type: 'string', path: 'email' })
        .addMember('role', { type: 'object', path: 'role', schema: roleSchema })
        .addMember('createdAt', { type: 'string', path: 'createdAt' })
        .addMember('isActive', { type: 'number', path: 'isActive', min: 0, max: 1 })
        .build();

      // Test schema merging for admin user
      const adminUserSchema = SchemaUtils.mergeSchemas(userSchema,
        Schema.create('AdminExtension')
          .addMember('adminLevel', { type: 'number', path: 'adminLevel', min: 1, max: 10 })
          .build()
      );

      expect(adminUserSchema.memberCount).toBe(7);
      expect(adminUserSchema.has('adminLevel')).toBe(true);
      expect(SchemaValidator.validateSchema(adminUserSchema).isValid).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain compatibility with legacy schema creation', () => {
      // Legacy pattern
      const legacySchema = Schema.fromLegacy('LegacyUser',
        { name: { type: 'string' } },
        { age: { type: 'number', min: 0 } }
      );

      // Should work with new validation
      const validationResult = SchemaValidator.validateSchema(legacySchema);
      expect(validationResult.isValid).toBe(true);
      expect(legacySchema.memberCount).toBe(2);

      // Should work with new utilities
      const metrics = SchemaUtils.getSchemaMetrics(legacySchema);
      expect(metrics.typeDistribution.string).toBe(1);
      expect(metrics.typeDistribution.number).toBe(1);
    });
  });

  describe('Registry warnings behavior', () => {
    test('should not emit duplicate warnings when disabled (quiet mode)', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation();

      // beforeEach registered types with warnings disabled
      // Attempt duplicate registration; should be quiet
      TypedefRegistry.register(MockStringTypeDef, MockNumberTypeDef, MockObjectTypeDef);

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    test('should emit a single warning when enabled and duplicate occurs', () => {
      // Enable warnings just for this test
      TypedefRegistry.setWarnOnDuplicates(true);
      const spy = vi.spyOn(console, 'warn').mockImplementation();

      // Trigger a duplicate for 'string'
      TypedefRegistry.register(MockStringTypeDef);

      expect(spy).toHaveBeenCalledWith("TypeDef for 'string' is already registered. Skipping.");

      // Cleanup
      spy.mockRestore();
      TypedefRegistry.setWarnOnDuplicates(false);
    });
  });
});
