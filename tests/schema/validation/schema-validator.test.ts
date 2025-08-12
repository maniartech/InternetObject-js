import { SchemaValidator, ValidationResult } from '../../../src/schema/validation/schema-validator';
import Schema from '../../../src/schema/schema';
import MemberDef from '../../../src/schema/types/memberdef';
import TypedefRegistry from '../../../src/schema/typedef-registry';

// Mock basic types for testing
class MockStringType {
  static types = ['string'];
  constructor(public type: string) {}
  get schema() { return Schema.create(`${this.type}Schema`).build(); }
  parse(value: any) { return String(value); }
}

class MockNumberType {
  static types = ['number'];
  constructor(public type: string) {}
  get schema() { return Schema.create(`${this.type}Schema`).build(); }
  parse(value: any) { return Number(value); }
}

class MockBooleanType {
  static types = ['boolean'];
  constructor(public type: string) {}
  get schema() { return Schema.create(`${this.type}Schema`).build(); }
  parse(value: any) { return Boolean(value); }
}

describe('SchemaValidator', () => {
  beforeEach(() => {
    TypedefRegistry.clear();
    TypedefRegistry.register(MockStringType, MockNumberType, MockBooleanType);
  });

  afterEach(() => {
    TypedefRegistry.clear();
  });

  describe('ValidationResult', () => {
    test('should create success result', () => {
      const result = ValidationResult.success();
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should create failure result', () => {
      const errors = ['Error 1', 'Error 2'];
      const result = ValidationResult.failure(errors);
      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(errors);
    });
  });

  describe('validateMemberDef', () => {
    test('should validate valid member definition', () => {
      const memberDef: MemberDef = { type: 'string', path: 'name' };
      const result = SchemaValidator.validateMemberDef(memberDef);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should fail validation for missing type', () => {
      const memberDef = { path: 'name' } as MemberDef;
      const result = SchemaValidator.validateMemberDef(memberDef);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Member definition must have a type');
    });

    test('should fail validation for unknown type', () => {
      const memberDef: MemberDef = { type: 'unknownType', path: 'name' };
      const result = SchemaValidator.validateMemberDef(memberDef);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unknown type: unknownType');
    });

    test('should validate string length constraints', () => {
      // Valid constraints
      const validMemberDef: MemberDef = {
        type: 'string',
        path: 'name',
        minLength: 5,
        maxLength: 10
      };
      let result = SchemaValidator.validateMemberDef(validMemberDef);
      expect(result.isValid).toBe(true);

      // Invalid constraints
      const invalidMemberDef: MemberDef = {
        type: 'string',
        path: 'name',
        minLength: 10,
        maxLength: 5
      };
      result = SchemaValidator.validateMemberDef(invalidMemberDef);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('minLength cannot be greater than maxLength');
    });

    test('should validate number range constraints', () => {
      // Valid constraints
      const validMemberDef: MemberDef = {
        type: 'number',
        path: 'age',
        min: 0,
        max: 150
      };
      let result = SchemaValidator.validateMemberDef(validMemberDef);
      expect(result.isValid).toBe(true);

      // Invalid constraints
      const invalidMemberDef: MemberDef = {
        type: 'number',
        path: 'age',
        min: 150,
        max: 0
      };
      result = SchemaValidator.validateMemberDef(invalidMemberDef);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('min cannot be greater than max');
    });
  });

  describe('validateSchema', () => {
    test('should validate empty schema', () => {
      const schema = Schema.create('EmptySchema').build();
      const result = SchemaValidator.validateSchema(schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should validate schema with valid members', () => {
      const schema = Schema.create('ValidSchema')
        .addMember('name', { type: 'string', path: 'name' })
        .addMember('age', { type: 'number', path: 'age' })
        .addMember('active', { type: 'boolean', path: 'active' })
        .build();

      const result = SchemaValidator.validateSchema(schema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should fail validation for schema with invalid members', () => {
      const schema = Schema.create('InvalidSchema')
        .addMember('validField', { type: 'string', path: 'validField' })
        .addMember('invalidField', { type: 'unknownType', path: 'invalidField' } as MemberDef)
        .build();

      const result = SchemaValidator.validateSchema(schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalidField: Unknown type: unknownType');
    });

    test('should collect all validation errors from multiple members', () => {
      const schema = Schema.create('MultipleErrorsSchema')
        .addMember('field1', { type: 'unknownType1', path: 'field1' } as MemberDef)
        .addMember('field2', { type: 'unknownType2', path: 'field2' } as MemberDef)
        .addMember('field3', { type: 'string', path: 'field3', minLength: 10, maxLength: 5 })
        .build();

      const result = SchemaValidator.validateSchema(schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toEqual(expect.arrayContaining([
        'field1: Unknown type: unknownType1',
        'field2: Unknown type: unknownType2',
        'field3: minLength cannot be greater than maxLength'
      ]));
    });
  });

  describe('validateSchemaName', () => {
    test('should validate valid schema names', () => {
      const validNames = ['Schema', 'UserSchema', 'user_schema', 'Schema123', 'MySchema_V2'];

      validNames.forEach(name => {
        const result = SchemaValidator.validateSchemaName(name);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    test('should fail validation for invalid schema names', () => {
      const testCases = [
        { name: '', expectedError: 'Schema name cannot be empty or whitespace only' },
        { name: '   ', expectedError: 'Schema name cannot be empty or whitespace only' },
        { name: null, expectedError: 'Schema name must be a non-empty string' },
        { name: undefined, expectedError: 'Schema name must be a non-empty string' },
        { name: 123, expectedError: 'Schema name must be a non-empty string' },
        { name: '123Schema', expectedError: 'Schema name must start with a letter and contain only letters, numbers, and underscores' },
        { name: 'Schema-Name', expectedError: 'Schema name must start with a letter and contain only letters, numbers, and underscores' },
        { name: 'Schema.Name', expectedError: 'Schema name must start with a letter and contain only letters, numbers, and underscores' },
        { name: 'Schema Name', expectedError: 'Schema name must start with a letter and contain only letters, numbers, and underscores' }
      ];

      testCases.forEach(({ name, expectedError }) => {
        const result = SchemaValidator.validateSchemaName(name as any);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(expectedError);
      });
    });
  });

  describe('Integration Tests', () => {
    test('should validate complex real-world schema', () => {
      const userSchema = Schema.create('UserProfile')
        .addMember('id', { type: 'number', path: 'id', min: 1 })
        .addMember('username', { type: 'string', path: 'username', minLength: 3, maxLength: 30 })
        .addMember('email', { type: 'string', path: 'email' })
        .addMember('age', { type: 'number', path: 'age', min: 13, max: 120 })
        .addMember('isActive', { type: 'boolean', path: 'isActive' })
        .setOpen(true)
        .build();

      const result = SchemaValidator.validateSchema(userSchema);
      expect(result.isValid).toBe(true);
    });

    test('should validate schema name during creation', () => {
      const validName = 'ValidUserSchema';
      const nameResult = SchemaValidator.validateSchemaName(validName);
      expect(nameResult.isValid).toBe(true);

      const schema = Schema.create(validName)
        .addMember('name', { type: 'string' })
        .build();

      const schemaResult = SchemaValidator.validateSchema(schema);
      expect(schemaResult.isValid).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should validate large schemas efficiently', () => {
      const builder = Schema.create('LargeSchema');

      // Create schema with many members
      for (let i = 0; i < 500; i++) {
        builder.addMember(`field${i}`, {
          type: i % 3 === 0 ? 'string' : i % 3 === 1 ? 'number' : 'boolean',
          path: `field${i}`
        });
      }

      const largeSchema = builder.build();

      const startTime = performance.now();
      const result = SchemaValidator.validateSchema(largeSchema);
      const endTime = performance.now();

      expect(result.isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(100); // Should validate quickly
    });
  });
});
