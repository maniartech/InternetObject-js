import Tokenizer from "../src/parser/tokenizer";
import TokenType from "../src/parser/tokenizer/token-types";

describe("Tokenizer Error Handling", () => {
  describe("String Error Recovery", () => {
    it("should handle mixed closed and unclosed strings correctly", () => {
      const input = `"unclosed string, "valid string"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3); 
      // First token: closed string "unclosed string, "
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("REGULAR_STRING");
      expect(tokens[0].value).toBe('unclosed string, ');
      
      // Second token: open string "valid string"
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].subType).toBe("OPEN_STRING");
      expect(tokens[1].value).toBe('valid string');
      
      // Third token: error token for the unclosed quote
      expect(tokens[2].type).toBe(TokenType.ERROR);
      expect(tokens[2].value.__error).toBe(true);
      expect(tokens[2].value.message).toContain("string-not-closed");
    });

    it("should handle invalid escape sequences gracefully in regular strings", () => {
      const input = `"valid\\z invalid", "another valid"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3); // string with invalid escape, comma, valid string
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("validz invalid"); // Invalid escape treated as literal
      expect(tokens[1].type).toBe(TokenType.COMMA);
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("another valid");
    });

    it("should handle invalid hex escape sequences gracefully", () => {
      const input = `"valid\\xZZ invalid", "valid"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("validxZZ invalid"); // Invalid hex escape treated as literal
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("valid");
    });

    it("should handle invalid unicode escape sequences gracefully", () => {
      const input = `"valid\\uZZZZ invalid", "valid"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("validuZZZZ invalid"); // Invalid unicode escape treated as literal
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("valid");
    });
  });

  describe("Annotated String Error Recovery", () => {
    it("should handle unclosed raw string correctly", () => {
      const input = `r"unclosed raw, "valid string"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      // First token: raw string that got closed by the first quote it found
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("RAW_STRING");
      expect(tokens[0].value).toBe("unclosed raw, ");
      
      // Second token: open string
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].subType).toBe("OPEN_STRING");
      expect(tokens[1].value).toBe("valid string");
      
      // Third token: error for unclosed quote
      expect(tokens[2].type).toBe(TokenType.ERROR);
      expect(tokens[2].value.__error).toBe(true);
    });

    it("should handle unclosed byte string correctly", () => {
      const input = `b"dGVzdA==, "valid string"`;  // "test" in base64, followed by invalid content
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      // The byte string should fail due to invalid base64 content after the comma
      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect(tokens[0].value.__error).toBe(true);
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].value).toBe("valid string");
      expect(tokens[2].type).toBe(TokenType.ERROR);
      expect(tokens[2].value.__error).toBe(true);
    });

    it("should create error token for invalid base64 in byte string", () => {
      const input = `b"invalid@base64!", "valid string"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      // The byte string parsing should fail and create an error token
      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect(tokens[0].value.__error).toBe(true);
      expect(tokens[1].type).toBe(TokenType.COMMA);
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("valid string");
    });

    it("should create error token for invalid datetime and continue", () => {
      const input = `dt"invalid-date", "valid string"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect(tokens[0].value.__error).toBe(true);
      expect(tokens[1].type).toBe(TokenType.COMMA);
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("valid string");
    });

    it("should create error token for unsupported annotation and continue", () => {
      const input = `xyz"unsupported", "valid string"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(4); // error, parsed string, comma, valid string
      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect(tokens[0].value.__error).toBe(true);
      expect(tokens[0].value.message).toContain("unsupported-annotation");
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].value).toBe("unsupported");
      expect(tokens[2].type).toBe(TokenType.COMMA);
      expect(tokens[3].type).toBe(TokenType.STRING);
      expect(tokens[3].value).toBe("valid string");
    });
  });

  describe("Section Separator Error Recovery", () => {
    it("should create error token for missing schema after separator and continue", () => {
      const input = `--- name: \n valid, content`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // Should have: section separator, section name, error token, then continue with content
      expect(tokens.length).toBeGreaterThan(3);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
      expect(tokens[1].type).toBe(TokenType.STRING);
      expect(tokens[1].subType).toBe(TokenType.SECTION_NAME);
      expect(tokens[2].type).toBe(TokenType.ERROR);
      expect(tokens[2].value.__error).toBe(true);
      expect(tokens[2].value.message).toContain("schema-missing");
    });
  });

  describe("Mixed Valid and Invalid Content", () => {
    it("should handle complex document with multiple error types", () => {
      const input = `{
        valid: "string",
        number: 42,
        validArray: [1, 2, 3]
      }`;
      
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // Should parse valid parts correctly
      const numberTokens = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numberTokens.length).toBeGreaterThanOrEqual(4); // 42, 1, 2, 3
      
      const stringTokens = tokens.filter(t => t.type === TokenType.STRING);
      expect(stringTokens.length).toBeGreaterThan(0);
    });

    it("should continue tokenizing after encountering errors", () => {
      const input = `xyz"error", "valid"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const errorTokens = tokens.filter(t => t.type === TokenType.ERROR);
      const validTokens = tokens.filter(t => t.type === TokenType.STRING && !t.value.__error);
      
      expect(errorTokens.length).toBeGreaterThan(0);
      expect(validTokens.length).toBeGreaterThan(0);
      
      // Should still find the valid string at the end
      const lastValidToken = validTokens.find(t => t.value === "valid");
      expect(lastValidToken).toBeDefined();
    });
  });

  describe("Error Token Structure", () => {
    it("should create error tokens with correct structure", () => {
      const input = `xyz"test"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const errorToken = tokens.find(t => t.type === TokenType.ERROR);
      expect(errorToken).toBeDefined();
      
      expect(errorToken!.type).toBe(TokenType.ERROR);
      expect(errorToken!.value).toHaveProperty("__error", true);
      expect(errorToken!.value).toHaveProperty("message");
      expect(errorToken!.value).toHaveProperty("originalError");
      expect(typeof errorToken!.value.message).toBe("string");
      expect(errorToken!.value.originalError).toBeInstanceOf(Error);
      
      // Should have valid position information
      expect(errorToken!.pos).toBeGreaterThanOrEqual(0);
      expect(errorToken!.row).toBeGreaterThanOrEqual(1);
      expect(errorToken!.col).toBeGreaterThanOrEqual(1);
      expect(typeof errorToken!.token).toBe("string");
    });
  });
});