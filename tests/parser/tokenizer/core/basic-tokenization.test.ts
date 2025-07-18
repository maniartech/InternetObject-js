import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

describe("Basic Tokenization", () => {
  describe("Tokenizer Initialization", () => {
    it("should initialize tokenizer with input string", () => {
      const input = "test input";
      const tokenizer = new Tokenizer(input);
      expect(tokenizer).toBeDefined();
    });

    it("should handle empty input", () => {
      const input = "";
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      expect(tokens).toHaveLength(0);
    });
  });

  describe("Basic Token Recognition", () => {
    it("should tokenize simple mixed content", () => {
      const input = `hello, 123, true`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("hello");
      expect(tokens[1].type).toBe(TokenType.COMMA);
      expect(tokens[2].type).toBe(TokenType.NUMBER);
      expect(tokens[2].value).toBe(123);
      expect(tokens[3].type).toBe(TokenType.COMMA);
      expect(tokens[4].type).toBe(TokenType.BOOLEAN);
      expect(tokens[4].value).toBe(true);
    });

    it("should tokenize various value types", () => {
      const input = `a, b:c, c, d, 10, -9, -0xFF, T, F, N, "\ud83d\ude00", "😀", hello`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // Verify we have a mix of different token types
      const tokenTypes = new Set(tokens.map(t => t.type));
      expect(tokenTypes.has(TokenType.STRING)).toBe(true);
      expect(tokenTypes.has(TokenType.NUMBER)).toBe(true);
      expect(tokenTypes.has(TokenType.BOOLEAN)).toBe(true);
      expect(tokenTypes.has(TokenType.NULL)).toBe(true);
      expect(tokenTypes.has(TokenType.COLON)).toBe(true);
      expect(tokenTypes.has(TokenType.COMMA)).toBe(true);
    });
  });

  describe("Whitespace Handling", () => {
    it("should handle input with only whitespace", () => {
      const input = `   \n\t  \r\n  `;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(0);
    });

    it("should skip whitespace between tokens", () => {
      const input = `  hello   ,   world  `;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("hello");
      expect(tokens[1].type).toBe(TokenType.COMMA);
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("world");
    });
  });

  describe("Comment Handling", () => {
    it("should handle input with only comments", () => {
      const input = `# This is a comment
      # Another comment`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(0);
    });

    it("should skip comments and tokenize remaining content", () => {
      const input = `hello # comment
      world`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("hello");
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].value).toBe("world");
    });
  });

  describe("Token Structure", () => {
    it("should create tokens with correct structure", () => {
      const input = `"test"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      const token = tokens[0];
      
      expect(token).toHaveProperty('pos');
      expect(token).toHaveProperty('row');
      expect(token).toHaveProperty('col');
      expect(token).toHaveProperty('token');
      expect(token).toHaveProperty('value');
      expect(token).toHaveProperty('type');
      expect(token).toHaveProperty('subType');
      
      expect(typeof token.pos).toBe('number');
      expect(typeof token.row).toBe('number');
      expect(typeof token.col).toBe('number');
      expect(typeof token.token).toBe('string');
      expect(typeof token.type).toBe('string');
    });
  });
});