import ArrayNode from "../../../src/parser/nodes/array";
import TokenNode from "../../../src/parser/nodes/tokens";
import ObjectNode from "../../../src/parser/nodes/objects";
import MemberNode from "../../../src/parser/nodes/members";
import Token from "../../../src/parser/tokenizer/tokens";
import TokenType from "../../../src/parser/tokenizer/token-types";

describe("ArrayNode", () => {
  // Helper function to create a mock token
  const createMockToken = (type: TokenType, value: any, pos: number = 0): Token => {
    const token = new Token();
    token.type = type;
    token.value = value;
    token.token = value.toString();
    token.pos = pos;
    token.row = 1;
    token.col = pos + 1;
    return token;
  };

  describe("Constructor", () => {
    it("should create ArrayNode with empty children", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 1);
      
      const arrayNode = new ArrayNode([], openBracket, closeBracket);
      
      expect(arrayNode.children).toHaveLength(0);
      expect(arrayNode.openBracket).toBe(openBracket);
      expect(arrayNode.closeBracket).toBe(closeBracket);
      expect(arrayNode.type).toBe("array");
    });

    it("should create ArrayNode with token children", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 10);
      
      const token1 = createMockToken(TokenType.NUMBER, 1, 1);
      const token2 = createMockToken(TokenType.STRING, "hello", 3);
      const tokenNode1 = new TokenNode(token1);
      const tokenNode2 = new TokenNode(token2);
      
      const arrayNode = new ArrayNode([tokenNode1, tokenNode2], openBracket, closeBracket);
      
      expect(arrayNode.children).toHaveLength(2);
      expect(arrayNode.children[0]).toBe(tokenNode1);
      expect(arrayNode.children[1]).toBe(tokenNode2);
    });

    it("should create ArrayNode with mixed node types", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 20);
      
      const tokenNode = new TokenNode(createMockToken(TokenType.NUMBER, 42, 1));
      const objectNode = new ObjectNode([]);
      
      const arrayNode = new ArrayNode([tokenNode, objectNode], openBracket, closeBracket);
      
      expect(arrayNode.children).toHaveLength(2);
      expect(arrayNode.children[0]).toBe(tokenNode);
      expect(arrayNode.children[1]).toBe(objectNode);
    });

    it("should handle undefined children", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 5);
      
      const tokenNode = new TokenNode(createMockToken(TokenType.NUMBER, 1, 1));
      
      const arrayNode = new ArrayNode([tokenNode, undefined], openBracket, closeBracket);
      
      expect(arrayNode.children).toHaveLength(2);
      expect(arrayNode.children[0]).toBe(tokenNode);
      expect(arrayNode.children[1]).toBeUndefined();
    });
  });

  describe("toValue", () => {
    it("should convert array of primitives to JavaScript array", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 15);
      
      const token1 = new TokenNode(createMockToken(TokenType.NUMBER, 1, 1));
      const token2 = new TokenNode(createMockToken(TokenType.STRING, "hello", 3));
      const token3 = new TokenNode(createMockToken(TokenType.BOOLEAN, true, 10));
      
      const arrayNode = new ArrayNode([token1, token2, token3], openBracket, closeBracket);
      const result = arrayNode.toValue();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([1, "hello", true]);
    });

    it("should convert array with objects", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 20);
      
      const nameToken = new TokenNode(createMockToken(TokenType.STRING, "Alice", 5));
      const ageToken = new TokenNode(createMockToken(TokenType.NUMBER, 25, 15));
      
      const nameMember = new MemberNode(nameToken, new TokenNode(createMockToken(TokenType.STRING, "name", 2)));
      const ageMember = new MemberNode(ageToken, new TokenNode(createMockToken(TokenType.STRING, "age", 12)));
      
      const objectNode = new ObjectNode([nameMember, ageMember]);
      const arrayNode = new ArrayNode([objectNode], openBracket, closeBracket);
      
      const result = arrayNode.toValue();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });

    it("should handle undefined children in toValue", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 10);
      
      const token1 = new TokenNode(createMockToken(TokenType.NUMBER, 1, 1));
      
      const arrayNode = new ArrayNode([token1, undefined], openBracket, closeBracket);
      const result = arrayNode.toValue();
      
      expect(result).toEqual([1, undefined]);
    });

    it("should handle nested arrays", () => {
      const openBracket1 = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket1 = createMockToken(TokenType.BRACKET_CLOSE, "]", 15);
      const openBracket2 = createMockToken(TokenType.BRACKET_OPEN, "[", 2);
      const closeBracket2 = createMockToken(TokenType.BRACKET_CLOSE, "]", 8);
      
      const innerToken = new TokenNode(createMockToken(TokenType.NUMBER, 42, 4));
      const innerArray = new ArrayNode([innerToken], openBracket2, closeBracket2);
      const outerArray = new ArrayNode([innerArray], openBracket1, closeBracket1);
      
      const result = outerArray.toValue();
      expect(result).toEqual([[42]]);
    });

    it("should handle non-node values", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 10);
      
      // Simulate non-node values (like null, undefined, primitives)
      const arrayNode = new ArrayNode([null as any, undefined as any], openBracket, closeBracket);
      const result = arrayNode.toValue();
      
      expect(result).toEqual([null, undefined]);
    });
  });

  describe("Position Tracking", () => {
    it("should return correct start position from open bracket", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 5);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 15);
      
      const arrayNode = new ArrayNode([], openBracket, closeBracket);
      const startPos = arrayNode.getStartPos();
      
      expect(startPos.pos).toBe(5);
      expect(startPos.row).toBe(1);
      expect(startPos.col).toBe(6);
    });

    it("should return correct end position from close bracket", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 5);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 15);
      closeBracket.row = 2;
      closeBracket.col = 5;
      
      const arrayNode = new ArrayNode([], openBracket, closeBracket);
      const endPos = arrayNode.getEndPos();
      
      expect(endPos.pos).toBe(16); // pos + token length ("]" = 1)
      expect(endPos.row).toBe(2);
      expect(endPos.col).toBe(6); // col + token length
    });

    it("should track positions correctly with content", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 20);
      
      const token1 = new TokenNode(createMockToken(TokenType.NUMBER, 1, 2));
      const token2 = new TokenNode(createMockToken(TokenType.NUMBER, 2, 5));
      
      const arrayNode = new ArrayNode([token1, token2], openBracket, closeBracket);
      
      expect(arrayNode.getStartPos().pos).toBe(0);
      expect(arrayNode.getEndPos().pos).toBe(21); // pos + token length ("]" = 1)
    });
  });

  describe("Inheritance from ContainerNode", () => {
    it("should inherit type property", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 5);
      
      const arrayNode = new ArrayNode([], openBracket, closeBracket);
      
      expect(arrayNode.type).toBe("array");
    });

    it("should inherit children property", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 10);
      
      const token = new TokenNode(createMockToken(TokenType.NUMBER, 42, 2));
      const arrayNode = new ArrayNode([token], openBracket, closeBracket);
      
      expect(arrayNode.children).toHaveLength(1);
      expect(arrayNode.children[0]).toBe(token);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty array", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 1);
      
      const arrayNode = new ArrayNode([], openBracket, closeBracket);
      
      expect(arrayNode.children).toHaveLength(0);
      expect(arrayNode.toValue()).toEqual([]);
    });

    it("should handle array with only undefined values", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 5);
      
      const arrayNode = new ArrayNode([undefined, undefined], openBracket, closeBracket);
      
      expect(arrayNode.children).toHaveLength(2);
      expect(arrayNode.toValue()).toEqual([undefined, undefined]);
    });

    it("should handle large arrays", () => {
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 0);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 100);
      
      const children = Array.from({ length: 100 }, (_, i) => 
        new TokenNode(createMockToken(TokenType.NUMBER, i, i + 1))
      );
      
      const arrayNode = new ArrayNode(children, openBracket, closeBracket);
      
      expect(arrayNode.children).toHaveLength(100);
      expect(arrayNode.toValue()).toHaveLength(100);
      expect(arrayNode.toValue()[0]).toBe(0);
      expect(arrayNode.toValue()[99]).toBe(99);
    });
  });
});