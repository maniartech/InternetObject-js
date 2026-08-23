import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";
import { TokenErrorValue } from "../../../../src/parser/tokenizer/tokens";

/**
 * A lowercase `m` (Decimal) suffix on an invalid mantissa is invalid: per the decimal spec a
 * decimal needs a leading AND trailing digit around the point (`.5m`, `123.m` are invalid).
 * It must NOT crash and must NOT become an OPEN_STRING — it is a designated `invalid-decimal`
 * ERROR token, parallel to invalid-base64 / invalid-datetime / invalid-bigint.
 *
 * Capital `M` is NOT a decimal suffix — it is excluded and stays OPEN_STRING.
 * (The multi-dot case `12.34.56m` is a separate, tracked follow-up — see FINDINGS #7.)
 */
describe("Invalid Decimal literals", () => {
  const tokenize = (s: string) => new Tokenizer(s).tokenize();
  const code = (t: any) => (t.value as TokenErrorValue).errorCode;

  it("reports invalid-decimal (no throw) for a missing leading digit", () => {
    expect(() => tokenize(".5m")).not.toThrow();
    const toks = tokenize(".5m");
    expect(toks).toHaveLength(1);
    expect(toks[0].type).toBe(TokenType.ERROR);
    expect(code(toks[0])).toBe("invalid-decimal");
    expect(toks[0].token).toBe(".5m");
  });

  it("reports invalid-decimal (no throw) for a missing trailing digit", () => {
    expect(() => tokenize("123.m")).not.toThrow();
    const toks = tokenize("123.m");
    expect(toks[0].type).toBe(TokenType.ERROR);
    expect(code(toks[0])).toBe("invalid-decimal");
  });

  it("recovers and keeps tokenizing after an invalid decimal", () => {
    const toks = tokenize(".5m, 7");
    expect(toks[0].type).toBe(TokenType.ERROR);
    expect(code(toks[0])).toBe("invalid-decimal");
    expect(toks.some(t => t.type === TokenType.NUMBER && t.value === 7)).toBe(true);
  });

  it("still tokenizes valid decimals unchanged", () => {
    expect(tokenize("1.5m")[0].type).toBe(TokenType.DECIMAL);
    expect(tokenize("123.456m")[0].type).toBe(TokenType.DECIMAL);
    expect(tokenize("0m")[0].type).toBe(TokenType.DECIMAL);
  });

  it("leaves capital M and number-prefixed words as OPEN_STRING (not decimal, not error)", () => {
    // NOTE: "10mm" is deliberately excluded — `10m` is a valid decimal, so the second `m` merges
    // and surfaces a *separate* pre-existing oddity (`10mm` -> "10fm"); see FINDINGS.
    for (const s of ["1.5M", ".3M", "3pm", "5km"]) {
      const toks = tokenize(s);
      expect(toks).toHaveLength(1);
      expect(toks[0].type).toBe(TokenType.STRING);
      expect(toks[0].subType).toBe("OPEN_STRING");
      expect(toks[0].value).toBe(s);
    }
  });
});
