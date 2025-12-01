import { normalizeKeyToken } from '../../../src/schema/utils/member-utils';
import TokenNode from '../../../src/parser/nodes/tokens';
import Token from '../../../src/parser/tokenizer/tokens';
import TokenType from '../../../src/parser/tokenizer/token-types';
import SyntaxError from '../../../src/errors/io-syntax-error';

// Helper to create Token
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

// Helper to create TokenNode
function createTokenNode(value: any, type: string = TokenType.STRING): TokenNode {
  return new TokenNode(createToken(value, type));
}

describe('normalizeKeyToken', () => {
  describe('TokenNode input', () => {
    test('should pass through TokenNode(STRING) unchanged', () => {
      const tokenNode = createTokenNode('fieldName');
      const result = normalizeKeyToken(tokenNode);

      expect(result).toBe(tokenNode);
      expect(result).toBeInstanceOf(TokenNode);
      expect((result as TokenNode).type).toBe(TokenType.STRING);
    });

    test('should handle TokenNode with empty string', () => {
      const tokenNode = createTokenNode('');
      const result = normalizeKeyToken(tokenNode);

      expect(result).toBe(tokenNode);
    });

    test('should handle TokenNode with special characters', () => {
      const tokenNode = createTokenNode('field_name');
      const result = normalizeKeyToken(tokenNode);

      expect(result).toBe(tokenNode);
    });

    test('should handle TokenNode with unicode', () => {
      const tokenNode = createTokenNode('字段名');
      const result = normalizeKeyToken(tokenNode);

      expect(result).toBe(tokenNode);
    });

    test('should throw for TokenNode with non-STRING type', () => {
      const tokenNode = createTokenNode(123, TokenType.NUMBER);

      expect(() => normalizeKeyToken(tokenNode)).toThrow(SyntaxError);
      expect(() => normalizeKeyToken(tokenNode)).toThrow(/key must be a string/i);
    });

    test('should throw for TokenNode(BOOLEAN)', () => {
      const tokenNode = createTokenNode(true, TokenType.BOOLEAN);

      expect(() => normalizeKeyToken(tokenNode)).toThrow(SyntaxError);
    });

    test('should throw for TokenNode(NULL)', () => {
      const tokenNode = createTokenNode(null, TokenType.NULL);

      expect(() => normalizeKeyToken(tokenNode)).toThrow(SyntaxError);
    });
  });

  describe('Token input (non-node)', () => {
    test('should wrap Token(STRING) in TokenNode', () => {
      const token = createToken('fieldName');
      const result = normalizeKeyToken(token as any);

      expect(result).toBeInstanceOf(TokenNode);
      expect((result as TokenNode).value).toBe('fieldName');
      expect((result as TokenNode).type).toBe(TokenType.STRING);
    });

    test('should throw for Token with non-STRING type', () => {
      const token = createToken(42, TokenType.NUMBER);

      expect(() => normalizeKeyToken(token as any)).toThrow(SyntaxError);
    });
  });

  describe('Error cases', () => {
    test('should throw for null input', () => {
      // assertNever is called which throws
      expect(() => normalizeKeyToken(null as any)).toThrow();
    });

    test('should throw for undefined input', () => {
      // assertNever is called which throws
      expect(() => normalizeKeyToken(undefined as any)).toThrow();
    });

    test('should throw for plain object', () => {
      expect(() => normalizeKeyToken({} as any)).toThrow(SyntaxError);
    });

    test('should throw for string (non-token)', () => {
      expect(() => normalizeKeyToken('plainString' as any)).toThrow(SyntaxError);
    });

    test('should throw for number', () => {
      expect(() => normalizeKeyToken(123 as any)).toThrow(SyntaxError);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long key names', () => {
      const longName = 'a'.repeat(1000);
      const tokenNode = createTokenNode(longName);
      const result = normalizeKeyToken(tokenNode);

      expect(result).toBe(tokenNode);
      expect((result as TokenNode).value).toBe(longName);
    });

    test('should handle key with numbers', () => {
      const tokenNode = createTokenNode('field123');
      const result = normalizeKeyToken(tokenNode);

      expect(result).toBe(tokenNode);
    });

    test('should handle key starting with underscore', () => {
      const tokenNode = createTokenNode('_privateField');
      const result = normalizeKeyToken(tokenNode);

      expect(result).toBe(tokenNode);
    });

    test('should handle key with hyphen', () => {
      const tokenNode = createTokenNode('field-name');
      const result = normalizeKeyToken(tokenNode);

      expect(result).toBe(tokenNode);
    });

    test('should handle key with dot', () => {
      const tokenNode = createTokenNode('nested.field');
      const result = normalizeKeyToken(tokenNode);

      expect(result).toBe(tokenNode);
    });
  });

  describe('Performance', () => {
    test('should normalize many keys efficiently', () => {
      const tokens = Array.from({ length: 10000 }, (_, i) => createTokenNode(`field${i}`));

      const startTime = performance.now();
      tokens.forEach(token => normalizeKeyToken(token));
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should be fast for single normalization', () => {
      const tokenNode = createTokenNode('fieldName');

      const startTime = performance.now();
      for (let i = 0; i < 100000; i++) {
        normalizeKeyToken(tokenNode);
      }
      const endTime = performance.now();

      // Should be very fast since it's just a type check and return
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});
