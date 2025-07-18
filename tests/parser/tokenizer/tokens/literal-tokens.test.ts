import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

describe("Literal Token Parsing", () => {
  describe("Boolean Literals", () => {
    it("should parse boolean literals", () => {
      const input = `true, false, T, F`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(7);
      expect(tokens[0].type).toBe(TokenType.BOOLEAN);
      expect(tokens[0].value).toBe(true);
      
      expect(tokens[2].type).toBe(TokenType.BOOLEAN);
      expect(tokens[2].value).toBe(false);
      
      expect(tokens[4].type).toBe(TokenType.BOOLEAN);
      expect(tokens[4].value).toBe(true);
      
      expect(tokens[6].type).toBe(TokenType.BOOLEAN);
      expect(tokens[6].value).toBe(false);
    });

    it("should tokenize boolean tokens", () => {
      const input = `T, F, true, false`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toEqual(7);
      const expected = [true, false, true, false];

      for (let i = 0; i < tokens.length; i++) {
        if (i % 2 === 0) {
          expect(tokens[i].type).toEqual(TokenType.BOOLEAN);
          expect(tokens[i].value).toEqual(expected[i / 2]);
        } else {
          expect(tokens[i].type).toEqual(TokenType.COMMA);
        }
      }
    });
  });

  describe("Null Literals", () => {
    it("should parse null literals", () => {
      const input = `null, N`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TokenType.NULL);
      expect(tokens[0].value).toBe(null);
      
      expect(tokens[2].type).toBe(TokenType.NULL);
      expect(tokens[2].value).toBe(null);
    });
  });

  describe("Special Number Literals", () => {
    it("should parse Infinity literals", () => {
      const input = `Inf, +Inf, -Inf`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBe(Infinity);
      
      expect(tokens[2].type).toBe(TokenType.NUMBER);
      expect(tokens[2].value).toBe(Infinity);
      
      expect(tokens[4].type).toBe(TokenType.NUMBER);
      expect(tokens[4].value).toBe(-Infinity);
    });

    it("should parse NaN literal", () => {
      const input = `NaN`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.NUMBER);
      expect(tokens[0].value).toBeNaN();
    });

    it("should handle special numbers in context", () => {
      const input = `[Inf, -Inf, NaN, null, true, false]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // Find the special values
      const infToken = tokens.find(t => t.value === Infinity && t.token === "Inf");
      const negInfToken = tokens.find(t => t.value === -Infinity);
      const nanToken = tokens.find(t => Number.isNaN(t.value));
      const nullToken = tokens.find(t => t.value === null);
      const trueToken = tokens.find(t => t.value === true);
      const falseToken = tokens.find(t => t.value === false);

      expect(infToken).toBeDefined();
      expect(infToken?.type).toBe(TokenType.NUMBER);
      
      expect(negInfToken).toBeDefined();
      expect(negInfToken?.type).toBe(TokenType.NUMBER);
      
      expect(nanToken).toBeDefined();
      expect(nanToken?.type).toBe(TokenType.NUMBER);
      
      expect(nullToken).toBeDefined();
      expect(nullToken?.type).toBe(TokenType.NULL);
      
      expect(trueToken).toBeDefined();
      expect(trueToken?.type).toBe(TokenType.BOOLEAN);
      
      expect(falseToken).toBeDefined();
      expect(falseToken?.type).toBe(TokenType.BOOLEAN);
    });
  });

  describe("Literal Context Sensitivity", () => {
    it("should distinguish literals from similar strings", () => {
      const input = `true, "true", T, "T", null, "null", N, "N"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(15);
      
      // true literal
      expect(tokens[0].type).toBe(TokenType.BOOLEAN);
      expect(tokens[0].value).toBe(true);
      
      // "true" string
      expect(tokens[2].type).toBe(TokenType.STRING);
      expect(tokens[2].value).toBe("true");
      
      // T literal
      expect(tokens[4].type).toBe(TokenType.BOOLEAN);
      expect(tokens[4].value).toBe(true);
      
      // "T" string
      expect(tokens[6].type).toBe(TokenType.STRING);
      expect(tokens[6].value).toBe("T");
      
      // null literal
      expect(tokens[8].type).toBe(TokenType.NULL);
      expect(tokens[8].value).toBe(null);
      
      // "null" string
      expect(tokens[10].type).toBe(TokenType.STRING);
      expect(tokens[10].value).toBe("null");
      
      // N literal
      expect(tokens[12].type).toBe(TokenType.NULL);
      expect(tokens[12].value).toBe(null);
      
      // "N" string
      expect(tokens[14].type).toBe(TokenType.STRING);
      expect(tokens[14].value).toBe("N");
    });

    it("should handle case sensitivity correctly", () => {
      const input = `True, TRUE, False, FALSE, Null, NULL`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(11);
      
      // All should be parsed as open strings, not literals
      for (let i = 0; i < tokens.length; i += 2) {
        expect(tokens[i].type).toBe(TokenType.STRING);
        expect(tokens[i].subType).toBe("OPEN_STRING");
      }
    });
  });

  describe("Mixed Literal Types", () => {
    it("should handle mixed literal types in arrays", () => {
      const input = `[true, false, null, Inf, NaN]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const literalTokens = tokens.filter(t => 
        t.type === TokenType.BOOLEAN || 
        t.type === TokenType.NULL || 
        t.type === TokenType.NUMBER
      );

      expect(literalTokens).toHaveLength(5);
      expect(literalTokens[0].value).toBe(true);
      expect(literalTokens[1].value).toBe(false);
      expect(literalTokens[2].value).toBe(null);
      expect(literalTokens[3].value).toBe(Infinity);
      expect(literalTokens[4].value).toBeNaN();
    });

    it("should handle mixed literal types in objects", () => {
      const input = `{
        bool: true,
        nullVal: null,
        inf: Inf,
        nan: NaN,
        negInf: -Inf
      }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const boolToken = tokens.find(t => t.value === true);
      const nullToken = tokens.find(t => t.value === null);
      const infToken = tokens.find(t => t.value === Infinity && t.token === "Inf");
      const nanToken = tokens.find(t => Number.isNaN(t.value));
      const negInfToken = tokens.find(t => t.value === -Infinity);

      expect(boolToken?.type).toBe(TokenType.BOOLEAN);
      expect(nullToken?.type).toBe(TokenType.NULL);
      expect(infToken?.type).toBe(TokenType.NUMBER);
      expect(nanToken?.type).toBe(TokenType.NUMBER);
      expect(negInfToken?.type).toBe(TokenType.NUMBER);
    });
  });
});