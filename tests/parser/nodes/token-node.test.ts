import TokenNode from "../../../src/parser/nodes/tokens";
import Token from "../../../src/parser/tokenizer/tokens";
import TokenType from "../../../src/parser/tokenizer/token-types";
import Definitions from "../../../src/core/definitions";

describe("TokenNode", () => {
  // Helper function to create a mock token
  const createMockToken = (type: TokenType, value: any, pos: number = 0): Token => {
    const token = new Token();
    token.type = type;
    token.value = value;
    token.token = value === null ? "null" : value === undefined ? "undefined" : value.toString();
    token.pos = pos;
    token.row = 1;
    token.col = pos + 1;
    return token;
  };

  describe("Constructor", () => {
    it("should create TokenNode from Token", () => {
      const originalToken = createMockToken(TokenType.STRING, "hello", 5);
      const tokenNode = new TokenNode(originalToken);

      expect(tokenNode.type).toBe(TokenType.STRING);
      expect(tokenNode.value).toBe("hello");
      expect(tokenNode.token).toBe("hello");
      expect(tokenNode.pos).toBe(5);
      expect(tokenNode.row).toBe(1);
      expect(tokenNode.col).toBe(6);
    });

    it("should copy all properties from original token", () => {
      const originalToken = createMockToken(TokenType.NUMBER, 42, 10);
      originalToken.row = 2;
      originalToken.col = 15;
      originalToken.subType = TokenType.DECIMAL;

      const tokenNode = new TokenNode(originalToken);

      expect(tokenNode.type).toBe(TokenType.NUMBER);
      expect(tokenNode.value).toBe(42);
      expect(tokenNode.token).toBe("42");
      expect(tokenNode.pos).toBe(10);
      expect(tokenNode.row).toBe(2);
      expect(tokenNode.col).toBe(15);
      expect(tokenNode.subType).toBe(TokenType.DECIMAL);
    });

    it("should handle boolean tokens", () => {
      const originalToken = createMockToken(TokenType.BOOLEAN, true, 0);
      const tokenNode = new TokenNode(originalToken);

      expect(tokenNode.type).toBe(TokenType.BOOLEAN);
      expect(tokenNode.value).toBe(true);
      expect(tokenNode.token).toBe("true");
    });

    it("should handle null tokens", () => {
      const originalToken = createMockToken(TokenType.NULL, null, 0);
      const tokenNode = new TokenNode(originalToken);

      expect(tokenNode.type).toBe(TokenType.NULL);
      expect(tokenNode.value).toBeNull();
      expect(tokenNode.token).toBe("null");
    });

    it("should handle undefined tokens", () => {
      const originalToken = createMockToken(TokenType.UNDEFINED, undefined, 0);
      const tokenNode = new TokenNode(originalToken);

      expect(tokenNode.type).toBe(TokenType.UNDEFINED);
      expect(tokenNode.value).toBeUndefined();
      expect(tokenNode.token).toBe("undefined");
    });
  });

  describe("toValue without definitions", () => {
    it("should return string value for string tokens", () => {
      const token = createMockToken(TokenType.STRING, "hello world", 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue();
      expect(result).toBe("hello world");
    });

    it("should return number value for number tokens", () => {
      const token = createMockToken(TokenType.NUMBER, 42, 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue();
      expect(result).toBe(42);
    });

    it("should return boolean value for boolean tokens", () => {
      const trueToken = createMockToken(TokenType.BOOLEAN, true, 0);
      const falseToken = createMockToken(TokenType.BOOLEAN, false, 5);

      const trueNode = new TokenNode(trueToken);
      const falseNode = new TokenNode(falseToken);

      expect(trueNode.toValue()).toBe(true);
      expect(falseNode.toValue()).toBe(false);
    });

    it("should return null for null tokens", () => {
      const token = createMockToken(TokenType.NULL, null, 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue();
      expect(result).toBeNull();
    });

    it("should return undefined for undefined tokens", () => {
      const token = createMockToken(TokenType.UNDEFINED, undefined, 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue();
      expect(result).toBeUndefined();
    });

    it("should return bigint value for bigint tokens", () => {
      const token = createMockToken(TokenType.BIGINT, BigInt(123456789012345), 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue();
      expect(result).toBe(BigInt(123456789012345));
    });

    it("should return decimal value for decimal tokens", () => {
      const token = createMockToken(TokenType.DECIMAL, 3.14159, 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue();
      expect(result).toBe(3.14159);
    });

    it("should return datetime value for datetime tokens", () => {
      const dateValue = new Date("2023-01-01T00:00:00Z");
      const token = createMockToken(TokenType.DATETIME, dateValue, 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue();
      expect(result).toBe(dateValue);
    });
  });

  describe("toValue with definitions", () => {
    it("should resolve string references when definitions provided", () => {
      const defs = new Definitions();
      defs.set("@userName", "Alice");

      const token = createMockToken(TokenType.STRING, "@userName", 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue(defs);
      expect(result).toBe("Alice");
    });

    it("should return original string when not found in definitions", () => {
      const defs = new Definitions();
      defs.set("@userName", "Alice");

      const token = createMockToken(TokenType.STRING, "unknownVar", 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue(defs);
      expect(result).toBe("unknownVar");
    });

    it("should return original string when definitions is empty", () => {
      const defs = new Definitions();

      const token = createMockToken(TokenType.STRING, "someString", 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue(defs);
      expect(result).toBe("someString");
    });

    it("should not resolve non-string tokens even with definitions", () => {
      const defs = new Definitions();
      defs.set("@42", "should not resolve");

      const token = createMockToken(TokenType.NUMBER, 42, 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue(defs);
      expect(result).toBe(42);
    });

    it("should handle complex variable resolution", () => {
      const defs = new Definitions();
      defs.set("@city", "New York");
      defs.set("@country", "USA");
      defs.set("@fullLocation", "New York, USA");

      const cityToken = createMockToken(TokenType.STRING, "@city", 0);
      const countryToken = createMockToken(TokenType.STRING, "@country", 5);
      const fullToken = createMockToken(TokenType.STRING, "@fullLocation", 10);

      const cityNode = new TokenNode(cityToken);
      const countryNode = new TokenNode(countryToken);
      const fullNode = new TokenNode(fullToken);

      expect(cityNode.toValue(defs)).toBe("New York");
      expect(countryNode.toValue(defs)).toBe("USA");
      expect(fullNode.toValue(defs)).toBe("New York, USA");
    });

    it("should handle undefined values in definitions", () => {
      // When value is undefined, it should return the original token value

      const defs = new Definitions();
      defs.set("@undefinedVar", undefined);

      const token = createMockToken(TokenType.STRING, "@undefinedVar", 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue(defs);
      expect(result).toBe("@undefinedVar");

    });

    it("should handle null values in definitions", () => {
      const defs = new Definitions();
      defs.set("@nullVar", null);

      const token = createMockToken(TokenType.STRING, "@nullVar", 0);
      const tokenNode = new TokenNode(token);

      const result = tokenNode.toValue(defs);
      expect(result).toBeNull();
    });
  });

  describe("Position Tracking", () => {
    it("should inherit position methods from Token", () => {
      const token = createMockToken(TokenType.STRING, "test", 10);
      token.row = 2;
      token.col = 15;
      const tokenNode = new TokenNode(token);

      // TokenNode should inherit position methods from Token
      expect(tokenNode.pos).toBe(10);
      expect(tokenNode.row).toBe(2);
      expect(tokenNode.col).toBe(15);
    });

    it("should maintain position information after construction", () => {
      const token = createMockToken(TokenType.NUMBER, 123, 25);
      token.row = 3;
      token.col = 8;
      const tokenNode = new TokenNode(token);

      expect(tokenNode.pos).toBe(25);
      expect(tokenNode.row).toBe(3);
      expect(tokenNode.col).toBe(8);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string tokens", () => {
      const token = createMockToken(TokenType.STRING, "", 0);
      const tokenNode = new TokenNode(token);

      expect(tokenNode.toValue()).toBe("");
    });

    it("should handle zero number tokens", () => {
      const token = createMockToken(TokenType.NUMBER, 0, 0);
      const tokenNode = new TokenNode(token);

      expect(tokenNode.toValue()).toBe(0);
    });

    it("should handle negative number tokens", () => {
      const token = createMockToken(TokenType.NUMBER, -42, 0);
      const tokenNode = new TokenNode(token);

      expect(tokenNode.toValue()).toBe(-42);
    });

    it("should handle floating point number tokens", () => {
      const token = createMockToken(TokenType.NUMBER, 3.14159, 0);
      const tokenNode = new TokenNode(token);

      expect(tokenNode.toValue()).toBe(3.14159);
    });

    it("should handle very large numbers", () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      const token = createMockToken(TokenType.NUMBER, largeNumber, 0);
      const tokenNode = new TokenNode(token);

      expect(tokenNode.toValue()).toBe(largeNumber);
    });

    it("should handle very small numbers", () => {
      const smallNumber = Number.MIN_SAFE_INTEGER;
      const token = createMockToken(TokenType.NUMBER, smallNumber, 0);
      const tokenNode = new TokenNode(token);

      expect(tokenNode.toValue()).toBe(smallNumber);
    });

    it("should handle special string characters", () => {
      const specialString = "Hello\nWorld\t\"quoted\"\r\n";
      const token = createMockToken(TokenType.STRING, specialString, 0);
      const tokenNode = new TokenNode(token);

      expect(tokenNode.toValue()).toBe(specialString);
    });

    it("should handle unicode strings", () => {
      const unicodeString = "Hello 世界 🌍 café";
      const token = createMockToken(TokenType.STRING, unicodeString, 0);
      const tokenNode = new TokenNode(token);

      expect(tokenNode.toValue()).toBe(unicodeString);
    });

    it("should handle very long strings", () => {
      const longString = "a".repeat(10000);
      const token = createMockToken(TokenType.STRING, longString, 0);
      const tokenNode = new TokenNode(token);

      expect(tokenNode.toValue()).toBe(longString);
    });
  });

  describe("Type Consistency", () => {
    it("should maintain all token properties", () => {
      const originalToken = createMockToken(TokenType.STRING, "test", 5);
      originalToken.subType = TokenType.SECTION_NAME;
      originalToken.row = 2;
      originalToken.col = 10;

      const tokenNode = new TokenNode(originalToken);

      // Should have all the same properties as the original token
      expect(tokenNode.type).toBe(originalToken.type);
      expect(tokenNode.value).toBe(originalToken.value);
      expect(tokenNode.token).toBe(originalToken.token);
      expect(tokenNode.pos).toBe(originalToken.pos);
      expect(tokenNode.row).toBe(originalToken.row);
      expect(tokenNode.col).toBe(originalToken.col);
      expect(tokenNode.subType).toBe(originalToken.subType);
    });

    it("should be instance of both TokenNode and Token", () => {
      const token = createMockToken(TokenType.STRING, "test", 0);
      const tokenNode = new TokenNode(token);

      expect(tokenNode).toBeInstanceOf(TokenNode);
      expect(tokenNode).toBeInstanceOf(Token);
    });
  });

  describe("Variable Resolution Edge Cases", () => {
    it("should handle circular references gracefully", () => {
      const defs = new Definitions();
      // This would create a circular reference if not handled properly
      defs.set("@var1", "var2");
      defs.set("@var2", "var1");

      const token = createMockToken(TokenType.STRING, "@var1", 0);
      const tokenNode = new TokenNode(token);

      // Should return the resolved value (var2) not cause infinite loop
      const result = tokenNode.toValue(defs);
      expect(result).toBe("var2");
    });

    it("should handle case-sensitive variable names", () => {
      const defs = new Definitions();
      defs.set("@Variable", "uppercase");
      defs.set("@variable", "lowercase");

      const upperToken = createMockToken(TokenType.STRING, "@Variable", 0);
      const lowerToken = createMockToken(TokenType.STRING, "@variable", 5);

      const upperNode = new TokenNode(upperToken);
      const lowerNode = new TokenNode(lowerToken);

      expect(upperNode.toValue(defs)).toBe("uppercase");
      expect(lowerNode.toValue(defs)).toBe("lowercase");
    });
  });
});