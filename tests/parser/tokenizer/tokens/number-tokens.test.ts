import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

describe("Number Tokens", () => {
  describe("Integer Numbers", () => {
    it("should tokenize positive integers", () => {
      const input = `42, 123, 0`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5); // 3 numbers + 2 commas
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(42);
      expect(tokens[2].type).toBe(TokenType.NUMBER);
      expect(tokens[2].value).toBe(123);
      expect(tokens[4].type).toBe(TokenType.NUMBER);
      expect(tokens[4].value).toBe(0);
    });

    it("should tokenize negative integers", () => {
      const input = `-42, -123, -0`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(-42);
      expect(tokens[2].value).toBe(-123);
      expect(tokens[4].value).toBe(-0);
    });

    it("should tokenize positive signed integers", () => {
      const input = `+42, +123`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(42);
      expect(tokens[2].value).toBe(123);
    });

    it("should tokenize basic integer tokens", () => {
      const input = `10, -10, 0, -0`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(7);
      const expected = [10, -10, 0, -0];
      let j = 0;

      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.NUMBER);
          expect(tokens[i].value).toEqual(expected[j]);
          j++;
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });
  });

  describe("Decimal Numbers", () => {
    it("should tokenize decimal numbers", () => {
      const input = `3.14, -2.5, 0.0, .5, 10.`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(9);
      expect(tokens[0].value).toBe(3.14);
      expect(tokens[2].value).toBe(-2.5);
      expect(tokens[4].value).toBe(0.0);
      expect(tokens[6].value).toBe(0.5);
      expect(tokens[8].value).toBe(10);
    });

    it("should tokenize decimal number tokens", () => {
      const input = `10.1, -10.1, 0.1, -0.1`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(7);
      const expected = [10.1, -10.1, 0.1, -0.1];
      let j = 0;

      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.NUMBER);
          expect(tokens[i].value).toEqual(expected[j]);
          j++;
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });

    it("should handle edge cases for decimal numbers", () => {
      const input = `0., .0, 123.456`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(0);
      expect(tokens[2].value).toBe(0);
      expect(tokens[4].value).toBe(123.456);
    });
  });

  describe("Scientific Notation", () => {
    it("should tokenize scientific notation", () => {
      const input = `1e5, 2.5e-3, -1.2E+4`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].value).toBe(1e5);
      expect(tokens[2].value).toBe(2.5e-3);
      expect(tokens[4].value).toBe(-1.2E+4);
    });

    it("should tokenize scientific number tokens", () => {
      const input = `10e1, -10e1, 0e+1, 0e-123, 0e123, -0e-123, -0e123`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(13);

      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.NUMBER);
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });

    it("should handle various scientific notation formats", () => {
      const input = `1E10, 2e-5, 3.14e+2, -4.5E-3`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(7);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(1E10);
      expect(tokens[2].value).toBe(2e-5);
      expect(tokens[4].value).toBe(3.14e+2);
      expect(tokens[6].value).toBe(-4.5E-3);
    });
  });

  describe("Hexadecimal Numbers", () => {
    it("should tokenize hexadecimal numbers", () => {
      const input = `0xFF, 0x10, -0xABC`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].subType).toBe("HEX");
      expect(tokens[0].value).toBe(255);
      
      expect(tokens[2].value).toBe(16);
      expect(tokens[4].value).toBe(-2748);
    });

    it("should tokenize hexadecimal number tokens", () => {
      const input = `0xa2, -0xa2, 0x0, -0x0, 0Xa2, -0Xa2, 0X0, -0X0`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(15);
      const expected = [162, -162, 0, -0, 162, -162, 0, -0];
      let j = 0;

      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.NUMBER);
          expect(tokens[i].subType).toEqual("HEX");
          expect(tokens[i].value).toEqual(expected[j]);
          j++;
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });

    it("should handle both uppercase and lowercase hex prefixes", () => {
      const input = `0xabc, 0XDEF, 0xAbC, 0XdEf`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(7);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].subType).toBe("HEX");
      expect(tokens[0].value).toBe(0xabc);
      expect(tokens[2].value).toBe(0xDEF);
      expect(tokens[4].value).toBe(0xAbC);
      expect(tokens[6].value).toBe(0XdEf);
    });
  });

  describe("Octal Numbers", () => {
    it("should tokenize octal numbers", () => {
      const input = `0o77, 0O10, -0o123`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].subType).toBe("OCTAL");
      expect(tokens[0].value).toBe(63);
      
      expect(tokens[2].value).toBe(8);
      expect(tokens[4].value).toBe(-83);
    });

    it("should tokenize octal number tokens", () => {
      const input = `0o10, -0o10, 0o0, -0o0, 0O10, -0O10, 0O0, -0O0`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(15);
      const expected = [8, -8, 0, -0, 8, -8, 0, -0];
      let j = 0;
      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.NUMBER);
          expect(tokens[i].subType).toEqual("OCTAL");
          expect(tokens[i].value).toEqual(expected[j]);
          j++;
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });

    it("should handle both uppercase and lowercase octal prefixes", () => {
      const input = `0o123, 0O456, 0o777`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].subType).toBe("OCTAL");
      expect(tokens[0].value).toBe(83); // 0o123 = 83
      expect(tokens[2].value).toBe(302); // 0O456 = 302
      expect(tokens[4].value).toBe(511); // 0o777 = 511
    });
  });

  describe("Binary Numbers", () => {
    it("should tokenize binary numbers", () => {
      const input = `0b1010, 0B11, -0b101`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].subType).toBe("BINARY");
      expect(tokens[0].value).toBe(10);
      
      expect(tokens[2].value).toBe(3);
      expect(tokens[4].value).toBe(-5);
    });

    it("should tokenize binary number tokens", () => {
      const input = `0b1010, -0b1010, 0b0, -0b0, 0B1010, -0B1010, 0B0, -0B0`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(15);
      const expected = [10, -10, 0, -0, 10, -10, 0, -0];
      let j = 0;

      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.NUMBER);
          expect(tokens[i].subType).toEqual("BINARY");
          expect(tokens[i].value).toEqual(expected[j]);
          j++;
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });

    it("should handle both uppercase and lowercase binary prefixes", () => {
      const input = `0b1111, 0B0000, 0b1010`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].subType).toBe("BINARY");
      expect(tokens[0].value).toBe(15); // 0b1111 = 15
      expect(tokens[2].value).toBe(0);  // 0B0000 = 0
      expect(tokens[4].value).toBe(10); // 0b1010 = 10
    });
  });

  describe("BigInt Numbers", () => {
    it("should tokenize BigInt numbers", () => {
      const input = `123n, -456n, 0n`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.BIGINT);
      expect(tokens[0].value).toBe(BigInt(123));
      
      expect(tokens[2].type).toBe(TokenType.BIGINT);
      expect(tokens[2].value).toBe(BigInt(-456));
      
      expect(tokens[4].value).toBe(BigInt(0));
    });

    it("should tokenize bigint tokens", () => {
      const input = `10n, 0n, 234123412341234123513451765178923647891263784162893746182351234651267834n, -6178234657816578612786451786347861274618923n`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(7);
      const expected = [
        BigInt(10),
        BigInt(0),
        BigInt("234123412341234123513451765178923647891263784162893746182351234651267834"),
        BigInt("-6178234657816578612786451786347861274618923"),
      ];
      let j = 0;

      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.BIGINT);
          expect(tokens[i].value).toEqual(expected[j]);
          j++;
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });

    it("should handle BigInt with different number bases", () => {
      const input = `0xFFn, 0o77n, 0b1010n`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.BIGINT);
      expect(tokens[0].value).toBe(BigInt(255)); // 0xFF
      expect(tokens[2].value).toBe(BigInt(63));  // 0o77
      expect(tokens[4].value).toBe(BigInt(10));  // 0b1010
    });
  });

  describe("Special Number Values", () => {
    it("should tokenize special number values", () => {
      const input = `Inf, +Inf, -Inf, NaN`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(7);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(Infinity);
      
      expect(tokens[2].value).toBe(Infinity);
      expect(tokens[4].value).toBe(-Infinity);
      expect(tokens[6].value).toBeNaN();
    });

    it("should tokenize special numbers like NaN, Inf, +Inf, -Inf", () => {
      const input = `{
        a: NaN,
        b: Inf,
        c: +Inf,
        d: -Inf,
      }`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens[3].value).toEqual(NaN);
      expect(tokens[7].value).toEqual(Infinity);
      expect(tokens[11].value).toEqual(Infinity);
      expect(tokens[15].value).toEqual(-Infinity);
    });

    it("should handle Infinity in various contexts", () => {
      const input = `[Inf, -Inf, +Inf]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const numberTokens = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numberTokens).toHaveLength(3);
      expect(numberTokens[0].value).toBe(Infinity);
      expect(numberTokens[1].value).toBe(-Infinity);
      expect(numberTokens[2].value).toBe(Infinity);
    });
  });

  describe("Decimal Numbers (Decimal Type)", () => {
    it("should tokenize decimal literals with m suffix", () => {
      const input = `3.14m, -2.5m, 0m`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.DECIMAL);
      expect(tokens[2].type).toBe(TokenType.DECIMAL);
      expect(tokens[4].type).toBe(TokenType.DECIMAL);
    });
  });

  describe("Number Edge Cases", () => {
    it("should handle numbers in complex structures", () => {
      const input = `{
        integer: 42,
        decimal: 3.14,
        scientific: 1e5,
        hex: 0xFF,
        octal: 0o77,
        binary: 0b1010,
        bigint: 123n,
        infinity: Inf,
        nan: NaN
      }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const numberTokens = tokens.filter(t => 
        t.type === TokenType.NUMBER || 
        t.type === TokenType.BIGINT || 
        t.type === TokenType.DECIMAL
      );

      expect(numberTokens.length).toBeGreaterThanOrEqual(9);
      
      // Verify different number types are present
      const regularNumbers = numberTokens.filter(t => t.type === TokenType.NUMBER);
      const bigints = numberTokens.filter(t => t.type === TokenType.BIGINT);
      
      expect(regularNumbers.length).toBeGreaterThan(0);
      expect(bigints.length).toBeGreaterThan(0);
    });

    it("should handle edge case number values", () => {
      const input = `0, -0, 0.0, -0.0, 0n`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(9); // 5 numbers + 4 commas
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(0);
      expect(tokens[2].value).toBe(-0);
      expect(tokens[4].value).toBe(0.0);
      expect(tokens[6].value).toBe(-0.0);
      expect(tokens[8].type).toBe(TokenType.BIGINT);
      expect(tokens[8].value).toBe(BigInt(0));
    });

    it("should handle very large and very small numbers", () => {
      const input = `1e308, 1e-308, 9007199254740991, -9007199254740991`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(7);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(1e308);
      expect(tokens[2].value).toBe(1e-308);
      expect(tokens[4].value).toBe(9007199254740991);
      expect(tokens[6].value).toBe(-9007199254740991);
    });

    it("should distinguish numbers from similar strings", () => {
      const input = `42, "42", 3.14, "3.14", 0xFF, "0xFF"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(11); // 6 values + 5 commas
      
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(42);
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("42");
      
      expect(tokens[4].type).toBe(TokenType.NUMBER);
      expect(tokens[4].value).toBe(3.14);
      expect(tokens[6].type).toBe(TokenType.STRING);
      expect(tokens[6].value).toBe("3.14");
      
      expect(tokens[8].type).toBe(TokenType.NUMBER);
      expect(tokens[8].value).toBe(255);
      expect(tokens[10].type).toBe(TokenType.STRING);
      expect(tokens[10].value).toBe("0xFF");
    });
  });
});