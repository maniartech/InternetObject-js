import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";
import { TokenErrorValue } from "../../../../src/parser/tokenizer/tokens";

/**
 * A `n` (BigInt) suffix on a non-integer mantissa is invalid (BigInt is integer-only).
 * It must NOT crash and must NOT silently become an OPEN_STRING (a number-looking value would
 * be misleading) — it must produce an ERROR token with the designated `invalid-bigint` code,
 * exactly like `invalid-base64` / `invalid-datetime` for the other typed literals.
 */
describe("Invalid BigInt literals", () => {
  const tokenize = (s: string) => new Tokenizer(s).tokenize();

  it("reports invalid-bigint (no throw) for a decimal-point mantissa", () => {
    expect(() => tokenize("12.3n")).not.toThrow();
    const toks = tokenize("12.3n");
    expect(toks).toHaveLength(1);
    expect(toks[0].type).toBe(TokenType.ERROR);
    expect((toks[0].value as TokenErrorValue).errorCode).toBe("invalid-bigint");
    expect(toks[0].token).toBe("12.3n");
  });

  it("reports invalid-bigint (no throw) for an exponent mantissa", () => {
    expect(() => tokenize("12e5n")).not.toThrow();
    const toks = tokenize("12e5n");
    expect(toks[0].type).toBe(TokenType.ERROR);
    expect((toks[0].value as TokenErrorValue).errorCode).toBe("invalid-bigint");
  });

  it("recovers and keeps tokenizing after an invalid bigint", () => {
    const toks = tokenize("12.3n, 5");
    expect(toks[0].type).toBe(TokenType.ERROR);
    expect((toks[0].value as TokenErrorValue).errorCode).toBe("invalid-bigint");
    expect(toks.some(t => t.type === TokenType.NUMBER && t.value === 5)).toBe(true);
  });

  it("still tokenizes valid bigints unchanged", () => {
    expect(tokenize("12n")[0]).toMatchObject({ type: TokenType.BIGINT, value: 12n });
    expect(tokenize("0xFFn")[0]).toMatchObject({ type: TokenType.BIGINT, value: 255n });
    expect(tokenize("-123n")[0]).toMatchObject({ type: TokenType.BIGINT, value: -123n });
  });
});
