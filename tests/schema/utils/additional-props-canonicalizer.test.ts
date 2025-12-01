// Import from main index to ensure proper module initialization order
import '../../../src';
import { canonicalizeAdditionalProps } from '../../../src/schema/utils/additional-props-canonicalizer';
import TokenNode from '../../../src/parser/nodes/tokens';
import ObjectNode from '../../../src/parser/nodes/objects';
import ArrayNode from '../../../src/parser/nodes/array';
import MemberNode from '../../../src/parser/nodes/members';
import Token from '../../../src/parser/tokenizer/tokens';
import TokenType from '../../../src/parser/tokenizer/token-types';

// Helper to create TokenNode
function createTokenNode(value: any, type: string = TokenType.STRING): TokenNode {
  const token = new Token();
  token.value = value;
  token.type = type;
  token.token = String(value);
  token.pos = 0;
  token.row = 1;
  token.col = 1;
  return new TokenNode(token);
}

// Helper to create MemberNode
function createMemberNode(key: string | null, value: any, valueType: string = TokenType.STRING): MemberNode {
  const valueNode = createTokenNode(value, valueType);
  const keyNode = key ? createTokenNode(key) : undefined;
  return new MemberNode(valueNode, keyNode);
}

// Helper to create ArrayNode with mock brackets
function createArrayNode(children: Array<any> = []): ArrayNode {
  const openBracket = new Token();
  openBracket.type = TokenType.BRACKET_OPEN;
  openBracket.value = '[';
  openBracket.pos = 0;
  openBracket.row = 1;
  openBracket.col = 1;

  const closeBracket = new Token();
  closeBracket.type = TokenType.BRACKET_CLOSE;
  closeBracket.value = ']';
  closeBracket.pos = 1;
  closeBracket.row = 1;
  closeBracket.col = 2;

  return new ArrayNode(children, openBracket, closeBracket);
}

describe('canonicalizeAdditionalProps', () => {
  describe('TokenNode handling', () => {
    test('should convert string type to MemberDef', () => {
      const node = createTokenNode('string');
      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('string');
      expect(result.path).toBe('*');
    });

    test('should convert number type to MemberDef', () => {
      const node = createTokenNode('number');
      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('number');
      expect(result.path).toBe('*');
    });

    test('should convert bool type to MemberDef', () => {
      const node = createTokenNode('bool');
      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('bool');
      expect(result.path).toBe('*');
    });

    test('should convert * to any type', () => {
      const node = createTokenNode('*');
      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('any');
      expect(result.path).toBe('*');
    });

    test('should handle unregistered type by defaulting to any', () => {
      const node = createTokenNode('unknownType');
      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('any');
      expect(result.path).toBe('*');
    });

    test('should use custom path when provided', () => {
      const node = createTokenNode('string');
      const result = canonicalizeAdditionalProps(node, 'customPath');

      expect(result.type).toBe('string');
      expect(result.path).toBe('customPath');
    });

    test('should handle non-string TokenNode value', () => {
      const node = createTokenNode(123, TokenType.NUMBER);
      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('any');
      expect(result.path).toBe('*');
    });
  });

  describe('Empty ObjectNode (open object form)', () => {
    test('should convert empty ObjectNode to open object type', () => {
      const node = new ObjectNode();
      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('object');
      expect(result.path).toBe('*');
      expect(result.open).toBe(true);
    });

    test('should use custom path for empty object', () => {
      const node = new ObjectNode();
      const result = canonicalizeAdditionalProps(node, 'additionalFields');

      expect(result.type).toBe('object');
      expect(result.path).toBe('additionalFields');
      expect(result.open).toBe(true);
    });
  });

  describe('ObjectNode with type (MemberDef with constraints)', () => {
    test('should convert object with type as first child', () => {
      const node = new ObjectNode();
      const typeMember = createMemberNode(null, 'string');
      node.children.push(typeMember);

      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('string');
      expect(result.path).toBe('*');
    });

    test('should extract constraints from additional children', () => {
      const node = new ObjectNode();
      // First child: type (no key)
      const typeMember = createMemberNode(null, 'string');
      node.children.push(typeMember);
      // Second child: constraint (with key)
      const constraintMember = createMemberNode('minLen', 10, TokenType.NUMBER);
      node.children.push(constraintMember);

      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('string');
      expect(result.path).toBe('*');
      expect((result as any).minLen).toBe(10);
    });

    test('should handle multiple constraints', () => {
      const node = new ObjectNode();
      const typeMember = createMemberNode(null, 'number');
      node.children.push(typeMember);
      const minMember = createMemberNode('min', 0, TokenType.NUMBER);
      node.children.push(minMember);
      const maxMember = createMemberNode('max', 100, TokenType.NUMBER);
      node.children.push(maxMember);

      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('number');
      expect((result as any).min).toBe(0);
      expect((result as any).max).toBe(100);
    });

    test('should fallback to object type for unrecognized structure', () => {
      const node = new ObjectNode();
      // First child has a key (not a type declaration)
      const member = createMemberNode('someKey', 'someValue');
      node.children.push(member);

      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('object');
      expect(result.path).toBe('*');
    });
  });

  describe('Empty ArrayNode (open array form)', () => {
    test('should convert empty ArrayNode to array of any', () => {
      const node = createArrayNode();
      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('array');
      expect(result.path).toBe('*');
      expect(result.of).toEqual({ type: 'any' });
    });

    test('should use custom path for empty array', () => {
      const node = createArrayNode();
      const result = canonicalizeAdditionalProps(node, 'items');

      expect(result.type).toBe('array');
      expect(result.path).toBe('items');
    });
  });

  describe('ArrayNode with type', () => {
    test('should convert [string] to array of strings', () => {
      const node = createArrayNode([createTokenNode('string')]);

      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('array');
      expect(result.path).toBe('*');
      expect(result.of).toEqual({ type: 'string' });
    });

    test('should convert [number] to array of numbers', () => {
      const node = createArrayNode([createTokenNode('number')]);

      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('array');
      expect(result.path).toBe('*');
      expect(result.of).toEqual({ type: 'number' });
    });

    test('should handle non-TokenNode children', () => {
      const node = createArrayNode([new ObjectNode()]);

      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('array');
      expect(result.path).toBe('*');
    });
  });

  describe('Already MemberDef-like objects', () => {
    test('should pass through existing MemberDef with type', () => {
      const memberDef = { type: 'string', minLen: 5 };
      const result = canonicalizeAdditionalProps(memberDef);

      expect(result.type).toBe('string');
      expect(result.path).toBe('*');
      expect((result as any).minLen).toBe(5);
    });

    test('should add path to existing MemberDef', () => {
      const memberDef = { type: 'number', min: 0 };
      const result = canonicalizeAdditionalProps(memberDef, 'customPath');

      expect(result.type).toBe('number');
      expect(result.path).toBe('customPath');
      expect((result as any).min).toBe(0);
    });
  });

  describe('Unknown/fallback cases', () => {
    test('should throw for null input', () => {
      // null is typeof 'object' but accessing .type throws
      expect(() => canonicalizeAdditionalProps(null)).toThrow();
    });

    test('should default to any for undefined', () => {
      const result = canonicalizeAdditionalProps(undefined);

      expect(result.type).toBe('any');
      expect(result.path).toBe('*');
    });

    test('should default to any for primitive values', () => {
      expect(canonicalizeAdditionalProps(123).type).toBe('any');
      expect(canonicalizeAdditionalProps(true).type).toBe('any');
      expect(canonicalizeAdditionalProps('plain string').type).toBe('any');
    });

    test('should default to any for empty object without type', () => {
      const result = canonicalizeAdditionalProps({});

      expect(result.type).toBe('any');
      expect(result.path).toBe('*');
    });
  });

  describe('Edge Cases', () => {
    test('should handle array type as additional props', () => {
      const node = createTokenNode('array');
      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('array');
      expect(result.path).toBe('*');
    });

    test('should handle object type as additional props', () => {
      const node = createTokenNode('object');
      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('object');
      expect(result.path).toBe('*');
    });

    test('should handle any type as additional props', () => {
      const node = createTokenNode('any');
      const result = canonicalizeAdditionalProps(node);

      expect(result.type).toBe('any');
      expect(result.path).toBe('*');
    });

    test('should handle deep path', () => {
      const node = createTokenNode('string');
      const result = canonicalizeAdditionalProps(node, 'a.b.c.d');

      expect(result.path).toBe('a.b.c.d');
    });
  });

  describe('Performance', () => {
    test('should canonicalize many nodes efficiently', () => {
      const nodes = Array.from({ length: 1000 }, () => createTokenNode('string'));

      const startTime = performance.now();
      nodes.forEach(node => canonicalizeAdditionalProps(node));
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
