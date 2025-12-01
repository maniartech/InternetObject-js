import MemberNode from "../../../src/parser/nodes/members";
import TokenNode from "../../../src/parser/nodes/tokens";
import ObjectNode from "../../../src/parser/nodes/objects";
import ArrayNode from "../../../src/parser/nodes/array";
import Token from "../../../src/parser/tokenizer/tokens";
import TokenType from "../../../src/parser/tokenizer/token-types";
import Definitions from "../../../src/core/definitions";
import { Position } from "../../../src/core/positions";

describe("MemberNode", () => {
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
    it("should create MemberNode with value only (no key)", () => {
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "hello", 0));
      const member = new MemberNode(valueToken);

      expect(member.type).toBe("member");
      expect(member.value).toBe(valueToken);
      expect(member.key).toBeUndefined();
    });

    it("should create MemberNode with both key and value", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "name", 0));
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "Alice", 5));
      const member = new MemberNode(valueToken, keyToken);

      expect(member.type).toBe("member");
      expect(member.value).toBe(valueToken);
      expect(member.key).toBe(keyToken);
    });

    it("should create MemberNode with object value", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "user", 0));
      const objectValue = new ObjectNode([]);
      const member = new MemberNode(objectValue, keyToken);

      expect(member.type).toBe("member");
      expect(member.value).toBe(objectValue);
      expect(member.key).toBe(keyToken);
    });

    it("should create MemberNode with array value", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "items", 0));
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 5);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 10);
      const arrayValue = new ArrayNode([], openBracket, closeBracket);
      const member = new MemberNode(arrayValue, keyToken);

      expect(member.type).toBe("member");
      expect(member.value).toBe(arrayValue);
      expect(member.key).toBe(keyToken);
    });
  });

  describe("toValue", () => {
    it("should return value directly when no key", () => {
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "hello", 0));
      const member = new MemberNode(valueToken);

      const result = member.toValue();
      expect(result).toBe("hello");
    });

    it("should return key-value object when key exists", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "name", 0));
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "Alice", 5));
      const member = new MemberNode(valueToken, keyToken);

      const result = member.toValue();
      expect(result).toEqual({ name: "Alice" });
    });

    it("should handle numeric keys", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.NUMBER, 42, 0));
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "answer", 5));
      const member = new MemberNode(valueToken, keyToken);

      const result = member.toValue();
      expect(result).toEqual({ 42: "answer" });
    });

    it("should handle boolean keys", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.BOOLEAN, true, 0));
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "yes", 5));
      const member = new MemberNode(valueToken, keyToken);

      const result = member.toValue();
      expect(result).toEqual({ true: "yes" });
    });

    it("should handle null keys", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.NULL, null, 0));
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "nothing", 5));
      const member = new MemberNode(valueToken, keyToken);

      const result = member.toValue();
      expect(result).toEqual({ null: "nothing" });
    });

    it("should handle object values with keys", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "user", 0));
      const innerMember = new MemberNode(
        new TokenNode(createMockToken(TokenType.STRING, "Alice", 10)),
        new TokenNode(createMockToken(TokenType.STRING, "name", 5))
      );
      const objectValue = new ObjectNode([innerMember]);
      const member = new MemberNode(objectValue, keyToken);

      const result = member.toValue();
      expect(result).toHaveProperty("user");
      expect(typeof result.user).toBe("object");
    });

    it("should handle array values with keys", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "numbers", 0));
      const openBracket = createMockToken(TokenType.BRACKET_OPEN, "[", 5);
      const closeBracket = createMockToken(TokenType.BRACKET_CLOSE, "]", 15);
      const item1 = new TokenNode(createMockToken(TokenType.NUMBER, 1, 7));
      const item2 = new TokenNode(createMockToken(TokenType.NUMBER, 2, 10));
      const arrayValue = new ArrayNode([item1, item2], openBracket, closeBracket);
      const member = new MemberNode(arrayValue, keyToken);

      const result = member.toValue();
      expect(result).toEqual({ numbers: [1, 2] });
    });

    it("should pass definitions to value conversion", () => {
          const defs = new Definitions();
          defs.set("@testVar", "resolved value");

          const keyToken = new TokenNode(createMockToken(TokenType.STRING, "key", 0));
          const valueToken = new TokenNode(createMockToken(TokenType.STRING, "@testVar", 5));
          const member = new MemberNode(valueToken, keyToken);

          const result = member.toValue(defs);
          expect(result).toEqual({ key: "resolved value" });
        });
  });

  describe("Position Tracking", () => {
    it("should return key start position when key exists", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "name", 5));
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "Alice", 15));
      const member = new MemberNode(valueToken, keyToken);

      const startPos = member.getStartPos();
      expect(startPos.pos).toBe(5);
      expect(startPos.row).toBe(1);
      expect(startPos.col).toBe(6);
    });

    it("should return value start position when no key", () => {
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "Alice", 10));
      const member = new MemberNode(valueToken);

      const startPos = member.getStartPos();
      expect(startPos.pos).toBe(10);
      expect(startPos.row).toBe(1);
      expect(startPos.col).toBe(11);
    });

    it("should return value end position when value exists", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "name", 5));
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "Alice", 15));
      valueToken.row = 2;
      valueToken.col = 10;
      const member = new MemberNode(valueToken, keyToken);

      const endPos = member.getEndPos();
      expect(endPos.pos).toBe(20); // pos + token length ("Alice" = 5)
      expect(endPos.row).toBe(2);
      expect(endPos.col).toBe(15); // col + token length
    });

    it("should return key end position when no value", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "name", 5));
      keyToken.row = 1;
      keyToken.col = 10;

      // Create a member with null value (edge case)
      const member = new MemberNode(null as any, keyToken);

      const endPos = member.getEndPos();
      expect(endPos.pos).toBe(9); // pos + token length ("name" = 4)
      expect(endPos.row).toBe(1);
      expect(endPos.col).toBe(14); // col + token length
    });

    it("should return default position when no key and no value", () => {
      // Edge case - both key and value are null
      const member = new MemberNode(null as any);

      const endPos = member.getEndPos();
      expect(endPos).toEqual(Position.unknown);
    });

    it("should handle complex value positions", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "data", 0));

      // Create object with known position
      const innerMember = new MemberNode(
        new TokenNode(createMockToken(TokenType.STRING, "value", 20))
      );
      const objectValue = new ObjectNode([innerMember]);
      const member = new MemberNode(objectValue, keyToken);

      const startPos = member.getStartPos();
      const endPos = member.getEndPos();

      expect(startPos.pos).toBe(0); // Key position
      expect(endPos).toEqual(objectValue.getEndPos()); // Object end position
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string key", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "", 0));
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "value", 5));
      const member = new MemberNode(valueToken, keyToken);

      const result = member.toValue();
      expect(result).toEqual({ "": "value" });
    });

    it("should handle empty string value", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "key", 0));
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "", 5));
      const member = new MemberNode(valueToken, keyToken);

      const result = member.toValue();
      expect(result).toEqual({ key: "" });
    });

    it("should handle undefined value in toValue", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "key", 0));
      const valueToken = new TokenNode(createMockToken(TokenType.UNDEFINED, undefined, 5));
      const member = new MemberNode(valueToken, keyToken);

      const result = member.toValue();
      expect(result).toEqual({ key: undefined });
    });

    it("should handle null value in toValue", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "key", 0));
      const valueToken = new TokenNode(createMockToken(TokenType.NULL, null, 5));
      const member = new MemberNode(valueToken, keyToken);

      const result = member.toValue();
      expect(result).toEqual({ key: null });
    });

    it("should handle special characters in keys", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "key-with-dashes_and_underscores", 0));
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "value", 30));
      const member = new MemberNode(valueToken, keyToken);

      const result = member.toValue();
      expect(result).toEqual({ "key-with-dashes_and_underscores": "value" });
    });

    it("should handle very long keys and values", () => {
      const longKey = "a".repeat(1000);
      const longValue = "b".repeat(1000);

      const keyToken = new TokenNode(createMockToken(TokenType.STRING, longKey, 0));
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, longValue, 1000));
      const member = new MemberNode(valueToken, keyToken);

      const result = member.toValue();
      expect(result[longKey]).toBe(longValue);
    });
  });

  describe("Type Consistency", () => {
    it("should maintain type property", () => {
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "test", 0));
      const member = new MemberNode(valueToken);

      expect(member.type).toBe("member");
    });

    it("should maintain type property with key", () => {
      const keyToken = new TokenNode(createMockToken(TokenType.STRING, "key", 0));
      const valueToken = new TokenNode(createMockToken(TokenType.STRING, "value", 5));
      const member = new MemberNode(valueToken, keyToken);

      expect(member.type).toBe("member");
    });
  });
});