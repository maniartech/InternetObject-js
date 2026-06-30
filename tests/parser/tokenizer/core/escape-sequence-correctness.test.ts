import Tokenizer from "../../../../src/parser/tokenizer";

/**
 * Correctness tests for string escape sequences.
 *
 * Before the fix, recognized escapes (\n \t \r \b \f \u \x) left a trailing source
 * character in the value because `escapeString` appended the decoded character but did
 * not advance past the escape char (and \u/\x advanced one short). Examples of the BUG:
 *   "a\nb"    -> "a\nnb"   (extra 'n')
 *   "A"  -> "A1"      (extra '1')
 * The escape must consume its entire sequence and decode to exactly the intended char(s).
 */
describe("Escape sequence correctness", () => {
  const val = (io: string) => new Tokenizer(io).tokenize()[0].value;

  it("decodes \\n to a single newline with no trailing char", () => {
    expect(val(`"a\\nb"`)).toBe("a\nb");
  });
  it("decodes \\t to a single tab", () => {
    expect(val(`"x\\ty"`)).toBe("x\ty");
  });
  it("decodes \\r to a single carriage return", () => {
    expect(val(`"x\\ry"`)).toBe("x\ry");
  });
  it("decodes \\b and \\f to two control chars only", () => {
    expect(val(`"\\b\\f"`)).toBe("\b\f");
  });
  it("decodes \\u0041 to exactly 'A'", () => {
    expect(val(`"\\u0041"`)).toBe("A");
  });
  it("decodes consecutive \\u escapes with no stray digits", () => {
    expect(val(`"\\u0041\\u0042\\u0043"`)).toBe("ABC");
  });
  it("decodes \\x41 to exactly 'A'", () => {
    expect(val(`"\\x41"`)).toBe("A");
  });

  // Guardrails: escapes that were already correct must stay correct.
  it("still handles quote and backslash escapes", () => {
    expect(val(`"say \\"hi\\""`)).toBe('say "hi"');
    expect(val(`"back\\\\slash"`)).toBe("back\\slash");
  });
});
