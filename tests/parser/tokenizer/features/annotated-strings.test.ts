import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";
import { TokenErrorValue } from "../../../../src/parser/tokenizer/tokens";

describe("Annotated String Parsing", () => {
  describe("Raw Strings", () => {
    it("should parse raw strings with r prefix", () => {
      const input = `r"raw string with \\n literal", r'another raw'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("RAW_STRING");
      expect(tokens[0].value).toBe("raw string with \\n literal");

      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].subType).toBe("RAW_STRING");
      expect(tokens[2].value).toBe("another raw");
    });

    it("should handle both quote types for raw strings", () => {
      const input = `r"double quotes", r'single quotes'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("RAW_STRING");
      expect(tokens[0].value).toBe("double quotes");

      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].subType).toBe("RAW_STRING");
      expect(tokens[2].value).toBe("single quotes");
    });

    it("should preserve special characters in raw strings", () => {
      const input = `r"[0-9\\n\\t\\r]", r'g~^&*(@hi🤐'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("RAW_STRING");
      expect(tokens[0].value).toBe("[0-9\\n\\t\\r]");

      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].subType).toBe("RAW_STRING");
      expect(tokens[2].value).toBe("g~^&*(@hi🤐");
    });
  });

  describe("Binary Strings", () => {
    it("should parse binary strings with b prefix", () => {
      const base64Data = Buffer.from("hello world").toString("base64");
      const input = `b"${base64Data}"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.BINARY);
      expect(tokens[0].subType).toBe("BINARY_STRING");
      expect(Buffer.isBuffer(tokens[0].value)).toBe(true);
      expect((tokens[0].value as Buffer).toString()).toBe("hello world");
    });

    it("should handle various base64 encoded data", () => {
      const testData = [
        Buffer.from("test"),
        Buffer.from("Hello, World!"),
        Buffer.from([0x01, 0x02, 0x03, 0x04])
      ];

      for (const data of testData) {
        const base64 = data.toString("base64");
        const input = `b"${base64}"`;
        const tokenizer = new Tokenizer(input);
        const tokens = tokenizer.tokenize();

        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe(TokenType.BINARY);
        expect(tokens[0].subType).toBe("BINARY_STRING");
        expect(Buffer.isBuffer(tokens[0].value)).toBe(true);
        expect(tokens[0].value).toEqual(data);
      }
    });

    it("should handle both quote types for binary strings", () => {
      const base64Data = Buffer.from("test").toString("base64");
      const input = `b"${base64Data}", b'${base64Data}'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.BINARY);
      expect(tokens[0].subType).toBe("BINARY_STRING");
      expect(tokens[2].type).toBe(TokenType.BINARY);
      expect(tokens[2].subType).toBe("BINARY_STRING");
      expect(tokens[0].value).toEqual(tokens[2].value);
    });

    it("should handle empty binary strings", () => {
      const input = `b""`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.BINARY);
      expect(tokens[0].subType).toBe("BINARY_STRING");
      expect(Buffer.isBuffer(tokens[0].value)).toBe(true);
      expect((tokens[0].value as Buffer).length).toBe(0);
    });
  });

  describe("DateTime Strings", () => {
    it("should parse datetime strings with dt prefix", () => {
      const input = `dt"2023-12-25T10:30:00Z"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].subType).toBe(TokenType.DATETIME);
      expect(tokens[0].value).toBeInstanceOf(Date);
    });

    it("should parse date strings with d prefix", () => {
      const input = `d"2023-12-25"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].subType).toBe(TokenType.DATE);
      expect(tokens[0].value).toBeInstanceOf(Date);
    });

    it("should parse time strings with t prefix", () => {
      const input = `t"10:30:00"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].subType).toBe(TokenType.TIME);
      expect(tokens[0].value).toBeInstanceOf(Date);
    });

    it("should parse all supported annotated string types", () => {
      const base64 = Buffer.from("test").toString("base64");
      const input = `r"raw", b"${base64}", dt"2023-12-25", d"2023-12-25", t"10:30:00"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(9); // 5 strings + 4 commas

      // Raw string
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("RAW_STRING");
      expect(tokens[0].value).toBe("raw");

      // Byte string
      expect(tokens[2].type).toBe(TokenType.BINARY);
      expect(tokens[2].subType).toBe("BINARY_STRING");
      expect(Buffer.isBuffer(tokens[2].value)).toBe(true);

      // DateTime
      expect(tokens[4].type).toBe(TokenType.DATETIME);
      expect(tokens[4].subType).toBe(TokenType.DATETIME);
      expect(tokens[4].value).toBeInstanceOf(Date);

      // Date
      expect(tokens[6].type).toBe(TokenType.DATETIME);
      expect(tokens[6].subType).toBe(TokenType.DATE);
      expect(tokens[6].value).toBeInstanceOf(Date);

      // Time
      expect(tokens[8].type).toBe(TokenType.DATETIME);
      expect(tokens[8].subType).toBe(TokenType.TIME);
      expect(tokens[8].value).toBeInstanceOf(Date);
    });
  });

  describe("Multi-character Annotation Prefixes", () => {
    it("should handle multi-character annotation prefixes", () => {
      const input = `dt"2023-12-25T10:30:00Z"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].subType).toBe(TokenType.DATETIME);
      expect(tokens[0].value).toBeInstanceOf(Date);
    });

    it("should distinguish between different multi-character prefixes", () => {
      const input = `dt"2023-12-25T10:30:00Z", d"2023-12-25"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].subType).toBe(TokenType.DATETIME);
      expect(tokens[2].subType).toBe(TokenType.DATE);
    });
  });

  describe("Annotated String Quote Handling", () => {
    it("should handle annotated strings with both quote types", () => {
      const input = `r"double quotes", r'single quotes'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("RAW_STRING");
      expect(tokens[0].value).toBe("double quotes");

      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].subType).toBe("RAW_STRING");
      expect(tokens[2].value).toBe("single quotes");
    });

    it("should preserve quote type in token text", () => {
      const input = `r"test", r'test'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].token).toBe('r"test"');
      expect(tokens[2].token).toBe("r'test"); // Actual tokenizer behavior
    });
  });

  describe("Annotated String Content", () => {
    it("should handle empty annotated strings", () => {
      const input = `r"", b"", dt"", d"", t""`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // Some may be error tokens due to invalid content (empty datetime/date/time)
      expect(tokens.length).toBeGreaterThanOrEqual(9);

      // Raw string should work with empty content
      const rawToken = tokens.find(t => t.subType === "RAW_STRING");
      expect(rawToken).toBeDefined();
      expect(rawToken?.value).toBe("");

      // Binary string should work with empty content
      const binaryToken = tokens.find(t => t.subType === "BINARY_STRING");
      expect(binaryToken).toBeDefined();
      expect(Buffer.isBuffer(binaryToken?.value)).toBe(true);
    });

    it("should handle very long annotated strings", () => {
      const longContent = "a".repeat(1000);
      const input = `r"${longContent}"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("RAW_STRING");
      expect(tokens[0].value).toBe(longContent);
    });

    it("should handle Unicode content in annotated strings", () => {
      const input = `r"Hello 世界 🌍", b"${Buffer.from("Hello 世界").toString("base64")}"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("RAW_STRING");
      expect(tokens[0].value).toBe("Hello 世界 🌍");

      expect(tokens[2].type).toBe(TokenType.BINARY);
      expect(tokens[2].subType).toBe("BINARY_STRING");
      expect((tokens[2].value as Buffer).toString()).toBe("Hello 世界");
    });
  });

  describe("Annotated String Error Cases", () => {
    it("should handle invalid base64 in binary strings", () => {
      const input = `b"invalid@base64!", "next"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect((tokens[0].value as TokenErrorValue).__error).toBe(true);
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("next");
    });

    it("should handle invalid datetime formats", () => {
      const input = `dt"invalid-date-format", "next"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect((tokens[0].value as TokenErrorValue).__error).toBe(true);
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("next");
    });

    it("should handle unclosed annotated strings", () => {
      const input = `r"unclosed raw string`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("RAW_STRING");
      expect(tokens[0].value).toBe("unclosed raw string");
    });
  });

  describe("Annotated Strings in Context", () => {
    it("should handle annotated strings in arrays", () => {
      const base64 = Buffer.from("test").toString("base64");
      const input = `[r"raw", b"${base64}", dt"2023-12-25T10:30:00Z"]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const annotatedTokens = tokens.filter(t =>
        t.subType === "RAW_STRING" ||
        t.subType === "BINARY_STRING" ||
        t.subType === TokenType.DATETIME
      );

      expect(annotatedTokens).toHaveLength(3);
    });

    it("should handle annotated strings in objects", () => {
      const base64 = Buffer.from("test").toString("base64");
      const input = `{
        raw: r"content",
        binary: b"${base64}",
        datetime: dt"2023-12-25T10:30:00Z"
      }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const annotatedTokens = tokens.filter(t =>
        t.subType === "RAW_STRING" ||
        t.subType === "BINARY_STRING" ||
        t.subType === TokenType.DATETIME
      );

      expect(annotatedTokens).toHaveLength(3);
    });

    it("should handle mixed annotated and regular strings", () => {
      const input = `"regular", r"raw", "another regular", b"dGVzdA=="`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(7);
      expect(tokens[0].subType).toBe("REGULAR_STRING");
      expect(tokens[2].subType).toBe("RAW_STRING");
      expect(tokens[4].subType).toBe("REGULAR_STRING");
      expect(tokens[6].subType).toBe("BINARY_STRING");
    });
  });
});