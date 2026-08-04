import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";
import { TokenErrorValue } from "../../../../src/parser/tokenizer/tokens";

/**
 * A multi-dot (clearly non-numeric) mantissa with a lowercase m/n suffix is a botched typed
 * literal, not a string: `12.34.56m` -> invalid-decimal, `12.34.56n` -> invalid-bigint.
 * The second dot makes the number scanner bail to an OPEN_STRING *before* the suffix, so this is
 * caught at the merge step with a NARROW guard (only digits/dots before a final m/n), so
 * number-prefixed words like `3pm` / `5km` / `2cm` and dotless/suffixless runs stay OPEN_STRING.
 */
describe("Multi-dot mantissa with a typed suffix", () => {
  const tokenize = (s: string) => new Tokenizer(s).tokenize();
  const code = (t: any) => (t.value as TokenErrorValue).errorCode;

  it("reports invalid-decimal for a multi-dot `m` literal", () => {
    expect(() => tokenize("12.34.56m")).not.toThrow();
    const toks = tokenize("12.34.56m");
    expect(toks).toHaveLength(1);
    expect(toks[0].type).toBe(TokenType.ERROR);
    expect(code(toks[0])).toBe("invalid-decimal");
    expect(toks[0].token).toBe("12.34.56m");
  });

  it("reports invalid-bigint for a multi-dot `n` literal", () => {
    const toks = tokenize("12.34.56n");
    expect(toks[0].type).toBe(TokenType.ERROR);
    expect(code(toks[0])).toBe("invalid-bigint");
  });

  it("recovers and keeps tokenizing after a multi-dot invalid literal", () => {
    const toks = tokenize("1.2.3m, 7");
    expect(toks[0].type).toBe(TokenType.ERROR);
    expect(code(toks[0])).toBe("invalid-decimal");
    expect(toks.some(t => t.type === TokenType.NUMBER && t.value === 7)).toBe(true);
  });

  it("leaves number-prefixed words and suffixless multi-dots as OPEN_STRING", () => {
    for (const s of ["3pm", "5km", "2cm", "12.34.56", "1.2.3"]) {
      const toks = tokenize(s);
      expect(toks).toHaveLength(1);
      expect(toks[0].type).toBe(TokenType.STRING);
      expect(toks[0].subType).toBe("OPEN_STRING");
      expect(toks[0].value).toBe(s);
    }
  });

  // A dangling/incomplete exponent before the suffix (`5e`) is NOT a pure number → OPEN_STRING,
  // not a typed-literal error. A COMPLETE exponent (`12e5`) remains a valid typed literal.
  it("treats an incomplete scientific mantissa + suffix as OPEN_STRING (5em / 5en)", () => {
    for (const s of ["5em", "5en", "5e+m", "12Em", "12E-n"]) {
      const toks = tokenize(s);
      expect(toks).toHaveLength(1);
      expect(toks[0].type).toBe(TokenType.STRING);
      expect(toks[0].subType).toBe("OPEN_STRING");
      expect(toks[0].value).toBe(s);
    }
  });

  it("still accepts a complete scientific bigint (12e5n)", () => {
    expect(tokenize("12e5n")[0]).toMatchObject({ type: TokenType.BIGINT, value: 1200000n });
  });
});
