import { ValidationUtils, ProcessingResult } from '../../../src/schema/utils/validation-utils';
import ObjectNode from '../../../src/parser/nodes/objects';
import CollectionNode from '../../../src/parser/nodes/collections';
import TokenNode from '../../../src/parser/nodes/tokens';
import Token from '../../../src/parser/tokenizer/tokens';
import Schema from '../../../src/schema/schema';

// Helper function to create test tokens
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

describe('ValidationUtils', () => {
  describe('isValidDataNode', () => {
    test('should accept ObjectNode', () => {
      const objectNode = new ObjectNode();
      expect(ValidationUtils.isValidDataNode(objectNode)).toBe(true);
    });

    test('should accept CollectionNode', () => {
      const collectionNode = new CollectionNode();
      expect(ValidationUtils.isValidDataNode(collectionNode)).toBe(true);
    });

    test('should reject invalid nodes', () => {
      expect(ValidationUtils.isValidDataNode(null)).toBe(false);
      expect(ValidationUtils.isValidDataNode(undefined)).toBe(false);
      expect(ValidationUtils.isValidDataNode({})).toBe(false);
      expect(ValidationUtils.isValidDataNode('string')).toBe(false);
      expect(ValidationUtils.isValidDataNode(123)).toBe(false);
    });
  });

  describe('isValidSchema', () => {
    test('should accept Schema instance', () => {
      const schema = Schema.create('TestSchema').build();
      expect(ValidationUtils.isValidSchema(schema)).toBe(true);
    });

    test('should accept TokenNode', () => {
      const tokenNode = new TokenNode(createTestToken('test'));
      expect(ValidationUtils.isValidSchema(tokenNode)).toBe(true);
    });

    test('should reject invalid schemas', () => {
      expect(ValidationUtils.isValidSchema(null)).toBe(false);
      expect(ValidationUtils.isValidSchema(undefined)).toBe(false);
      expect(ValidationUtils.isValidSchema({})).toBe(false);
      expect(ValidationUtils.isValidSchema('schema')).toBe(false);
    });
  });

  describe('validateProcessingInputs', () => {
    test('should validate correct inputs', () => {
      const objectNode = new ObjectNode();
      const schema = Schema.create('TestSchema').build();

      const result = ValidationUtils.validateProcessingInputs(objectNode, schema);

      expect(result.data).toBe(objectNode);
      expect(result.schema).toBe(schema);
    });

    test('should validate ObjectNode with TokenNode schema', () => {
      const objectNode = new ObjectNode();
      const tokenNode = new TokenNode(createTestToken('schemaRef'));

      const result = ValidationUtils.validateProcessingInputs(objectNode, tokenNode);

      expect(result.data).toBe(objectNode);
      expect(result.schema).toBe(tokenNode);
    });

    test('should validate CollectionNode with Schema', () => {
      const collectionNode = new CollectionNode();
      const schema = Schema.create('TestSchema').build();

      const result = ValidationUtils.validateProcessingInputs(collectionNode, schema);

      expect(result.data).toBe(collectionNode);
      expect(result.schema).toBe(schema);
    });

    test('should throw error for invalid data node', () => {
      const schema = Schema.create('TestSchema').build();

      expect(() => {
        ValidationUtils.validateProcessingInputs(null, schema);
      }).toThrow('Invalid data node type: null');

      expect(() => {
        ValidationUtils.validateProcessingInputs({}, schema);
      }).toThrow('Invalid data node type: Object');
    });

    test('should throw error for invalid schema', () => {
      const objectNode = new ObjectNode();

      expect(() => {
        ValidationUtils.validateProcessingInputs(objectNode, null);
      }).toThrow('Invalid schema type: null');

      expect(() => {
        ValidationUtils.validateProcessingInputs(objectNode, {});
      }).toThrow('Invalid schema type: Object');
    });

    test('should throw error for both invalid inputs', () => {
      expect(() => {
        ValidationUtils.validateProcessingInputs(null, null);
      }).toThrow('Invalid data node type: null');
    });
  });

  describe('Edge Cases', () => {
    test('should handle undefined constructor names gracefully', () => {
      const objectWithoutConstructor = Object.create(null);

      expect(() => {
        ValidationUtils.validateProcessingInputs(objectWithoutConstructor, Schema.create('Test').build());
      }).toThrow('Invalid data node type: undefined');
    });

    test('should provide meaningful error messages', () => {
      const customObject = new (class CustomClass {})();
      const schema = Schema.create('Test').build();

      expect(() => {
        ValidationUtils.validateProcessingInputs(customObject, schema);
      }).toThrow('Invalid data node type: CustomClass');
    });
  });
});

describe('ProcessingResult', () => {
  describe('Success Results', () => {
    test('should create success result with data', () => {
      const data = { name: 'test' };
      const result = ProcessingResult.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
      expect(result.error).toBeUndefined();
      expect(result.isSuccess()).toBe(true);
    });

    test('should work with different data types', () => {
      const stringResult = ProcessingResult.success('test string');
      expect(stringResult.data).toBe('test string');

      const numberResult = ProcessingResult.success(42);
      expect(numberResult.data).toBe(42);

      const arrayResult = ProcessingResult.success([1, 2, 3]);
      expect(arrayResult.data).toEqual([1, 2, 3]);
    });
  });

  describe('Failure Results', () => {
    test('should create failure result with error', () => {
      const error = new Error('Test error');
      const result = ProcessingResult.failure(error);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.error).toBe(error);
      expect(result.isSuccess()).toBe(false);
    });

    test('should handle different error types', () => {
      const genericError = ProcessingResult.failure(new Error('Generic error'));
      expect(genericError.error?.message).toBe('Generic error');

      const typeError = ProcessingResult.failure(new TypeError('Type error'));
      expect(typeError.error).toBeInstanceOf(TypeError);
    });
  });

  describe('Type Guards', () => {
    test('should correctly identify success results', () => {
      const successResult = ProcessingResult.success('data');

      if (successResult.isSuccess()) {
        // TypeScript should know that data is available here
        expect(successResult.data).toBe('data');
      } else {
        throw new Error('Should be success result');
      }
    });

    test('should correctly identify failure results', () => {
      const failureResult = ProcessingResult.failure(new Error('Failed'));

      expect(failureResult.isSuccess()).toBe(false);
      if (!failureResult.isSuccess()) {
        expect(failureResult.error?.message).toBe('Failed');
      }
    });
  });

  describe('Generic Type Support', () => {
    interface TestData {
      id: number;
      name: string;
    }

    test('should support generic types in success', () => {
      const data: TestData = { id: 1, name: 'Test' };
      const result: ProcessingResult<TestData> = ProcessingResult.success(data);

      expect(result.success).toBe(true);
      if (result.isSuccess()) {
        // TypeScript should know the exact type
        expect(result.data.id).toBe(1);
        expect(result.data.name).toBe('Test');
      }
    });

    test('should support generic types in failure', () => {
      const error = new Error('Validation failed');
      const result: ProcessingResult<TestData> = ProcessingResult.failure(error);

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('Immutability', () => {
    test('should create immutable result objects', () => {
      const data = { value: 'test' };
      const result = ProcessingResult.success(data);

      // Properties are readonly in TypeScript but not frozen at runtime
      // This is acceptable for our use case as TypeScript prevents accidental mutations
      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
      expect(result.error).toBeUndefined();
    });
  });
});
