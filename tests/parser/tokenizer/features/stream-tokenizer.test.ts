import Tokenizer from "../../../../src/parser/tokenizer";
import StreamTokenizer, { tokenizeChunks } from "../../../../src/parser/tokenizer/stream-tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";
import type Token from "../../../../src/parser/tokenizer/tokens";

function valueSig(v: any): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "bigint") return `${v}n`;
  if (v instanceof Date) return `date:${v.getTime()}`;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(v)) return `bin:${v.toString("base64")}`;
  if (typeof v === "object" && typeof v.toString === "function") return `obj:${v.toString()}`;
  return String(v);
}

/** A signature that captures token identity, value, AND absolute position. */
function sig(t: Token): string {
  const parts: any[] = [t.type, t.subType ?? "", t.pos, t.row, t.col, JSON.stringify(t.token)];
  if (t.type === TokenType.ERROR) {
    const ev: any = t.value;
    parts.push("err", ev?.errorCode ?? "");
    const r = ev?.originalError?.positionRange;
    if (r && typeof r.getStartPos === "function") {
      const s = r.getStartPos();
      parts.push(s.pos, s.row, s.col);
    }
  } else {
    parts.push(valueSig(t.value));
  }
  return parts.join("|");
}

const sigs = (toks: readonly Token[]) => toks.map(sig);

const INPUTS: Record<string, string> = {
  "simple object": `~ { id: 1, name: "Alice" }\n`,
  "header + records": `~ $User: { name: string, age: int }\n--- $User\n~ Alice, 30\n~ Bob, 25\n`,
  "schema-only sections": `--- $User\n~ Alice\n--- $Order\n~ 1001\n`,
  "name and schema header": `--- name: $Schema\n~ x\n`,
  "multiline string": `~ { note: "line1\nline2\nline3" }\n`,
  "comments": `# header comment\n~ a, b # trailing\n~ c\n`,
  "numbers and merges": `~ 123, 1.5e3, 0xFF, 2abc, +Inf, -3, 9n\n`,
  "annotated strings": `~ r"raw text", b"SGVsbG8=", dt"2020-01-01T00:00:00Z"\n`,
  "unterminated string at EOF": `~ { a: "oops\n`,
  "multibyte": `~ { m: "Hello 🚀 世界" }\n`,
  "empty": ``,
  "whitespace only": `   \n\n  \n`,
  "bare separators": `---\n---\n`,
};

describe("StreamTokenizer — equivalence with batch tokenizer", () => {
  for (const [name, input] of Object.entries(INPUTS)) {
    const expected = sigs(new Tokenizer(input).tokenize());

    it(`${name}: whole feed matches tokenize()`, () => {
      expect(sigs(tokenizeChunks([input]))).toEqual(expected);
    });

    it(`${name}: every 2-way split matches tokenize()`, () => {
      for (let k = 1; k < input.length; k++) {
        const chunks = [input.slice(0, k), input.slice(k)];
        const got = sigs(tokenizeChunks(chunks));
        // Include k in the failure message for fast localization.
        expect(got, `split at ${k} of ${input.length}`).toEqual(expected);
      }
    });

    it(`${name}: per-character feed matches tokenize()`, () => {
      const chunks = Array.from(input); // splits by code point
      expect(sigs(tokenizeChunks(chunks))).toEqual(expected);
      // also per UTF-16 code unit (can split surrogate pairs across feeds)
      const units = input.split("");
      expect(sigs(tokenizeChunks(units))).toEqual(expected);
    });
  }
});

describe("StreamTokenizer — streaming behavior", () => {
  it("releases complete tokens before end(), retaining only the provisional tail", () => {
    const st = new StreamTokenizer();
    const emitted = st.feed(`~ 100, 200, 30`); // last number is provisional
    // Earlier tokens are released immediately; the trailing '30' is held back.
    expect(emitted.length).toBeGreaterThan(0);
    expect(emitted.some((t) => t.type === TokenType.NUMBER && t.value === 30)).toBe(false);
    expect(emitted.some((t) => t.type === TokenType.COLLECTION_START)).toBe(true);

    const rest = st.feed(`0\n`); // '30' -> '300'
    const all = [...emitted, ...rest, ...st.end()];
    const threeHundred = all.find((t) => t.type === TokenType.NUMBER && t.value === 300);
    expect(threeHundred).toBeDefined();
  });

  it("does not split a section header arriving across chunks", () => {
    const st = new StreamTokenizer();
    const a = st.feed(`--- $Us`); // header schema is incomplete -> retained as a unit
    expect(a.find((t) => t.subType === TokenType.SECTION_SCHEMA)).toBeUndefined();
    const b = st.feed(`er\n~ Alice\n`);
    const all = [...a, ...b, ...st.end()];
    const schema = all.find((t) => t.subType === TokenType.SECTION_SCHEMA);
    expect(schema?.value).toBe("$User");
    // and the separator/collection markers survive exactly once
    expect(all.filter((t) => t.type === TokenType.SECTION_SEP)).toHaveLength(1);
    expect(all.filter((t) => t.type === TokenType.COLLECTION_START)).toHaveLength(1);
  });

  it("rebases positions to stream-absolute across many chunks", () => {
    const input = `~ a\n~ bb\n~ ccc\n`;
    const st = new StreamTokenizer();
    const all: Token[] = [];
    for (const ch of Array.from(input)) all.push(...st.feed(ch));
    all.push(...st.end());
    // Compare against batch positions token-for-token.
    expect(sigs(all)).toEqual(sigs(new Tokenizer(input).tokenize()));
  });

  it("throws if fed after end()", () => {
    const st = new StreamTokenizer();
    st.end();
    expect(() => st.feed("x")).toThrow();
  });
});
