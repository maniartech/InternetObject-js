import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

describe("String Token Parsing", () => {
  describe("Regular Quoted Strings", () => {
    it("should parse regular double-quoted strings", () => {
      const input = `"hello", "world with spaces", "with\nnewlines"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5); // 3 strings + 2 commas
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("REGULAR_STRING");
      expect(tokens[0].value).toBe("hello");
      
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("world with spaces");
      
      expect(tokens[4].type).toBe(TokenType.STRING);
      expect(tokens[4].value).toBe("with\nnewlines");
    });

    it("should parse regular single-quoted strings", () => {
      const input = `'hello', 'world with spaces', 'with\ttabs'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("REGULAR_STRING");
      expect(tokens[0].value).toBe("hello");
      
      expect(tokens[2].value).toBe("world with spaces");
      expect(tokens[4].value).toBe("with\ttabs");
    });

    it('should tokenize the regular string tokens using double quotes', () => {
      const input = `"a\nb", "c\td", "e\nf", "a🤝", "123hjsdfa", '123'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(11);
      let expected = ["a\nb", "c\td", "e\nf", "a🤝", "123hjsdfa", "123"];
      let j = 0;
      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.STRING);
          expect(tokens[i].value).toEqual(expected[j]);
          j++;
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });

    it("should tokenize the regular string tokens using single quotes", () => {
      const input = `'a\nb', 'c\td', 'e\nf', 'a🤝', '123hjsdfa', '123'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(11);
      const expected = ["a\nb", "c\td", "e\nf", "a🤝", "123hjsdfa", "123"];
      let j = 0;
      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.STRING);
          expect(tokens[i].value).toEqual(expected[j]);
          j++;
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });
  });

  describe("Open Strings (Unquoted)", () => {
    it("should parse open strings (unquoted)", () => {
      const input = `hello, world123, test_value`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("OPEN_STRING");
      expect(tokens[0].value).toBe("hello");
      
      expect(tokens[2].value).toBe("world123");
      expect(tokens[4].value).toBe("test_value");
    });

    it("should tokenize the open string tokens", () => {
      const input = `a, 12312bc, de✨, fgh`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const expected = ["a", "12312bc", "de✨", "fgh"];
      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.STRING);
          expect(tokens[i].value).toEqual(expected[i / 2]);
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });
  });

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

    it("should tokenize the raw string tokens using r' '", () => {
      const input = `r'abc', r'de\nf', r'g~^&*(@hi🤐'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const expected = [`abc`, `de\nf`, `g~^&*(@hi🤐`];
      let j = 0;

      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.STRING);
          expect(tokens[i].value).toEqual(expected[j]);
          j++;
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });

    it('should tokenize the raw string tokens using r" "', () => {
      const input = `r"abc", r"de\nf", r"g~^&*(@hi🤐"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const expected = [`abc`, `de\nf`, `g~^&*(@hi🤐`];
      let j = 0;

      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.STRING);
          expect(tokens[i].value).toEqual(expected[j]);
          j++;
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });
  });

  describe("Binary Strings", () => {
    it("should parse byte strings with b prefix", () => {
      const base64Data = Buffer.from("hello world").toString("base64");
      const input = `b"${base64Data}"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.BINARY);
      expect(tokens[0].subType).toBe("BINARY_STRING");
      expect(Buffer.isBuffer(tokens[0].value)).toBe(true);
      expect(tokens[0].value.toString()).toBe("hello world");
    });

    it("should tokenize the binary string tokens", () => {
      const b1 = Buffer.from([0x01, 0x01, 0x01, 0x01]);
      const b2 = Buffer.from([0x02, 0x02, 0x02, 0x02]);
      const b3 = Buffer.from([0x03, 0x03, 0x03, 0x03]);

      const input = `{
        a: b'${b1.toString("base64")}',
        b: b"${b2.toString("base64")}",
        c: b'${b3.toString("base64")}',
      }`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens[3].value).toEqual(b1);
      expect(tokens[7].value).toEqual(b2);
      expect(tokens[11].value).toEqual(b3);
    });
  });

  describe("String Content Validation", () => {
    it("should handle Unicode characters in strings", () => {
      const input = `"😀", "中文", "α β γ"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("😀");
      expect(tokens[2].value).toBe("中文");
      expect(tokens[4].value).toBe("α β γ");
    });

    it("should handle empty strings", () => {
      const input = `"", '', r""`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe("");
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("");
      expect(tokens[4].type).toBe(TokenType.STRING);
      expect(tokens[4].value).toBe("");
    });

    it("should handle very long strings", () => {
      const longString = "a".repeat(10000);
      const input = `"${longString}"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].value).toBe(longString);
    });
  });
});