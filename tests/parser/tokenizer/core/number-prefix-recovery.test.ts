import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

/**
 * A non-decimal base prefix (0x / 0o / 0b) with no valid digit run.
 *
 * TWO contracts are asserted here, and they were established at different times:
 *
 *  1. The tokenizer NEVER THROWS on this input. Originally these cases reached
 *     `assertNever("Expected a number but got NaN")`, because the scanner consumed the prefix,
 *     found an empty digit run, and called `parseInt("", base)`. That contract is unchanged.
 *
 *  2. The result is a designated `invalid-number` ERROR token, not an OPEN_STRING. This REPLACES
 *     the original fallback (ADR 0003 §2). Reading `0xGH` as the string "0xGH" was not a missing
 *     diagnostic but a different VALUE: an implementation that rejects and one that returns a
 *     string disagree about what the document contains, which is the divergence a shared
 *     conformance corpus exists to prevent.
 *
 * The distinction the fix must preserve: a prefix ANNOUNCES a base, so `0xG` is a failed number.
 * A number-prefixed WORD announces nothing and stays an open string — see the guardrails below.
 */
describe("Number prefix recovery", () => {
  const invalidNumberCases: Array<[string, string]> = [
    ["bare hex prefix", "0x"],
    ["bare hex prefix upper", "0X"],
    ["bare octal prefix", "0o"],
    ["bare binary prefix", "0b"],
    ["hex prefix, invalid first digit", "0xG"],
    ["octal prefix, invalid first digit", "0o9"],
    ["binary prefix, invalid first digit", "0b2"],
  ];

  for (const [label, input] of invalidNumberCases) {
    it(`does not throw and reports invalid-number for ${label} (${input})`, () => {
      const tokenizer = new Tokenizer(input);
      expect(() => tokenizer.tokenize()).not.toThrow();

      const tokens = new Tokenizer(input).tokenize();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.ERROR);
      expect((tokens[0].value as any).errorCode).toBe("invalid-number");
      // The token text stays faithful to the input, so a caller can show what was written.
      expect(tokens[0].token).toBe(input);
    });
  }

  // Guardrails: valid base numbers must be unaffected.
  it("still tokenizes valid base numbers", () => {
    expect(new Tokenizer("0xFF").tokenize()[0]).toMatchObject({ type: TokenType.NUMBER, subType: "HEX", value: 255 });
    expect(new Tokenizer("0b1010").tokenize()[0]).toMatchObject({ type: TokenType.NUMBER, subType: "BINARY", value: 10 });
    expect(new Tokenizer("0o755").tokenize()[0]).toMatchObject({ type: TokenType.NUMBER, subType: "OCTAL", value: 493 });
  });

  it("reports invalid-number when a valid digit is followed by junk", () => {
    const tokens = new Tokenizer("0b12").tokenize();
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe(TokenType.ERROR);
    expect((tokens[0].value as any).errorCode).toBe("invalid-number");
    expect(tokens[0].token).toBe("0b12");
  });

  // The line between "a failed number" and "a word that starts with a digit". Only a base prefix
  // makes the claim, so measurements and CSS-style units must survive untouched — this guardrail is
  // what keeps `invalid-number` from swallowing ordinary open strings.
  it("leaves number-prefixed words as OPEN_STRING", () => {
    for (const word of ["3pm", "5km", "2cm", "12mm", "5em", "007th"]) {
      const tokens = new Tokenizer(word).tokenize();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.STRING);
      expect(tokens[0].subType).toBe("OPEN_STRING");
      expect(tokens[0].value).toBe(word);
    }
  });

  // `...` is the schema spread, not a malformed number. The multi-dot rule must require at least
  // one digit, or compiling `{ name: string, ...: number }` fails with a tokenizer error.
  it("leaves the schema spread alone", () => {
    const tokens = new Tokenizer("...").tokenize();
    expect(tokens[0].type).not.toBe(TokenType.ERROR);
  });
});
