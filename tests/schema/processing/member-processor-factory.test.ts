// Import from main index to ensure proper module initialization order
import '../../../src';
import { MemberProcessorFactory } from '../../../src/schema/processing/member-processor-factory';
import MemberNode from '../../../src/parser/nodes/members';
import TokenNode from '../../../src/parser/nodes/tokens';
import Token from '../../../src/parser/tokenizer/tokens';
import TokenType from '../../../src/parser/tokenizer/token-types';
import MemberDef from '../../../src/schema/types/memberdef';
import Definitions from '../../../src/core/definitions';

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

function createMemberNode(key: string | null, value: any, valueType: string = TokenType.STRING): MemberNode {
  const valueToken = createToken(value, valueType);
  valueToken.type = valueType;
  const valueNode = new TokenNode(valueToken);
  const keyNode = key ? new TokenNode(createToken(key)) : undefined;
  return new MemberNode(valueNode, keyNode);
}

describe('MemberProcessorFactory', () => {
  describe('process', () => {
    describe('String Processing', () => {
      test('should process string member', () => {
        const member = createMemberNode(null, 'testValue');
        const memberDef: MemberDef = { type: 'string', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe('testValue');
      });

      test('should process empty string', () => {
        const member = createMemberNode(null, '');
        const memberDef: MemberDef = { type: 'string', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe('');
      });

      test('should process string with special characters', () => {
        const member = createMemberNode(null, 'hello\nworld\t!');
        const memberDef: MemberDef = { type: 'string', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe('hello\nworld\t!');
      });

      test('should process unicode string', () => {
        const member = createMemberNode(null, '日本語テスト 🎉');
        const memberDef: MemberDef = { type: 'string', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe('日本語テスト 🎉');
      });
    });

    describe('Number Processing', () => {
      test('should process integer', () => {
        const member = createMemberNode(null, 42, TokenType.NUMBER);
        const memberDef: MemberDef = { type: 'number', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe(42);
      });

      test('should process float', () => {
        const member = createMemberNode(null, 3.14, TokenType.NUMBER);
        const memberDef: MemberDef = { type: 'number', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe(3.14);
      });

      test('should process negative number', () => {
        const member = createMemberNode(null, -100, TokenType.NUMBER);
        const memberDef: MemberDef = { type: 'number', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe(-100);
      });

      test('should process zero', () => {
        const member = createMemberNode(null, 0, TokenType.NUMBER);
        const memberDef: MemberDef = { type: 'number', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe(0);
      });
    });

    describe('Boolean Processing', () => {
      test('should process true', () => {
        const member = createMemberNode(null, true, TokenType.BOOLEAN);
        const memberDef: MemberDef = { type: 'bool', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe(true);
      });

      test('should process false', () => {
        const member = createMemberNode(null, false, TokenType.BOOLEAN);
        const memberDef: MemberDef = { type: 'bool', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe(false);
      });
    });

    describe('Any Type Processing', () => {
      test('should process any type with string', () => {
        const member = createMemberNode(null, 'anything');
        const memberDef: MemberDef = { type: 'any', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe('anything');
      });

      test('should process any type with number', () => {
        const member = createMemberNode(null, 123, TokenType.NUMBER);
        const memberDef: MemberDef = { type: 'any', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe(123);
      });

      test('should process any type with boolean', () => {
        const member = createMemberNode(null, true, TokenType.BOOLEAN);
        const memberDef: MemberDef = { type: 'any', path: 'field' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe(true);
      });
    });

    describe('With Definitions', () => {
      test('should pass definitions to processor', () => {
        const member = createMemberNode(null, 'value');
        const memberDef: MemberDef = { type: 'string', path: 'field' };
        const defs = new Definitions();
        defs.set('test', 'testValue');

        const result = MemberProcessorFactory.process(member, memberDef, defs);

        expect(result).toBe('value');
      });
    });

    describe('Error Handling', () => {
      test('should throw for unregistered type', () => {
        const member = createMemberNode(null, 'value');
        const memberDef: MemberDef = { type: 'unknownType', path: 'field' };

        expect(() => {
          MemberProcessorFactory.process(member, memberDef);
        }).toThrow(/not registered/);
      });

      test('should throw for type validation failure', () => {
        const member = createMemberNode(null, 'not-a-number');
        const memberDef: MemberDef = { type: 'number', path: 'field' };

        expect(() => {
          MemberProcessorFactory.process(member, memberDef);
        }).toThrow();
      });
    });

    describe('Member with Key', () => {
      test('should process member with key', () => {
        const member = createMemberNode('fieldName', 'value');
        const memberDef: MemberDef = { type: 'string', path: 'fieldName' };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe('value');
      });
    });

    describe('Null and Undefined Handling', () => {
      test('should process null when allowed', () => {
        const member = createMemberNode(null, null, TokenType.NULL);
        const memberDef: MemberDef = { type: 'string', path: 'field', null: true };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBeNull();
      });

      test('should handle optional with default', () => {
        const member = createMemberNode(null, undefined, TokenType.UNDEFINED);
        const memberDef: MemberDef = {
          type: 'string',
          path: 'field',
          optional: true,
          default: 'defaultValue'
        };

        const result = MemberProcessorFactory.process(member, memberDef);

        expect(result).toBe('defaultValue');
      });
    });

    describe('Performance', () => {
      test('should process many members efficiently', () => {
        const memberDef: MemberDef = { type: 'string', path: 'field' };

        const startTime = performance.now();

        for (let i = 0; i < 10000; i++) {
          const member = createMemberNode(null, `value${i}`);
          MemberProcessorFactory.process(member, memberDef);
        }

        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(500);
      });

      test('should handle mixed types efficiently', () => {
        const startTime = performance.now();

        for (let i = 0; i < 3000; i++) {
          // String
          const strMember = createMemberNode(null, `string${i}`);
          MemberProcessorFactory.process(strMember, { type: 'string', path: 'str' });

          // Number
          const numMember = createMemberNode(null, i, TokenType.NUMBER);
          MemberProcessorFactory.process(numMember, { type: 'number', path: 'num' });

          // Boolean
          const boolMember = createMemberNode(null, i % 2 === 0, TokenType.BOOLEAN);
          MemberProcessorFactory.process(boolMember, { type: 'bool', path: 'bool' });
        }

        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(1000);
      });
    });
  });
});
