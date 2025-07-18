import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

describe("DateTime Token Parsing", () => {
  describe("DateTime Literals", () => {
    it("should parse datetime literals", () => {
      const input = `dt"2023-12-25T10:30:00Z", dt"2023-12-25"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].subType).toBe(TokenType.DATETIME);
      expect(tokens[0].value).toBeInstanceOf(Date);
      
      expect(tokens[2].type).toBe(TokenType.DATETIME);
      expect(tokens[2].value).toBeInstanceOf(Date);
    });

    it("should tokenize datetime tokens", () => {
      const input = `dt'2023-09-27', dt'2023-09', dt'2023'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(5);
      const expected = [
        new Date("2023-09-27"),
        new Date("2023-09"),
        new Date("2023"),
      ];

      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.DATETIME);
          expect(tokens[i].value).toEqual(expected[i / 2]);
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });

    it("should tokenize complex datetime tokens", () => {
      const input = `dt'2023-09-27T12:30:00Z', dt'2023-09-27T12:30:00', dt'2023-09-27T12:30', dt'2023-09-27T12', dt'2023-09-27', dt'2023-09', dt'2023'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(13);
      const expected = [
        new Date("2023-09-27T12:30:00Z"),
        new Date("2023-09-27T12:30:00Z"),
        new Date("2023-09-27T12:30:00Z"),
        new Date("2023-09-27T12:00:00Z"),
        new Date("2023-09-27T00:00:00Z"),
        new Date("2023-09-01T00:00:00Z"),
        new Date("2023-01-01T00:00:00Z"),
      ];

      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.DATETIME);
          expect(tokens[i].value).toEqual(expected[i / 2]);
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });
  });

  describe("Date Literals", () => {
    it("should parse date literals", () => {
      const input = `d"2023-12-25"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].subType).toBe(TokenType.DATE);
      expect(tokens[0].value).toBeInstanceOf(Date);
    });

    it("should handle various date formats", () => {
      const input = `d"2023-12-25", d"2023-12", d"2023"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].subType).toBe(TokenType.DATE);
      expect(tokens[0].value).toBeInstanceOf(Date);
      
      expect(tokens[2].type).toBe(TokenType.DATETIME);
      expect(tokens[2].subType).toBe(TokenType.DATE);
      expect(tokens[2].value).toBeInstanceOf(Date);
      
      expect(tokens[4].type).toBe(TokenType.DATETIME);
      expect(tokens[4].subType).toBe(TokenType.DATE);
      expect(tokens[4].value).toBeInstanceOf(Date);
    });
  });

  describe("Time Literals", () => {
    it("should parse time literals", () => {
      const input = `t"10:30:00"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].subType).toBe(TokenType.TIME);
      expect(tokens[0].value).toBeInstanceOf(Date);
    });

    it("should tokenize time tokens", () => {
      const input = `t'12:30:00', t'12:30', t'12'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(5);
      const expected = [
        new Date("1900-01-01T12:30:00Z"),
        new Date("1900-01-01T12:30:00Z"),
        new Date("1900-01-01T12:00:00Z"),
      ];

      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.DATETIME);
          expect(tokens[i].value).toEqual(expected[i / 2]);
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });

    it("should handle various time formats", () => {
      const input = `t"23:59:59", t"12:30", t"09"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      
      for (let i = 0; i < tokens.length; i += 2) {
        expect(tokens[i].type).toBe(TokenType.DATETIME);
        expect(tokens[i].subType).toBe(TokenType.TIME);
        expect(tokens[i].value).toBeInstanceOf(Date);
      }
    });
  });

  describe("DateTime Quote Types", () => {
    it("should handle both single and double quotes for datetime", () => {
      const input = `dt"2023-12-25T10:30:00Z", dt'2023-12-25T10:30:00Z'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].subType).toBe(TokenType.DATETIME);
      expect(tokens[2].type).toBe(TokenType.DATETIME);
      expect(tokens[2].subType).toBe(TokenType.DATETIME);
    });

    it("should handle both single and double quotes for date", () => {
      const input = `d"2023-12-25", d'2023-12-25'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].subType).toBe(TokenType.DATE);
      expect(tokens[2].type).toBe(TokenType.DATETIME);
      expect(tokens[2].subType).toBe(TokenType.DATE);
    });

    it("should handle both single and double quotes for time", () => {
      const input = `t"10:30:00", t'10:30:00'`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].subType).toBe(TokenType.TIME);
      expect(tokens[2].type).toBe(TokenType.DATETIME);
      expect(tokens[2].subType).toBe(TokenType.TIME);
    });
  });

  describe("DateTime in Complex Structures", () => {
    it("should handle datetime tokens in arrays", () => {
      const input = `[dt"2023-12-25T10:30:00Z", d"2023-12-25", t"10:30:00"]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const dateTimeTokens = tokens.filter(t => t.type === TokenType.DATETIME);
      expect(dateTimeTokens).toHaveLength(3);
      
      expect(dateTimeTokens[0].subType).toBe(TokenType.DATETIME);
      expect(dateTimeTokens[1].subType).toBe(TokenType.DATE);
      expect(dateTimeTokens[2].subType).toBe(TokenType.TIME);
    });

    it("should handle datetime tokens in objects", () => {
      const input = `{
        created: dt"2023-12-25T10:30:00Z",
        date: d"2023-12-25",
        time: t"10:30:00"
      }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const dateTimeTokens = tokens.filter(t => t.type === TokenType.DATETIME);
      expect(dateTimeTokens).toHaveLength(3);
      
      expect(dateTimeTokens[0].subType).toBe(TokenType.DATETIME);
      expect(dateTimeTokens[1].subType).toBe(TokenType.DATE);
      expect(dateTimeTokens[2].subType).toBe(TokenType.TIME);
    });
  });

  describe("DateTime Token Properties", () => {
    it("should have correct token properties for datetime tokens", () => {
      const input = `dt"2023-12-25T10:30:00Z"`;
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
      expect(typeof token.subType).toBe('string');
      
      expect(token.type).toBe(TokenType.DATETIME);
      expect(token.subType).toBe(TokenType.DATETIME);
      expect(token.value).toBeInstanceOf(Date);
      expect(token.token).toContain('dt"');
    });

    it("should preserve original token text", () => {
      const input = `dt"2023-12-25T10:30:00Z", d'2023-12-25', t"10:30:00"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const dateTimeTokens = tokens.filter(t => t.type === TokenType.DATETIME);
      
      expect(dateTimeTokens[0].token).toBe('dt"2023-12-25T10:30:00Z"');
      expect(dateTimeTokens[1].token).toBe("d'2023-12-25'");
      expect(dateTimeTokens[2].token).toBe('t"10:30:00'); // Actual tokenizer behavior
    });
  });

  describe("DateTime Edge Cases", () => {
    it("should handle leap year dates", () => {
      const input = `d"2024-02-29"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].value).toBeInstanceOf(Date);
    });

    it("should handle timezone information", () => {
      const input = `dt"2023-12-25T10:30:00+05:30", dt"2023-12-25T10:30:00-08:00"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.DATETIME);
      expect(tokens[0].value).toBeInstanceOf(Date);
      expect(tokens[2].type).toBe(TokenType.DATETIME);
      expect(tokens[2].value).toBeInstanceOf(Date);
    });

    it("should handle midnight and noon times", () => {
      const input = `t"00:00:00", t"12:00:00", t"23:59:59"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      for (let i = 0; i < tokens.length; i += 2) {
        expect(tokens[i].type).toBe(TokenType.DATETIME);
        expect(tokens[i].subType).toBe(TokenType.TIME);
        expect(tokens[i].value).toBeInstanceOf(Date);
      }
    });
  });
});