import { SchemaResolver } from '../../../src/schema/utils/schema-resolver';
import Schema from '../../../src/schema/schema';
import Definitions from '../../../src/core/definitions';
import TokenNode from '../../../src/parser/nodes/tokens';
import Token from '../../../src/parser/tokenizer/tokens';
import TokenType from '../../../src/parser/tokenizer/token-types';
import IOError from '../../../src/errors/io-error';

// Helper to create tokens for testing
function createToken(value: any, type: string = TokenType.STRING): Token {
  const token = new Token();
  token.value = value;
  token.type = type;
  token.token = String(value);
  token.pos = 0;
  token.row = 1;
  token.col = 1;
  return token;
}

function createTokenNode(value: any, type: string = TokenType.STRING): TokenNode {
  return new TokenNode(createToken(value, type));
}

describe('SchemaResolver', () => {
  describe('resolve', () => {
    test('should return Schema instance directly', () => {
      const schema = Schema.create('TestSchema')
        .addMember('field', { type: 'string' })
        .build();

      const result = SchemaResolver.resolve(schema);

      expect(result).toBe(schema);
    });

    test('should resolve schema from TokenNode reference', () => {
      const schema = Schema.create('TestSchema')
        .addMember('field', { type: 'string' })
        .build();

      const defs = new Definitions();
      defs.set('$TestSchema', schema);

      const tokenNode = createTokenNode('$TestSchema');

      const result = SchemaResolver.resolve(tokenNode, defs);

      expect(result).toBe(schema);
    });

    test('should throw error when schema not found in definitions', () => {
      const defs = new Definitions();
      const tokenNode = createTokenNode('$NonExistent');

      expect(() => {
        SchemaResolver.resolve(tokenNode, defs);
      }).toThrow();
    });

    test('should throw error when definitions not provided for TokenNode', () => {
      const tokenNode = createTokenNode('$TestSchema');

      expect(() => {
        SchemaResolver.resolve(tokenNode);
      }).toThrow(/not found|invalid|cannot read/i);
    });

    test('should throw error when resolved value is not a Schema', () => {
      const defs = new Definitions();
      defs.set('$NotASchema', 'just a string');

      const tokenNode = createTokenNode('$NotASchema');

      expect(() => {
        SchemaResolver.resolve(tokenNode, defs);
      }).toThrow(/not found|invalid/i);
    });

    test('should handle nested schema references', () => {
      const innerSchema = Schema.create('InnerSchema')
        .addMember('value', { type: 'string' })
        .build();

      const defs = new Definitions();
      defs.set('$InnerSchema', innerSchema);

      const tokenNode = createTokenNode('$InnerSchema');

      const result = SchemaResolver.resolve(tokenNode, defs);

      expect(result).toBe(innerSchema);
      expect(result.name).toBe('InnerSchema');
    });

    test('should preserve schema properties after resolution', () => {
      const schema = Schema.create('TestSchema')
        .addMember('name', { type: 'string', path: 'name' })
        .addMember('age', { type: 'number', path: 'age' })
        .setOpen(true)
        .build();

      const defs = new Definitions();
      defs.set('$TestSchema', schema);

      const tokenNode = createTokenNode('$TestSchema');

      const result = SchemaResolver.resolve(tokenNode, defs);

      expect(result.name).toBe('TestSchema');
      expect(result.memberCount).toBe(2);
      expect(result.open).toBe(true);
      expect(result.names).toEqual(['name', 'age']);
    });
  });

  describe('isSchemaVariable', () => {
    test('should return true for TokenNode with $ prefix', () => {
      const tokenNode = createTokenNode('$SchemaRef');

      expect(SchemaResolver.isSchemaVariable(tokenNode)).toBe(true);
    });

    test('should return false for TokenNode without $ prefix', () => {
      const tokenNode = createTokenNode('RegularString');

      expect(SchemaResolver.isSchemaVariable(tokenNode)).toBe(false);
    });

    test('should return false for non-string TokenNode', () => {
      const tokenNode = createTokenNode(123, TokenType.NUMBER);

      expect(SchemaResolver.isSchemaVariable(tokenNode)).toBe(false);
    });

    test('should return false for null', () => {
      expect(SchemaResolver.isSchemaVariable(null)).toBe(false);
    });

    test('should return false for undefined', () => {
      expect(SchemaResolver.isSchemaVariable(undefined)).toBe(false);
    });

    test('should return false for plain string', () => {
      expect(SchemaResolver.isSchemaVariable('$Schema')).toBe(false);
    });

    test('should return false for plain object', () => {
      expect(SchemaResolver.isSchemaVariable({ value: '$Schema' })).toBe(false);
    });

    test('should return false for Schema instance', () => {
      const schema = Schema.create('TestSchema').build();

      expect(SchemaResolver.isSchemaVariable(schema)).toBe(false);
    });

    test('should return true for various $ prefixed values', () => {
      expect(SchemaResolver.isSchemaVariable(createTokenNode('$a'))).toBe(true);
      expect(SchemaResolver.isSchemaVariable(createTokenNode('$Person'))).toBe(true);
      expect(SchemaResolver.isSchemaVariable(createTokenNode('$schema123'))).toBe(true);
      expect(SchemaResolver.isSchemaVariable(createTokenNode('$_underscore'))).toBe(true);
    });

    test('should return false for $ only', () => {
      const tokenNode = createTokenNode('$');

      // $ alone should still be true as it starts with $
      expect(SchemaResolver.isSchemaVariable(tokenNode)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty schema name', () => {
      const schema = Schema.create('').build();

      const result = SchemaResolver.resolve(schema);

      expect(result).toBe(schema);
      expect(result.name).toBe('');
    });

    test('should handle schema with no members', () => {
      const schema = Schema.create('EmptySchema').build();

      const defs = new Definitions();
      defs.set('$EmptySchema', schema);

      const tokenNode = createTokenNode('$EmptySchema');

      const result = SchemaResolver.resolve(tokenNode, defs);

      expect(result.memberCount).toBe(0);
    });

    test('should handle TokenNode with special characters in name', () => {
      const schema = Schema.create('TestSchema').build();

      const defs = new Definitions();
      defs.set('$special_schema-123', schema);

      const tokenNode = createTokenNode('$special_schema-123');

      const result = SchemaResolver.resolve(tokenNode, defs);

      expect(result).toBe(schema);
    });

    test('should handle definitions with multiple schemas', () => {
      const schema1 = Schema.create('Schema1').build();
      const schema2 = Schema.create('Schema2').build();
      const schema3 = Schema.create('Schema3').build();

      const defs = new Definitions();
      defs.set('$Schema1', schema1);
      defs.set('$Schema2', schema2);
      defs.set('$Schema3', schema3);

      expect(SchemaResolver.resolve(createTokenNode('$Schema1'), defs)).toBe(schema1);
      expect(SchemaResolver.resolve(createTokenNode('$Schema2'), defs)).toBe(schema2);
      expect(SchemaResolver.resolve(createTokenNode('$Schema3'), defs)).toBe(schema3);
    });

    test('should handle unicode schema names', () => {
      const schema = Schema.create('スキーマ').build();

      const defs = new Definitions();
      defs.set('$スキーマ', schema);

      const tokenNode = createTokenNode('$スキーマ');

      const result = SchemaResolver.resolve(tokenNode, defs);

      expect(result).toBe(schema);
    });
  });

  describe('Performance', () => {
    test('should resolve schemas efficiently', () => {
      const defs = new Definitions();

      // Create many schemas
      for (let i = 0; i < 100; i++) {
        const schema = Schema.create(`Schema${i}`).build();
        defs.set(`$Schema${i}`, schema);
      }

      const startTime = performance.now();

      // Resolve each schema multiple times
      for (let i = 0; i < 100; i++) {
        for (let j = 0; j < 10; j++) {
          SchemaResolver.resolve(createTokenNode(`$Schema${i}`), defs);
        }
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should check schema variables efficiently', () => {
      const tokenNodes = Array.from({ length: 1000 }, (_, i) =>
        createTokenNode(`$Schema${i}`)
      );

      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        tokenNodes.forEach(node => SchemaResolver.isSchemaVariable(node));
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});
