import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

describe("Edge Cases and Boundary Conditions", () => {
  describe("Empty and Minimal Input", () => {
    it("should handle empty input", () => {
      const input = ``;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(0);
    });

    it("should handle input with only whitespace", () => {
      const input = `   \n\t  \r\n  `;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(0);
    });

    it("should handle input with only comments", () => {
      const input = `# This is a comment
      # Another comment`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(0);
    });

    it("should handle single character inputs", () => {
      const singleChars = ['{', '}', '[', ']', ':', ',', '~'];
      
      for (const char of singleChars) {
        const tokenizer = new Tokenizer(char);
        const tokens = tokenizer.tokenize();
        
        expect(tokens).toHaveLength(1);
        expect(tokens[0].value).toBe(char);
      }
      
      // Handle quote characters separately as they create error tokens when unclosed
      const quoteChars = ['"', "'"];
      for (const char of quoteChars) {
        const tokenizer = new Tokenizer(char);
        const tokens = tokenizer.tokenize();
        
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe(TokenType.ERROR);
      }
    });

    it("should handle minimal valid structures", () => {
      const minimalInputs = ['{}', '[]', '""', "''", 'a', '1', 'T', 'N'];
      
      for (const input of minimalInputs) {
        const tokenizer = new Tokenizer(input);
        const tokens = tokenizer.tokenize();
        
        expect(tokens.length).toBeGreaterThan(0);
        expect(tokens[0]).toHaveProperty('type');
        expect(tokens[0]).toHaveProperty('value');
      }
    });
  });

  describe("Very Large Input", () => {
    it("should handle very long strings", () => {
      const longString = "a".repeat(10000);
      const input = `"${longString}"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe(longString);
      expect(tokens[0].value.length).toBe(10000);
    });

    it("should handle very large numbers", () => {
      const largeNumber = "1" + "0".repeat(100);
      const input = `${largeNumber}n`; // BigInt to handle very large numbers
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.BIGINT);
      expect(typeof tokens[0].value).toBe('bigint');
    });

    it("should handle input with many tokens", () => {
      // Create an array with 1000 elements
      let input = "[";
      for (let i = 0; i < 1000; i++) {
        input += i.toString();
        if (i < 999) input += ", ";
      }
      input += "]";

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBe(2001); // 1000 numbers + 999 commas + 2 brackets (actual behavior)
      
      const numberTokens = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numberTokens).toHaveLength(1000);
    });

    it("should handle deeply nested structures", () => {
      const input = `{a: {b: {c: {d: "deep"}}}}`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const openBraces = tokens.filter(t => t.type === TokenType.CURLY_OPEN);
      const closeBraces = tokens.filter(t => t.type === TokenType.CURLY_CLOSE);
      
      expect(openBraces).toHaveLength(4);
      expect(closeBraces).toHaveLength(4);
    });
  });

  describe("Unicode and Special Characters", () => {
    it("should handle various Unicode characters", () => {
      const input = `"Hello 世界 🌍", "Здравствуй мир", "مرحبا بالعالم"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("Hello 世界 🌍");
      expect(tokens[2].value).toBe("Здравствуй мир");
      expect(tokens[4].value).toBe("مرحبا بالعالم");
    });

    it("should handle emoji in various contexts", () => {
      const input = `{
        emoji: "😀😃😄😁",
        mixed: "text 🌟 more text",
        key🔑: "value"
      }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const emojiString = tokens.find(t => t.value === "😀😃😄😁");
      const mixedString = tokens.find(t => t.value === "text 🌟 more text");
      const emojiKey = tokens.find(t => t.value === "key🔑");

      expect(emojiString).toBeDefined();
      expect(mixedString).toBeDefined();
      expect(emojiKey).toBeDefined();
    });

    it("should handle zero-width and control characters", () => {
      const input = `"text\u200Bwith\u200Czero\u200Dwidth", "control\u0000chars\u0001here"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(typeof tokens[0].value).toBe('string');
      expect(typeof tokens[2].value).toBe('string');
    });

    it("should handle surrogate pairs correctly", () => {
      const input = `"\ud83d\ude00", "\ud83c\udf0d"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("😀");
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("🌍");
    });
  });

  describe("Boundary Value Testing", () => {
    it("should handle maximum safe integer", () => {
      const maxSafeInt = Number.MAX_SAFE_INTEGER.toString();
      const input = maxSafeInt;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should handle minimum safe integer", () => {
      const minSafeInt = Number.MIN_SAFE_INTEGER.toString();
      const input = minSafeInt;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(Number.MIN_SAFE_INTEGER);
    });

    it("should handle very small decimal numbers", () => {
      const input = `1e-308, 5e-324`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(1e-308);
      expect(tokens[2].type).toBe(TokenType.NUMBER);
      expect(tokens[2].value).toBe(5e-324);
    });

    it("should handle very large decimal numbers", () => {
      const input = `1e308, 1.7976931348623157e+308`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(1e308);
      expect(tokens[2].type).toBe(TokenType.NUMBER);
      expect(tokens[2].value).toBe(1.7976931348623157e+308);
    });
  });

  describe("Malformed Input Recovery", () => {
    it("should recover from multiple consecutive errors", () => {
      const input = `xyz"error1", abc"error2", "valid", def"error3", 123`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const validTokens = tokens.filter(t => 
        (t.type === TokenType.STRING && t.value === "valid") ||
        (t.type === TokenType.NUMBER && t.value === 123)
      );
      
      const errorTokens = tokens.filter(t => t.type === TokenType.ERROR);

      expect(validTokens).toHaveLength(2);
      expect(errorTokens.length).toBeGreaterThan(0);
    });

    it("should handle truncated input gracefully", () => {
      const truncatedInputs = [
        '"unclosed string',
        '{incomplete: object',
        '[incomplete, array',
        'r"unclosed raw',
        'dt"incomplete-date',
        '123.45e'
      ];

      for (const input of truncatedInputs) {
        const tokenizer = new Tokenizer(input);
        const tokens = tokenizer.tokenize();
        
        expect(tokens.length).toBeGreaterThan(0);
        // Should either create valid tokens or error tokens, but not crash
        for (const token of tokens) {
          expect(token).toHaveProperty('type');
          expect(token).toHaveProperty('value');
        }
      }
    });

    it("should handle mixed valid and invalid content", () => {
      const input = `{
        valid: "string",
        number: 42,
        validArray: [1, 2, 3],
        invalidAnnotated: xyz"error",
        stillValid: true
      }`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // Should parse valid parts correctly
      const numberTokens = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numberTokens.length).toBeGreaterThanOrEqual(4); // 42, 1, 2, 3

      const stringTokens = tokens.filter(t => t.type === TokenType.STRING);
      expect(stringTokens.length).toBeGreaterThan(0);

      const booleanTokens = tokens.filter(t => t.type === TokenType.BOOLEAN);
      expect(booleanTokens).toHaveLength(1);
    });
  });

  describe("Performance Edge Cases", () => {
    it("should handle repetitive patterns efficiently", () => {
      // Create input with repetitive pattern
      let input = "";
      for (let i = 0; i < 1000; i++) {
        input += `"string${i}", `;
      }
      input = input.slice(0, -2); // Remove last comma and space

      const startTime = Date.now();
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const endTime = Date.now();

      expect(tokens).toHaveLength(1999); // 1000 strings + 999 commas
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it("should handle alternating token types efficiently", () => {
      let input = "";
      for (let i = 0; i < 500; i++) {
        input += `{key${i}: ${i}}, `;
      }
      input = `[${input.slice(0, -2)}]`; // Wrap in array, remove last comma

      const startTime = Date.now();
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const endTime = Date.now();

      expect(tokens.length).toBeGreaterThan(2000);
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("Memory Edge Cases", () => {
    it("should handle input with many small tokens", () => {
      // Create input with 10000 single-character tokens
      let input = "";
      for (let i = 0; i < 5000; i++) {
        input += "a, ";
      }
      input = input.slice(0, -2); // Remove last comma and space

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(9999); // 5000 strings + 4999 commas
      
      // Verify memory usage is reasonable (tokens should not be excessively large)
      const avgTokenSize = JSON.stringify(tokens).length / tokens.length;
      expect(avgTokenSize).toBeLessThan(200); // Reasonable size per token
    });

    it("should handle input with few large tokens", () => {
      const largeString = "x".repeat(50000);
      const input = `"${largeString}", "${largeString}", "${largeString}"`;
      
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5); // 3 strings + 2 commas
      expect(tokens[0].value.length).toBe(50000);
      expect(tokens[2].value.length).toBe(50000);
      expect(tokens[4].value.length).toBe(50000);
    });
  });

  describe("Whitespace Edge Cases", () => {
    it("should handle various types of whitespace", () => {
      const input = "a\u0009b\u000Ac\u000Bd\u000Cd\u000De\u0020f\u00A0g\u1680h\u2000i";
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // Actual tokenizer behavior - may parse as one open string
      expect(tokens.length).toBeGreaterThanOrEqual(1);
      
      const stringTokens = tokens.filter(t => t.type === TokenType.STRING);
      expect(stringTokens.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle mixed line endings", () => {
      const input = "line1\nline2\r\nline3\rline4";
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1); // Should be parsed as one open string
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("OPEN_STRING");
    });

    it("should handle excessive whitespace", () => {
      const input = `   \n\n\n   "string"   \t\t\t   123   \r\n\r\n   `;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("string");
      expect(tokens[1].type).toBe(TokenType.NUMBER);
      expect(tokens[1].value).toBe(123);
    });
  });
});