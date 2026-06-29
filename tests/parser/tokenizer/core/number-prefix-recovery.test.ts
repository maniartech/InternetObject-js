import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

/**
 * Regression tests for the lenient-tokenizer contract:
 * a non-decimal base prefix (0x / 0o / 0b) with NO valid leading digits is an
 * invalid number and MUST fall back to an OPEN_STRING token — never crash.
 *
 * Before the fix, these inputs reached `assertNever("Expected a number but got NaN")`
 * because the scanner consumed the prefix, found an empty digit run, and called
 * parseInt("", base) === NaN.
 */
describe("Number prefix recovery (lenient fallback)", () => {
  const openStringCases: Array<[string, string]> = [
    ["bare hex prefix", "0x"],
    ["bare hex prefix upper", "0X"],
    ["bare octal prefix", "0o"],
    ["bare binary prefix", "0b"],
    ["hex prefix, invalid first digit", "0xG"],
    ["octal prefix, invalid first digit", "0o9"],
    ["binary prefix, invalid first digit", "0b2"],
  ];

  for (const [label, input] of openStringCases) {
    it(`does not throw and yields OPEN_STRING for ${label} (${input})`, () => {
      const tokenizer = new Tokenizer(input);
      expect(() => tokenizer.tokenize()).not.toThrow();

      const tokens = new Tokenizer(input).tokenize();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("OPEN_STRING");
      expect(tokens[0].value).toBe(input);
      expect(tokens[0].token).toBe(input);
    });
  }

  // Guardrails: valid base numbers and trailing-digit fallbacks must be unaffected.
  it("still tokenizes valid base numbers", () => {
    expect(new Tokenizer("0xFF").tokenize()[0]).toMatchObject({ type: TokenType.NUMBER, subType: "HEX", value: 255 });
    expect(new Tokenizer("0b1010").tokenize()[0]).toMatchObject({ type: TokenType.NUMBER, subType: "BINARY", value: 10 });
    expect(new Tokenizer("0o755").tokenize()[0]).toMatchObject({ type: TokenType.NUMBER, subType: "OCTAL", value: 493 });
  });

  it("still falls back to OPEN_STRING when a valid digit is followed by junk", () => {
    const tokens = new Tokenizer("0b12").tokenize();
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].subType).toBe("OPEN_STRING");
    expect(tokens[0].value).toBe("0b12");
  });
});
