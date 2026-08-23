import { describe, test, expect } from 'vitest';
import parse from '../../src/parser/index';
import { stringifyDocument } from '../../src/facade/stringify-document';
import loadInferred from '../../src/facade/load-inferred';
import Decimal from '../../src/core/decimal/decimal';

/**
 * ISSUE-16 — serializer round-trip defects found while writing the serialization spec.
 *
 * Each case violated round-trip invariant 2 from the specification `serialization/round-trip.md`:
 * a writer's output MUST parse, and MUST yield the same value model.
 */

/** Serialize data-only. */
const data = (src: string) => stringifyDocument(parse(src, null) as any, { includeHeader: false });
/** Serialize the whole document (header + data). */
const full = (src: string) =>
  stringifyDocument(parse(src, null) as any, { includeHeader: true, includeTypes: true });

/** Value model, with byte arrays and bigints normalized so they compare structurally. */
const model = (doc: any) =>
  JSON.stringify(doc.toJSON(), (_k, v) =>
    typeof v === 'bigint' ? `${v}n` : v instanceof Uint8Array ? Array.from(v) : v
  );

/** Assert: writing then re-parsing preserves the value model. */
function roundTrips(src: string, whole = false) {
  const before: any = parse(src, null);
  const out = whole ? full(src) : data(src);
  const after: any = parse(whole ? out : `---\n${out}`, null);
  expect(after.getErrors()).toEqual([]);
  expect(model(after)).toBe(model(before));
}

describe('binary values serialize as a base64 literal', () => {
  test('a byte array is written b"…", not an object of byte indices', () => {
    expect(data("---\n{a: b'SGVsbG8='}")).toBe('a: b"SGVsbG8="');
  });

  test('binary round-trips', () => roundTrips("---\n{a: b'SGVsbG8='}"));

  test('binary inside an array round-trips', () =>
    roundTrips("---\n{a: [b'SGVsbG8=', b'V29ybGQ=']}"));

  test('binary under a schema round-trips', () =>
    roundTrips("~ $schema: {v: any}\n---\nb'SGVsbG8='", true));
});

describe('special numbers use the IO spellings', () => {
  test('Inf / -Inf / NaN, not the JavaScript spellings', () => {
    // `Infinity` re-parses as the STRING "Infinity"; `NaN` re-parsed as null.
    expect(data('---\n{a: Inf, b: -Inf, c: NaN}')).toBe('a: Inf, b: -Inf, c: NaN');
  });

  test('special numbers round-trip', () => roundTrips('---\n{a: Inf, b: -Inf, c: NaN}'));

  test('special numbers round-trip under a schema', () =>
    roundTrips('~ $schema: {a: any, b: any}\n---\nInf, NaN', true));
});

describe('a string containing the section separator is quoted', () => {
  test('`---` inside a value does not tear the document', () => {
    expect(data('---\n{a: "x --- y"}')).toBe('a: "x --- y"');
  });

  test('separator-bearing string round-trips', () => roundTrips('---\n{a: "x --- y"}'));

  test('separator-bearing string round-trips under a schema', () =>
    roundTrips('~ $schema: {s: string}\n---\n"x --- y"', true));
});

describe('a radix `format` keeps its prefix and its type suffix', () => {
  // ISSUE-16 row d. `format` selects a BASE, not a type: bare `ff` re-parses as an open string
  // and the member's OWN schema then rejects it.
  const withFormat = (type: string, format: string, literal: string) =>
    `~ $schema: {a: {type: ${type}, format: ${format}}}\n---\n${literal}`;

  test('bigint radix literals keep `0x`/`0o`/`0b` and `n`', () => {
    expect(full(withFormat('bigint', 'hex', '0xffn'))).toContain('0xffn');
    expect(full(withFormat('bigint', 'octal', '0o77n'))).toContain('0o77n');
    expect(full(withFormat('bigint', 'binary', '0b1010n'))).toContain('0b1010n');
  });

  test('a bigint with the explicit `decimal` format still keeps its `n`', () => {
    expect(full(withFormat('bigint', 'decimal', '42n'))).toContain('42n');
  });

  test('int radix literals keep their prefix', () => {
    expect(full(withFormat('int', 'hex', '0xff'))).toContain('0xff');
  });

  test('a fractional value falls back to decimal — there is no radix literal for it', () => {
    expect(full(withFormat('number', 'hex', '3.14'))).toContain('3.14');
  });

  test('a bigint scientific literal keeps an integer mantissa and a non-negative exponent', () => {
    // A bigint has no fractional part, so trailing zeros move into the exponent and a value
    // with none is written `e0` — `2.55e2n` would not be a legal bigint literal.
    const sci = (lit: string) => full(withFormat('bigint', 'scientific', lit)).split('---')[1].trim();
    expect(sci('1200000n')).toBe('12e5n');
    expect(sci('100n')).toBe('1e2n');
    expect(sci('255n')).toBe('255e0n');
    expect(sci('0n')).toBe('0e0n');
    expect(sci('-1200000n')).toBe('-12e5n');
    expect(sci('99999999999999999999n')).toBe('99999999999999999999e0n');
  });

  test('bigint scientific round-trips', () => {
    for (const lit of ['1200000n', '100n', '255n', '0n', '-1200000n', '-255n']) {
      roundTrips(withFormat('bigint', 'scientific', lit), true);
    }
  });

  test('decimal has no format option — its only literal is `<digits>.<digits>m`', () => {
    // Radix cannot express a fraction and `1.23e2m` is not a decimal literal, so there is
    // nothing for a `format` to select. Declaring one is a schema error.
    expect(() => parse('~ $schema: {a: {type: decimal, format: scientific}}\n---\n3.14m', null))
      .toThrow(/unknown-member/);
  });

  test('negative radix values round-trip', () => {
    roundTrips(withFormat('bigint', 'hex', '-0xffn'), true);
    roundTrips(withFormat('int', 'hex', '-0xff'), true);
  });

  for (const [type, format, literal] of [
    ['bigint', 'hex', '0xffn'], ['bigint', 'octal', '0o77n'], ['bigint', 'binary', '0b1010n'],
    ['bigint', 'decimal', '42n'], ['int', 'hex', '0xff'], ['number', 'scientific', '1500'],
  ] as const) {
    test(`${type}/${format} round-trips`, () => roundTrips(withFormat(type, format, literal), true));
  }
});

describe('`emitKeys: all` applies at every depth', () => {
  // ISSUE-16 row e. 'all' means self-describing; honouring it only on the top row is half a mode.
  const allKeys = (src: string) =>
    stringifyDocument(parse(src, null) as any, { includeHeader: false, emitKeys: 'all' });

  test('a nested declared object spells out its member names', () => {
    expect(allKeys('~ $schema: {a: string, b: {c: string, d: string}}\n---\nx, {y, z}'))
      .toBe('a: x, b: {c: y, d: z}');
  });

  test('nesting is recursive, not one level deep', () => {
    expect(allKeys('~ $schema: {a: string, b: {c: string, d: {e: string}}}\n---\nx, {y, {z}}'))
      .toBe('a: x, b: {c: y, d: {e: z}}');
  });

  test('objects inside an array are keyed too', () => {
    expect(allKeys('~ $schema: {a: string, b: [{c: string, d: string}]}\n---\nx, [{y, z}, {p, q}]'))
      .toBe('a: x, b: [{c: y, d: z}, {c: p, d: q}]');
  });

  test("'extras' and 'none' leave declared nested members bare", () => {
    const src = '~ $schema: {a: string, b: {c: string, d: string}}\n---\nx, {y, z}';
    for (const emitKeys of ['extras', 'none'] as const) {
      expect(stringifyDocument(parse(src, null) as any, { includeHeader: false, emitKeys }))
        .toBe('x, {y, z}');
    }
  });
});

describe('a sign is spelled before the base prefix, not inside the digits', () => {
  // The tokenizer buffered the sign into the digit run, assembling `0x-ff` — which `BigInt()`
  // rejects outright. Found while making the serializer emit `-0xffn`.
  const valueOf = (literal: string) => {
    const doc: any = parse(`---\n{a: ${literal}}`, null);
    expect(doc.getErrors()).toEqual([]);
    // toObject() keeps the value live; toJSON() spells a bigint as a string.
    return doc.toObject().a;
  };

  test('signed radix bigints parse', () => {
    expect(valueOf('-0xffn')).toBe(-255n);
    expect(valueOf('+0xffn')).toBe(255n);
    expect(valueOf('-0o77n')).toBe(-63n);
    expect(valueOf('-0b1010n')).toBe(-10n);
  });

  test('signed radix numbers keep working', () => {
    expect(valueOf('-0xff')).toBe(-255);
    expect(valueOf('+0xff')).toBe(255);
    expect(valueOf('-0o77')).toBe(-63);
    expect(valueOf('-0b1010')).toBe(-10);
  });

  // A signed but malformed prefix must not THROW — that was the original regression, and it still
  // holds. It no longer degrades to an open string either: a base prefix announces a base, so
  // failing to decode is `invalid-number` rather than a silent string (ADR 0003 §2).
  test('a signed but malformed prefix reports invalid-number, never a throw', () => {
    for (const literal of ['-0x', '-0b2']) {
      const src = `---\n{a: ${literal}}`;
      expect(() => parse(src, null)).not.toThrow();
      const doc: any = parse(src, null);
      const codes = JSON.stringify(doc.toObject()).match(/"errorCode":"([a-z-]+)"/g) ?? [];
      expect(codes.join(',')).toContain('invalid-number');
    }
  });
});

describe('a schema-less temporal value infers its literal kind', () => {
  // ISSUE-16 row f. One `Date` backs all three temporal types, so a value written without a
  // schema has no declared kind. Everything used to flatten to `dt"…"`, which also leaked the
  // 1900-01-01 time sentinel into the output.
  test('d / t / dt survive a schema-less round-trip', () => {
    expect(data('---\n{a: d"2024-03-20", b: t"14:30:00", c: dt"2024-03-20T14:30:00.000Z"}'))
      .toBe('a: d"2024-03-20", b: t"14:30:00", c: dt"2024-03-20T14:30:00.000Z"');
  });

  test('a declared type always wins over inference', () => {
    const src = '~ $schema: {a: date, b: time, c: datetime}\n---\nd"2024-03-20", t"14:30:00", dt"2024-03-20T14:30:00.000Z"';
    expect(full(src).split('---')[1].trim())
      .toBe('d"2024-03-20", t"14:30:00", dt"2024-03-20T14:30:00.000Z"');
  });

  test('the `any` path and the schema-less path agree', () => {
    // These two used to disagree: AnyDef inferred the kind while the schema-less writer did not.
    const src = '~ $schema: {a: any, b: any}\n---\nd"2024-03-20", t"14:30:00"';
    expect(full(src).split('---')[1].trim()).toBe('d"2024-03-20", t"14:30:00"');
  });

  test('inference is value-preserving even when the spelling flips', () => {
    // A midnight datetime writes as a date, and a 1900-01-01 datetime as a time. Both re-parse
    // to the very same instant — only the literal differs from the input text, which is what
    // the specification permits ("infer only what the value evidences").
    expect(data('---\n{a: dt"2024-03-20T00:00:00.000Z"}')).toBe('a: d"2024-03-20"');
    expect(data('---\n{a: dt"1900-01-01T14:30:00.000Z"}')).toBe('a: t"14:30:00"');
    for (const src of [
      '---\n{a: d"2024-03-20"}', '---\n{a: t"14:30:00"}',
      '---\n{a: dt"2024-03-20T14:30:00.000Z"}',
      '---\n{a: dt"1900-01-01T14:30:00.000Z"}', '---\n{a: dt"2024-03-20T00:00:00.000Z"}',
    ]) roundTrips(src);
  });

  test('a temporal value inside a container infers too', () => {
    expect(data('---\n{a: [d"2024-03-20", t"14:30:00"]}')).toBe('a: [d"2024-03-20", t"14:30:00"]');
  });
});

describe('the fixes do not disturb neighbouring forms', () => {
  test('ordinary numbers keep their plain form', () => {
    expect(data('---\n{a: 42, b: -7, c: 3.14, d: 1e21}')).toBe('a: 42, b: -7, c: 3.14, d: 1e+21');
  });

  test('bigint and decimal keep their type suffixes', () => {
    expect(data('---\n{a: 42n, b: 3.14m}')).toBe('a: 42n, b: 3.14m');
  });

  test('a plain string without `---` stays unquoted', () => {
    expect(data('---\n{a: hello}')).toBe('a: hello');
  });
});

describe('a quoted string keeps its backslashes', () => {
  // toRegularString escaped \n \r \t and the encloser, but never the BACKSLASH itself, so a
  // literal `\` was written raw and the reader consumed it as the start of an escape sequence.
  // It only showed up when a string needed quoting for some OTHER reason -- looking like a
  // number, holding a comma -- because the open-string path escaped it correctly all along.
  const B = String.fromCharCode(92)
  const roundTrip = (value: string): string => {
    const io = stringifyDocument(loadInferred({ s: value }), { includeHeader: true, includeTypes: true } as any)
    return (parse(io, null) as any).toObject().s
  }

  test.each([
    ['digit-leading, needs quoting', '9' + B + 'U'],
    ['comma, needs quoting', 'a,b' + B + 'c'],
    ['keyword-looking', 'true' + B + 'x'],
    ['open string (already worked)', 'a' + B + 'b'],
    ['windows path', 'C:' + B + 'path' + B + 'to'],
    ['doubled', B + B],
    ['trailing', 'q' + B],
    ['leading', B + 'lead'],
  ])('%s', (_label, value) => {
    expect(roundTrip(value)).toBe(value)
  })
})

describe('an untyped member keeps a Decimal a decimal', () => {
  // AnyDef._stringifyByInference had branches for bool, number, bigint, string, Date, binary,
  // array and object — but none for Decimal, which is object-shaped in JS and a SCALAR on the
  // wire. It fell through to the object branch and printed its internals:
  //   {coefficient: -101119n, exponent: 2, precision: 6, scale: 2}
  // Third site to re-derive "object-shaped but scalar" by hand and leave Decimal out; see
  // io-test-cases/ARCHITECTURE-RETROSPECTIVE.md N2.
  test.each([
    ['compact', { includeHeader: true, includeTypes: true }],
    ['formatted', { includeHeader: true, includeTypes: true, indent: 2 }],
  ])('%s', (_label, opts) => {
    const value = new Decimal('-1011.19')
    // The member is untyped (`any`) because a sibling record lacks the key entirely.
    const doc = loadInferred([{ m: { v: [{ n: value }, {}, { n: 0 }] } }])
    const io = stringifyDocument(doc as any, opts as any)
    expect(io).not.toContain('coefficient')

    const back: any = parse(io, null)
    expect(back.getErrors()).toEqual([])
    const got = back.toObject()[0].m.v[0].n
    expect(got).toBeInstanceOf(Decimal)
    expect(String(got)).toBe('-1011.19')
  })
})
