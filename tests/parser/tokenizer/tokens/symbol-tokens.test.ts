import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

describe("Symbol Token Parsing", () => {
  describe("Structural Symbols", () => {
    it("should parse structural symbols", () => {
      const input = `{ } [ ] : , ~`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(7);
      expect(tokens[0].type).toBe(TokenType.CURLY_OPEN);
      expect(tokens[1].type).toBe(TokenType.CURLY_CLOSE);
      expect(tokens[2].type).toBe(TokenType.BRACKET_OPEN);
      expect(tokens[3].type).toBe(TokenType.BRACKET_CLOSE);
      expect(tokens[4].type).toBe(TokenType.COLON);
      expect(tokens[5].type).toBe(TokenType.COMMA);
      expect(tokens[6].type).toBe(TokenType.COLLECTION_START);
    });

    it("should parse curly braces", () => {
      const input = `{}`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.CURLY_OPEN);
      expect(tokens[0].value).toBe("{");
      expect(tokens[1].type).toBe(TokenType.CURLY_CLOSE);
      expect(tokens[1].value).toBe("}");
    });

    it("should parse square brackets", () => {
      const input = `[]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.BRACKET_OPEN);
      expect(tokens[0].value).toBe("[");
      expect(tokens[1].type).toBe(TokenType.BRACKET_CLOSE);
      expect(tokens[1].value).toBe("]");
    });

    it("should parse colon and comma", () => {
      const input = `:,`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.COLON);
      expect(tokens[0].value).toBe(":");
      expect(tokens[1].type).toBe(TokenType.COMMA);
      expect(tokens[1].value).toBe(",");
    });
  });

  describe("Collection Start Symbol", () => {
    it("should parse collection start symbol", () => {
      const input = `~`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.COLLECTION_START);
      expect(tokens[0].value).toBe("~");
    });

    it("should parse collection start in context", () => {
      const input = `~[1, 2, 3]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens[0].type).toBe(TokenType.COLLECTION_START);
      expect(tokens[0].value).toBe("~");
      expect(tokens[1].type).toBe(TokenType.BRACKET_OPEN);
    });
  });

  describe("Symbol Positioning", () => {
    it("should track symbol positions correctly", () => {
      const input = `{ a : 1 , b : 2 }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens[0].type).toBe(TokenType.CURLY_OPEN);
      expect(tokens[0].pos).toBe(0);
      expect(tokens[0].col).toBe(1);

      expect(tokens[2].type).toBe(TokenType.COLON);
      expect(tokens[2].pos).toBe(4);
      expect(tokens[2].col).toBe(5);

      expect(tokens[4].type).toBe(TokenType.COMMA);
      expect(tokens[4].pos).toBe(8);
      expect(tokens[4].col).toBe(9);

      expect(tokens[8].type).toBe(TokenType.CURLY_CLOSE);
      expect(tokens[8].pos).toBe(16);
      expect(tokens[8].col).toBe(17);
    });
  });

  describe("Symbols in Complex Structures", () => {
    it("should handle nested structures with multiple symbol types", () => {
      const input = `{a: [1, {b: 2}], c: ~[3, 4]}`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const symbolTokens = tokens.filter(t => 
        t.type === TokenType.CURLY_OPEN ||
        t.type === TokenType.CURLY_CLOSE ||
        t.type === TokenType.BRACKET_OPEN ||
        t.type === TokenType.BRACKET_CLOSE ||
        t.type === TokenType.COLON ||
        t.type === TokenType.COMMA ||
        t.type === TokenType.COLLECTION_START
      );

      // Count expected symbols: { : [ , { : } ] , : ~ [ , ] }
      expect(symbolTokens.length).toBeGreaterThan(10);
      
      // Verify we have all symbol types
      const symbolTypes = new Set(symbolTokens.map(t => t.type));
      expect(symbolTypes.has(TokenType.CURLY_OPEN)).toBe(true);
      expect(symbolTypes.has(TokenType.CURLY_CLOSE)).toBe(true);
      expect(symbolTypes.has(TokenType.BRACKET_OPEN)).toBe(true);
      expect(symbolTypes.has(TokenType.BRACKET_CLOSE)).toBe(true);
      expect(symbolTypes.has(TokenType.COLON)).toBe(true);
      expect(symbolTypes.has(TokenType.COMMA)).toBe(true);
      expect(symbolTypes.has(TokenType.COLLECTION_START)).toBe(true);
    });

    it("should handle symbols without spaces", () => {
      const input = `{a:1,b:2}`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(9);
      expect(tokens[0].type).toBe(TokenType.CURLY_OPEN);
      expect(tokens[2].type).toBe(TokenType.COLON);
      expect(tokens[4].type).toBe(TokenType.COMMA);
      expect(tokens[6].type).toBe(TokenType.COLON);
      expect(tokens[8].type).toBe(TokenType.CURLY_CLOSE);
    });

    it("should handle symbols with excessive whitespace", () => {
      const input = `{   a   :   1   ,   b   :   2   }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(9);
      expect(tokens[0].type).toBe(TokenType.CURLY_OPEN);
      expect(tokens[2].type).toBe(TokenType.COLON);
      expect(tokens[4].type).toBe(TokenType.COMMA);
      expect(tokens[6].type).toBe(TokenType.COLON);
      expect(tokens[8].type).toBe(TokenType.CURLY_CLOSE);
    });
  });

  describe("Symbol Token Properties", () => {
    it("should have correct token properties for symbols", () => {
      const input = `{:,}`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      for (const token of tokens) {
        expect(token).toHaveProperty('pos');
        expect(token).toHaveProperty('row');
        expect(token).toHaveProperty('col');
        expect(token).toHaveProperty('token');
        expect(token).toHaveProperty('value');
        expect(token).toHaveProperty('type');
        
        expect(typeof token.pos).toBe('number');
        expect(typeof token.row).toBe('number');
        expect(typeof token.col).toBe('number');
        expect(typeof token.token).toBe('string');
        expect(typeof token.type).toBe('string');
        
        // For symbols, token and value should be the same
        expect(token.token).toBe(token.value);
      }
    });
  });

  describe("Symbol Edge Cases", () => {
    it("should handle symbols at start and end of input", () => {
      const input = `{content}`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens[0].type).toBe(TokenType.CURLY_OPEN);
      expect(tokens[0].pos).toBe(0);
      expect(tokens[tokens.length - 1].type).toBe(TokenType.CURLY_CLOSE);
    });

    it("should handle multiple consecutive symbols", () => {
      const input = `{}[],:~`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(7);
      const expectedTypes = [
        TokenType.CURLY_OPEN,
        TokenType.CURLY_CLOSE,
        TokenType.BRACKET_OPEN,
        TokenType.BRACKET_CLOSE,
        TokenType.COMMA,
        TokenType.COLON,
        TokenType.COLLECTION_START
      ];

      for (let i = 0; i < tokens.length; i++) {
        expect(tokens[i].type).toBe(expectedTypes[i]);
      }
    });
  });
});