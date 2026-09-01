import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

/**
 * A doubled enclosing quote is the raw string's ONLY escape.
 *
 * `io-specs/the-structure/values/string/raw-strings.md` has said so in three places — the prose
 * ("the enclosing quote ... is written by doubling it inside the string"), the EBNF
 * (`doubleSingleQuote`, `doubleDoubleQuote`), and two worked examples — and it was never
 * implemented. Both of the spec's own examples reported `unexpected-token`.
 *
 * It stayed hidden because that page's **Invalid forms** block is executed by the spec's example
 * runner while its **Valid forms** block was one of the 88 skipped fragments. So the page proved
 * the wrong spelling fails and never checked the right one works.
 *
 * The gap was real, not cosmetic: without doubling, a raw string cannot hold its own enclosing
 * quote, and the "use the other quote kind" workaround dies on a value needing BOTH — such as a
 * regex matching either quote, which is exactly what raw strings exist for.
 *
 * Raw strings only. `b`, `d`, `t` and `dt` carry content that cannot contain a quote.
 */
const first = (input: string) => new Tokenizer(input).tokenize()[0];

describe("raw strings: a doubled enclosing quote", () => {
  describe("the specification's own examples", () => {
    it("r'Jonas D''costa' is one string holding an apostrophe", () => {
      const t = first(`r'Jonas D''costa'`);
      expect(t.type).toBe(TokenType.STRING);
      expect(t.subType).toBe("RAW_STRING");
      expect(t.value).toBe("Jonas D'costa");
    });

    it('r"He said, ""Hello!""" is one string holding double quotes', () => {
      const t = first(`r"He said, ""Hello!"""`);
      expect(t.type).toBe(TokenType.STRING);
      expect(t.value).toBe('He said, "Hello!"');
    });
  });

  describe("what it makes expressible", () => {
    it("a value containing BOTH quote kinds — impossible before", () => {
      // A regex matching either quote. Neither quote kind alone could enclose this.
      const t = first(`r'[''"]'`);
      expect(t.value).toBe(`['"]`);
    });

    it("several doubled quotes in one string", () => {
      expect(first(`r'a''b''c'`).value).toBe("a'b'c");
    });

    it("a doubled quote at the very start and end", () => {
      expect(first(`r'''a'''`).value).toBe("'a'");
    });

    it("only the ENCLOSING quote doubles; the other kind is literal and single", () => {
      expect(first(`r'say ""hi"" ok'`).value).toBe('say ""hi"" ok');
      expect(first(`r"it''s"`).value).toBe("it''s");
    });
  });

  describe("what must NOT change", () => {
    it("a single unescaped quote still ends the string", () => {
      // The spec's Invalid forms block depends on this: r'Jonas D'costa' must still fail.
      expect(first(`r'Jonas D'`).value).toBe("Jonas D");
    });

    it("an unterminated raw string is still an error", () => {
      expect(first(`r'oops`).type).toBe(TokenType.ERROR);
    });

    it("a trailing doubled quote at end of input does not swallow the terminator", () => {
      // `r'a''` is unterminated: the `''` is an escape, so no closing quote was ever seen.
      expect(first(`r'a''`).type).toBe(TokenType.ERROR);
    });

    it("plain raw strings and backslashes are untouched", () => {
      expect(first(`r'C:\\path\\app.exe'`).value).toBe("C:\\path\\app.exe");
      expect(first(`r'plain'`).value).toBe("plain");
    });

    it("the other annotations do NOT take a doubled quote", () => {
      // b/d/t/dt carry content that cannot contain a quote, so `''` is not an escape there and
      // the string ends at the first quote, exactly as before.
      expect(first(`b'SGVsbG8='`).type).toBe(TokenType.BINARY);
      expect(first(`dt'2026-01-01'`).type).toBe(TokenType.DATETIME);
      // and a doubled quote there is NOT an escape — the string ends at the first quote, so the
      // trailing text is left over and the base64 content is whatever preceded it.
      expect(first(`b'SGVs''bG8='`).value).not.toBe("SGVs'bG8=");
    });
  });
});
