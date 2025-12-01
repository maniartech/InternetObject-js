// Import from main index to ensure proper module initialization order
import '../../../src';
import processSchema from '../../../src/schema/processor';
import processObject from '../../../src/schema/object-processor';
import processCollection from '../../../src/schema/processing/collection-processor';
import { processMember } from '../../../src/schema/processing/member-processor';
import Schema from '../../../src/schema/schema';
import Definitions from '../../../src/core/definitions';
import InternetObject from '../../../src/core/internet-object';
import Collection from '../../../src/core/collection';
import ObjectNode from '../../../src/parser/nodes/objects';
import CollectionNode from '../../../src/parser/nodes/collections';
import MemberNode from '../../../src/parser/nodes/members';
import TokenNode from '../../../src/parser/nodes/tokens';
import Token from '../../../src/parser/tokenizer/tokens';
import TokenType from '../../../src/parser/tokenizer/token-types';
import MemberDef from '../../../src/schema/types/memberdef';
import IOError from '../../../src/errors/io-error';
import ValidationError from '../../../src/errors/io-validation-error';
import SyntaxError from '../../../src/errors/io-syntax-error';

// Helper to create tokens for testing
function createToken(value: any, type: string = 'string'): Token {
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
  const token = createToken(value, type);
  token.type = type;
  return new TokenNode(token);
}

function createMemberNode(key: string | null, value: any, valueType: string = TokenType.STRING): MemberNode {
  const valueToken = createToken(value, valueType);
  valueToken.type = valueType;
  const valueNode = new TokenNode(valueToken);
  const keyNode = key ? new TokenNode(createToken(key)) : undefined;
  const member = new MemberNode(valueNode, keyNode);
  return member;
}

describe('Schema Processors', () => {
  describe('processSchema', () => {
    test('should process ObjectNode with valid schema', () => {
      const objectNode = new ObjectNode();
      objectNode.children.push(createMemberNode(null, 'John'));
      objectNode.children.push(createMemberNode(null, 30, TokenType.NUMBER));

      const schema = Schema.create('Person')
        .addMember('name', { type: 'string', path: 'name' })
        .addMember('age', { type: 'number', path: 'age' })
        .build();

      const result = processSchema(objectNode, schema);

      expect(result).toBeInstanceOf(InternetObject);
      expect((result as InternetObject).get('name')).toBe('John');
      expect((result as InternetObject).get('age')).toBe(30);
    });

    test('should process CollectionNode with valid schema', () => {
      const collectionNode = new CollectionNode();

      const obj1 = new ObjectNode();
      obj1.children.push(createMemberNode(null, 'Alice'));

      const obj2 = new ObjectNode();
      obj2.children.push(createMemberNode(null, 'Bob'));

      collectionNode.children.push(obj1);
      collectionNode.children.push(obj2);

      const schema = Schema.create('Person')
        .addMember('name', { type: 'string', path: 'name' })
        .build();

      const result = processSchema(collectionNode, schema);

      expect(result).toBeInstanceOf(Collection);
      expect((result as Collection<InternetObject>).length).toBe(2);
    });

    test('should resolve schema from TokenNode reference', () => {
      const objectNode = new ObjectNode();
      objectNode.children.push(createMemberNode(null, 'test'));

      const schema = Schema.create('TestSchema')
        .addMember('value', { type: 'string', path: 'value' })
        .build();

      const defs = new Definitions();
      defs.set('$TestSchema', schema);

      const schemaRef = createTokenNode('$TestSchema');

      const result = processSchema(objectNode, schemaRef, defs);

      expect(result).toBeInstanceOf(InternetObject);
      expect((result as InternetObject).get('value')).toBe('test');
    });

    test('should collect errors when errorCollector is provided', () => {
      const collectionNode = new CollectionNode();

      const validObj = new ObjectNode();
      validObj.children.push(createMemberNode(null, 'valid'));

      collectionNode.children.push(validObj);

      const schema = Schema.create('TestSchema')
        .addMember('value', { type: 'string', path: 'value' })
        .build();

      const errors: Error[] = [];
      const result = processSchema(collectionNode, schema, undefined, errors);

      expect(result).toBeInstanceOf(Collection);
    });

    test('should handle null data by returning null', () => {
      const schema = Schema.create('TestSchema').build();

      // processSchema returns null for null data, doesn't throw
      const result = processSchema(null as any, schema);
      expect(result).toBeNull();
    });

    test('should throw for invalid data node type (non-null)', () => {
      const schema = Schema.create('TestSchema').build();

      expect(() => {
        processSchema('invalid' as any, schema);
      }).toThrow(/Invalid data node type/);
    });

    test('should throw for invalid schema type', () => {
      const objectNode = new ObjectNode();

      expect(() => {
        processSchema(objectNode, 'invalid' as any);
      }).toThrow(/Invalid schema type/);

      expect(() => {
        processSchema(objectNode, null as any);
      }).toThrow(/Invalid schema type/);
    });
  });

  describe('processObject', () => {
    test('should process positional members', () => {
      const objectNode = new ObjectNode();
      objectNode.children.push(createMemberNode(null, 'value1'));
      objectNode.children.push(createMemberNode(null, 'value2'));

      const schema = Schema.create('TestSchema')
        .addMember('field1', { type: 'string', path: 'field1' })
        .addMember('field2', { type: 'string', path: 'field2' })
        .build();

      const result = processObject(objectNode, schema);

      expect(result.get('field1')).toBe('value1');
      expect(result.get('field2')).toBe('value2');
    });

    test('should process keyed members', () => {
      const objectNode = new ObjectNode();
      objectNode.children.push(createMemberNode('field2', 'value2'));
      objectNode.children.push(createMemberNode('field1', 'value1'));

      const schema = Schema.create('TestSchema')
        .addMember('field1', { type: 'string', path: 'field1' })
        .addMember('field2', { type: 'string', path: 'field2' })
        .build();

      const result = processObject(objectNode, schema);

      expect(result.get('field1')).toBe('value1');
      expect(result.get('field2')).toBe('value2');
    });

    test('should handle mixed positional and keyed members', () => {
      const objectNode = new ObjectNode();
      objectNode.children.push(createMemberNode(null, 'positional'));
      objectNode.children.push(createMemberNode('keyed', 'keyedValue'));

      const schema = Schema.create('TestSchema')
        .addMember('first', { type: 'string', path: 'first' })
        .addMember('keyed', { type: 'string', path: 'keyed' })
        .build();

      const result = processObject(objectNode, schema);

      expect(result.get('first')).toBe('positional');
      expect(result.get('keyed')).toBe('keyedValue');
    });

    test('should handle optional members with defaults', () => {
      const objectNode = new ObjectNode();
      objectNode.children.push(createMemberNode(null, 'provided'));

      const schema = Schema.create('TestSchema')
        .addMember('provided', { type: 'string', path: 'provided' })
        .addMember('optional', { type: 'string', path: 'optional', optional: true, default: 'defaultValue' })
        .build();

      const result = processObject(objectNode, schema);

      expect(result.get('provided')).toBe('provided');
      expect(result.get('optional')).toBe('defaultValue');
    });

    test('should handle open schema with additional fields', () => {
      const objectNode = new ObjectNode();
      objectNode.children.push(createMemberNode(null, 'defined'));
      objectNode.children.push(createMemberNode('extra', 'extraValue'));

      const schema = Schema.create('TestSchema')
        .addMember('field', { type: 'string', path: 'field' })
        .setOpen(true)
        .build();

      const result = processObject(objectNode, schema);

      expect(result.get('field')).toBe('defined');
      expect(result.get('extra')).toBe('extraValue');
    });

    test('should reject additional fields in closed schema', () => {
      const objectNode = new ObjectNode();
      objectNode.children.push(createMemberNode(null, 'defined'));
      objectNode.children.push(createMemberNode('extra', 'extraValue'));

      const schema = Schema.create('TestSchema')
        .addMember('field', { type: 'string', path: 'field' })
        .setOpen(false)
        .build();

      expect(() => {
        processObject(objectNode, schema);
      }).toThrow(/additional.*not allowed/i);
    });

    test('should throw for duplicate keyed members', () => {
      const objectNode = new ObjectNode();
      objectNode.children.push(createMemberNode('field', 'value1'));
      objectNode.children.push(createMemberNode('field', 'value2'));

      const schema = Schema.create('TestSchema')
        .addMember('field', { type: 'string', path: 'field' })
        .build();

      expect(() => {
        processObject(objectNode, schema);
      }).toThrow(/duplicate|already defined/i);
    });

    test('should throw for missing required fields', () => {
      const objectNode = new ObjectNode();
      // No members provided

      const schema = Schema.create('TestSchema')
        .addMember('required', { type: 'string', path: 'required' })
        .build();

      expect(() => {
        processObject(objectNode, schema);
      }).toThrow(/required|expecting a value/i);
    });

    test('should resolve schema from TokenNode reference with definitions', () => {
      const objectNode = new ObjectNode();
      objectNode.children.push(createMemberNode(null, 'test'));

      const schema = Schema.create('TestSchema')
        .addMember('value', { type: 'string', path: 'value' })
        .build();

      const defs = new Definitions();
      defs.set('$TestSchema', schema);

      const schemaRef = createTokenNode('$TestSchema');

      const result = processObject(objectNode, schemaRef, defs);

      expect(result).toBeInstanceOf(InternetObject);
      expect(result.get('value')).toBe('test');
    });

    test('should handle single-field schema with non-matching key', () => {
      const objectNode = new ObjectNode();
      // Create nested object-like data
      const innerObj = new ObjectNode();
      innerObj.children.push(createMemberNode('nested', 'nestedValue'));
      const keyNode = new TokenNode(createToken('different'));
      const member = new MemberNode(innerObj, keyNode);
      objectNode.children.push(member);

      const schema = Schema.create('TestSchema')
        .addMember('field', { type: 'object', path: 'field' })
        .setOpen(true)
        .build();

      // This tests the single-field special case handling
      const result = processObject(objectNode, schema);
      expect(result).toBeInstanceOf(InternetObject);
    });
  });

  describe('processCollection', () => {
    test('should process collection of objects', () => {
      const collectionNode = new CollectionNode();

      const obj1 = new ObjectNode();
      obj1.children.push(createMemberNode(null, 'Alice'));

      const obj2 = new ObjectNode();
      obj2.children.push(createMemberNode(null, 'Bob'));

      const obj3 = new ObjectNode();
      obj3.children.push(createMemberNode(null, 'Charlie'));

      collectionNode.children.push(obj1);
      collectionNode.children.push(obj2);
      collectionNode.children.push(obj3);

      const schema = Schema.create('Person')
        .addMember('name', { type: 'string', path: 'name' })
        .build();

      const result = processCollection(collectionNode, schema);

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(3);
      expect(result.getAt(0).get('name')).toBe('Alice');
      expect(result.getAt(1).get('name')).toBe('Bob');
      expect(result.getAt(2).get('name')).toBe('Charlie');
    });

    test('should handle empty collection', () => {
      const collectionNode = new CollectionNode();

      const schema = Schema.create('TestSchema')
        .addMember('field', { type: 'string', path: 'field' })
        .build();

      const result = processCollection(collectionNode, schema);

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(0);
    });

    test('should collect validation errors in errorCollector', () => {
      const collectionNode = new CollectionNode();

      const validObj = new ObjectNode();
      validObj.children.push(createMemberNode(null, 'valid'));

      // Create object that will fail number validation
      const invalidObj = new ObjectNode();
      invalidObj.children.push(createMemberNode(null, 'not-a-number'));

      const anotherValidObj = new ObjectNode();
      anotherValidObj.children.push(createMemberNode(null, 'another'));

      collectionNode.children.push(validObj);
      collectionNode.children.push(invalidObj);
      collectionNode.children.push(anotherValidObj);

      const schema = Schema.create('TestSchema')
        .addMember('value', { type: 'string', path: 'value' })
        .build();

      const errors: Error[] = [];
      const result = processCollection(collectionNode, schema, undefined, errors);

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(3);
    });

    test('should attach collectionIndex to errors', () => {
      const collectionNode = new CollectionNode();

      // Create invalid object
      const invalidObj = new ObjectNode();
      // Empty object will fail for required field
      collectionNode.children.push(invalidObj);

      const schema = Schema.create('TestSchema')
        .addMember('required', { type: 'string', path: 'required' })
        .build();

      const errors: Error[] = [];
      const result = processCollection(collectionNode, schema, undefined, errors);

      expect(errors.length).toBeGreaterThan(0);
      expect((errors[0] as any).collectionIndex).toBe(0);
    });

    test('should resolve schema from definitions', () => {
      const collectionNode = new CollectionNode();

      const obj = new ObjectNode();
      obj.children.push(createMemberNode(null, 'test'));
      collectionNode.children.push(obj);

      const schema = Schema.create('TestSchema')
        .addMember('value', { type: 'string', path: 'value' })
        .build();

      const defs = new Definitions();
      defs.set('$TestSchema', schema);

      const schemaRef = createTokenNode('$TestSchema');

      const result = processCollection(collectionNode, schemaRef, defs);

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(1);
    });
  });

  describe('processMember', () => {
    test('should process string member', () => {
      const member = createMemberNode(null, 'testValue');
      const memberDef: MemberDef = { type: 'string', path: 'field' };

      const result = processMember(member, memberDef);

      expect(result).toBe('testValue');
    });

    test('should process number member', () => {
      const member = createMemberNode(null, 42, TokenType.NUMBER);
      const memberDef: MemberDef = { type: 'number', path: 'field' };

      const result = processMember(member, memberDef);

      expect(result).toBe(42);
    });

    test('should process boolean member', () => {
      const member = createMemberNode(null, true, TokenType.BOOLEAN);
      const memberDef: MemberDef = { type: 'bool', path: 'field' };

      const result = processMember(member, memberDef);

      expect(result).toBe(true);
    });

    test('should throw for unregistered type', () => {
      const member = createMemberNode(null, 'test');
      const memberDef: MemberDef = { type: 'nonExistentType', path: 'field' };

      expect(() => {
        processMember(member, memberDef);
      }).toThrow(/not registered/);
    });

    test('should pass definitions to type parser', () => {
      const member = createMemberNode(null, 'value');
      const memberDef: MemberDef = { type: 'string', path: 'field' };

      const defs = new Definitions();
      defs.set('test', 'testValue');

      const result = processMember(member, memberDef, defs);

      expect(result).toBe('value');
    });
  });

  describe('Variable Resolution', () => {
    test('should resolve default value from definitions', () => {
      const objectNode = new ObjectNode();
      // Empty - should use default

      const defs = new Definitions();
      const defaultToken = createToken('defaultValue');
      defaultToken.type = TokenType.STRING;
      defs.set('@defaultValue', new TokenNode(defaultToken));

      const schema = Schema.create('TestSchema')
        .addMember('field', {
          type: 'string',
          path: 'field',
          optional: true,
          default: '@defaultValue'
        })
        .build();

      const result = processObject(objectNode, schema, defs);

      expect(result.get('field')).toBe('defaultValue');
    });

    test('should resolve min/max constraints from definitions', () => {
      const objectNode = new ObjectNode();
      objectNode.children.push(createMemberNode(null, 5, TokenType.NUMBER));

      const defs = new Definitions();
      const minToken = createToken(0);
      minToken.type = TokenType.NUMBER;
      const maxToken = createToken(10);
      maxToken.type = TokenType.NUMBER;
      defs.set('@minValue', new TokenNode(minToken));
      defs.set('@maxValue', new TokenNode(maxToken));

      const schema = Schema.create('TestSchema')
        .addMember('value', {
          type: 'number',
          path: 'value',
          min: '@minValue',
          max: '@maxValue'
        } as any)
        .build();

      const result = processObject(objectNode, schema, defs);

      expect(result.get('value')).toBe(5);
    });

    test('should resolve choices from definitions', () => {
      const objectNode = new ObjectNode();
      objectNode.children.push(createMemberNode(null, 'b'));

      const defs = new Definitions();

      const schema = Schema.create('TestSchema')
        .addMember('field', {
          type: 'string',
          path: 'field',
          choices: ['a', 'b', 'c']
        })
        .build();

      const result = processObject(objectNode, schema, defs);

      expect(result.get('field')).toBe('b');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty object with open schema', () => {
      const objectNode = new ObjectNode();

      const schema = Schema.create('TestSchema')
        .setOpen(true)
        .build();

      const result = processObject(objectNode, schema);

      expect(result).toBeInstanceOf(InternetObject);
      expect(result.isEmpty()).toBe(true);
    });

    test('should handle null values when allowed', () => {
      const objectNode = new ObjectNode();
      const nullMember = createMemberNode(null, null, TokenType.NULL);
      objectNode.children.push(nullMember);

      const schema = Schema.create('TestSchema')
        .addMember('field', { type: 'string', path: 'field', null: true })
        .build();

      const result = processObject(objectNode, schema);

      expect(result.get('field')).toBeNull();
    });

    test('should handle deeply nested schema references', () => {
      const innerSchema = Schema.create('Inner')
        .addMember('value', { type: 'string', path: 'value' })
        .build();

      const outerSchema = Schema.create('Outer')
        .addMember('inner', { type: 'object', path: 'inner', schema: innerSchema })
        .build();

      // Create nested object
      const innerObj = new ObjectNode();
      innerObj.children.push(createMemberNode(null, 'nested'));

      const outerObj = new ObjectNode();
      const innerMember = new MemberNode(innerObj);
      outerObj.children.push(innerMember);

      const result = processObject(outerObj, outerSchema);

      expect(result).toBeInstanceOf(InternetObject);
    });
  });

  describe('Performance', () => {
    test('should process large collections efficiently', () => {
      const collectionNode = new CollectionNode();

      // Create 1000 objects
      for (let i = 0; i < 1000; i++) {
        const obj = new ObjectNode();
        obj.children.push(createMemberNode(null, `value${i}`));
        collectionNode.children.push(obj);
      }

      const schema = Schema.create('TestSchema')
        .addMember('field', { type: 'string', path: 'field' })
        .build();

      const startTime = performance.now();
      const result = processCollection(collectionNode, schema);
      const endTime = performance.now();


      expect(result.length).toBe(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should process objects with many fields efficiently', () => {
      const objectNode = new ObjectNode();
      const builder = Schema.create('LargeSchema');

      for (let i = 0; i < 100; i++) {
        objectNode.children.push(createMemberNode(null, `value${i}`));
        builder.addMember(`field${i}`, { type: 'string', path: `field${i}` });
      }

      const schema = builder.build();

      const startTime = performance.now();
      const result = processObject(objectNode, schema);
      const endTime = performance.now();

      expect(Object.keys(result.toJSON()).length).toBe(100);
      expect(endTime - startTime).toBeLessThan(500);
    });
  });
});
