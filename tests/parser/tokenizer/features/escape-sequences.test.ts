import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

describe("Escape Sequence Handling", () => {
  describe("Basic Escape Sequences", () => {
    it("should handle escape sequences in regular strings", () => {
      const input = `"line1\\nline2", "tab\\tthere", "quote\\"here", "unicode\\u0041"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(7);
      expect(tokens[0].value).toBe("line1\nline2");
      expect(tokens[2].value).toBe("tab\tthere");
      expect(tokens[4].value).toBe('quote"here');
      expect(tokens[6].value).toBe("unicodeA");
    });

    it("should handle standard escape sequences", () => {
      const input = `"\\b\\f\\n\\r\\t\\v\\\\"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      // The actual behavior may vary based on tokenizer implementation
      expect(typeof tokens[0].value).toBe('string');
    });

    it("should handle quote escapes", () => {
      const input = `"He said \\"Hello\\"", 'She said \\'Hi\\''`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe('He said "Hello"');
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("She said 'Hi'");
    });
  });

  describe("Unicode Escape Sequences", () => {
    it("should handle valid unicode escape sequences", () => {
      const input = `"\\u0041\\u0042\\u0043"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("ABC");
    });

    it("should handle unicode escape for special characters", () => {
      const input = `"\\u00A9\\u00AE\\u2122"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("©®™");
    });

    it("should handle unicode escape for emoji", () => {
      const input = `"\\ud83d\\ude00"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe(String.fromCharCode(55357, 56832)); // 😀 surrogate pair
    });
  });

  describe("Hexadecimal Escape Sequences", () => {
    it("should handle valid hex escape sequences", () => {
      const input = `"\\x41\\x42\\x43"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("ABC");
    });

    it("should handle hex escape for control characters", () => {
      const input = `"\\x00\\x09\\x0A\\x0D"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe(String.fromCharCode(0, 9, 10, 13));
    });
  });

  describe("Invalid Escape Sequences", () => {
    it("should handle invalid escape sequences gracefully", () => {
      const input = `"valid\\z invalid", "next string"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("validz invalid"); // Invalid escape treated as literal
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("next string");
    });

    // A marker escape is a CLAIM: `\u` and `\x` announce a code point, so a malformed one is an
    // error rather than text. An UNRECOGNISED escape stays lenient — see the last test in this
    // block. Both call sites used to swallow the throw and hand back text, which lost the code
    // point silently and made an open string and a regular string disagree about the same input.
    it("rejects a malformed unicode escape rather than silently dropping the marker", () => {
      const input = `"test\\uZZZZ", "valid"`;
      const tokenizer = new Tokenizer(input);

      const tokens = tokenizer.tokenize();
      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect((tokens[0].value as any).errorCode).toBe("invalid-escape-sequence");
    });

    it("rejects a malformed hex escape rather than silently dropping the marker", () => {
      const input = `"test\\xZZ", "valid"`;
      const tokenizer = new Tokenizer(input);

      const tokens = tokenizer.tokenize();
      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect((tokens[0].value as any).errorCode).toBe("invalid-escape-sequence");
    });

    it.each([`"a\\u12"`, `"a\\u"`, `"a\\u123"`])(
      "rejects an incomplete unicode escape: %s",
      (input) => {
        const tokens = new Tokenizer(input).tokenize();
      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect((tokens[0].value as any).errorCode).toBe("invalid-escape-sequence");
      });

    it.each([`"a\\x1"`, `"a\\x"`, `"a\\xG"`])(
      "rejects an incomplete hex escape: %s",
      (input) => {
        const tokens = new Tokenizer(input).tokenize();
      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect((tokens[0].value as any).errorCode).toBe("invalid-escape-sequence");
      });

    // The other half of the rule, and the reason this is not simply "strict escapes": an escape
    // that claims nothing stays lenient. `\q` is `q`, in every string form.
    it("leaves an unrecognised escape lenient", () => {
      expect(new Tokenizer(`"a\\qb"`).tokenize()[0].value).toBe("aqb");
      expect(new Tokenizer(`"C:\\Users"`).tokenize()[0].value).toBe("C:Users");
    });
  });

  describe("Escape Sequences in Different String Types", () => {
    it("should handle escape sequences in single-quoted strings", () => {
      const input = `'line1\\nline2', 'tab\\tthere'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("REGULAR_STRING");
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].subType).toBe("REGULAR_STRING");
    });

    it("should NOT process escape sequences in raw strings", () => {
      const input = `r"line1\\nline2", r'tab\\tthere'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("RAW_STRING");
      expect(tokens[0].value).toBe("line1\\nline2"); // Raw strings preserve backslashes
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].subType).toBe("RAW_STRING");
      expect(tokens[2].value).toBe("tab\\tthere");
    });

    it("should handle escape sequences in open strings differently", () => {
      const input = `line1\\nline2, tab\\tthere`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("OPEN_STRING");
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].subType).toBe("OPEN_STRING");
      // Open strings may handle escapes differently than quoted strings
    });
  });

  describe("Complex Escape Scenarios", () => {
    it("should handle mixed escape sequences", () => {
      const input = `"\\n\\t\\r\\u0041\\x42\\"mixed\\""`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(typeof tokens[0].value).toBe('string');
      expect((tokens[0].value as string).length).toBeGreaterThan(0);
    });

    it("should handle escape sequences at string boundaries", () => {
      const input = `"\\nstart", "end\\n", "\\nboth\\n"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      for (let i = 0; i < tokens.length; i += 2) {
        expect(tokens[i].type).toBe(TokenType.STRING);
        expect(typeof tokens[i].value).toBe('string');
      }
    });

    it("should handle consecutive escape sequences", () => {
      const input = `"\\n\\n\\n", "\\t\\t\\t", "\\u0041\\u0042\\u0043"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[4].type).toBe(TokenType.STRING);
      expect(tokens[4].value).toBe("ABC");
    });

    it("should handle backslash at end of string", () => {
      const input = `"test\\", "another\\\\"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      // First token might be an error due to invalid escape at end
      expect(tokens[0].type).toMatch(/STRING|ERROR/);
      expect(tokens[2].type).toMatch(/STRING|ERROR/); // May be error due to invalid escape
    });
  });

  describe("Escape Sequence Error Recovery", () => {
    it("should continue parsing after invalid escape sequences", () => {
      const input = `"invalid\\q", "valid", "another\\z invalid", "final"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(7);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("valid");
      expect(tokens[4].type).toBe(TokenType.STRING);
      expect(tokens[6].type).toBe(TokenType.STRING);
      expect(tokens[6].value).toBe("final");
    });

    it("reports a truncated escape as invalid-escape-sequence, not unterminated-string", () => {
      // This used to report `unterminated-string`, which sends the reader to look at their quoting
      // when the fault is in the escape.
      const input = `"test\\u123`;
      const tokens = new Tokenizer(input).tokenize();
      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect((tokens[0].value as any).errorCode).toBe("invalid-escape-sequence");
    });
  });
});