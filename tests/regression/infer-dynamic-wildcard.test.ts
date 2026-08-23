import { describe, test, expect } from 'vitest';
import { loadInferred } from '../../src/facade/load-inferred';
import { stringifyDocument } from '../../src/facade/stringify-document';
import parse from '../../src/parser/index';

/**
 * Inference + serialization round-trip fixes for GitHub issue #61, "[Import JSON] Schema
 * inference error", and the related "invalid inference for additional properties" report.
 *
 * The contract under test: for JSON-shaped input, `loadInferred` → `stringifyDocument` produces an
 * IO document that (a) parses with zero errors and (b) yields the same value model back.
 */

/** loadInferred → stringify → parse; returns { io, back } with `back` deep-normalized to POJOs. */
function roundtrip(data: any): { io: string; back: any } {
  const io = stringifyDocument(loadInferred(data), { includeHeader: true, includeTypes: true });
  const doc: any = parse(io, null);
  expect(doc.getErrors()).toEqual([]);
  // toJSON does not deep-flatten IOObjects inside arrays — normalize via JSON.
  return { io, back: JSON.parse(JSON.stringify(doc.toJSON())) };
}

describe('dynamic-key (map) inference links via wildcard container', () => {
  const data = {
    result: {
      questions: {
        QID1: { questionName: 'Q2', choices: { '1': { recode: ['0'] }, '2': { recode: ['1'] } } },
        QID2: { questionName: 'Q1', choices: { '1': { recode: ['4234230'] }, '2': { recode: ['1'] } } }
      }
    },
    detail: 'hello'
  };

  test('emits linked container schemas and preserves dynamic keys', () => {
    const { io, back } = roundtrip(data);
    // The extracted item schemas are LINKED, not orphaned: `$questions: {*: $question}`.
    expect(io).toMatch(/~ \$questions: \{\*:\s*\$question\}/);
    expect(io).toMatch(/~ \$choices: \{\*:\s*\$choice\}/);
    expect(io).toContain('questions: $questions');
    // Dynamic keys are DATA and stay in the data section (numeric keys quoted).
    expect(io).toContain('QID1:');
    expect(io).toContain('"1":');
    expect(back).toEqual(data);
  });

  test('unrelated static members sharing one incidental key are NOT misread as a map', () => {
    // origins/packaging both have `value` — one common key, but low key-set overlap.
    const d = {
      adjustments: {
        origins: { list: ['a'], score: 1, value: 2, extra1: 1, extra2: 2 },
        packaging: { warn: 'w', value: -15 }
      }
    };
    const { io, back } = roundtrip(d);
    expect(back).toEqual(d);
    // No franken-merged wildcard container for `adjustments`.
    expect(io).not.toMatch(/\$adjustments: \{\*/);
  });
});

describe('null-bearing arrays (issue #61)', () => {
  test('untyped array accepts null elements: array keyword ≡ []', () => {
    // The compiler canonicalizes `[]` to of:{type:'any', null:true}; the `array` keyword and the
    // runtime default must behave the same.
    const doc: any = parse('~ $schema: {items: array}\n---\n[a, N, b]', null);
    expect(doc.getErrors()).toEqual([]);
    expect(doc.toJSON()).toEqual({ items: ['a', null, 'b'] });
  });

  test('inference of a null-bearing array loads and round-trips', () => {
    const data = { items: ['a', null, 'b'], tags: [] as any[] };
    const { back } = roundtrip(data);
    expect(back).toEqual(data);
  });

  test('null-bearing object array falls back to untyped (schemaRef would reject the nulls)', () => {
    const data = { rows: [{ a: 1 }, null, { a: 2 }] };
    const { back } = roundtrip(data);
    expect(back).toEqual(data);
  });
});

describe('serialization details surfaced by issue #61', () => {
  test('member names with colons are quoted in schemas and data', () => {
    const data = { props: { 'code:en': 'x', 'code:fr': 'y' } };
    const { io, back } = roundtrip(data);
    expect(io).toContain('"code:en"');
    expect(back).toEqual(data);
  });

  test('schema names generated from special-char keys are sanitized', () => {
    // Nested-object key `en:plastic` must not emit an unparseable `$en:plastic` definition.
    const data = { materials: { 'en:plastic': { score: 1 }, other: 'x' } };
    const { io, back } = roundtrip(data);
    expect(io).not.toMatch(/\$en:plastic/);
    expect(back).toEqual(data);
  });

  test('leading/trailing whitespace in strings survives (quoted, not open)', () => {
    const data = { note: 'ends with space ' };
    const { back } = roundtrip(data);
    expect(back).toEqual(data);
  });

  test('single object-valued member record wraps explicitly ({{...}})', () => {
    const data = { eco: { adjustments: { score: -100 } } };
    const { io, back } = roundtrip(data);
    const dataSection = io.slice(io.indexOf('\n---\n') + 5).trim();
    expect(dataSection.startsWith('{{')).toBe(true);
    expect(back).toEqual(data);
  });

  test('absent optional members keep positional placeholders in nested objects', () => {
    // b missing in the second item → merged schema marks it optional; the first item must not
    // let `c` shift into b's slot.
    const data = { rows: [{ a: 1, b: 2, c: 3 }, { a: 4, c: 6 }] };
    const { back } = roundtrip(data);
    expect(back).toEqual(data);
  });
});

describe('issue #61 representative structure end-to-end', () => {
  test('product-like document round-trips', () => {
    const data = {
      code: '5060292302201',
      product: {
        _keywords: ['and', 'anything'],
        ingredients_debug: ['54% dried potatoes', ',', null, null, null, ' sunflower oil'],
        categories_properties: { 'agribalyse_food_code:en': '25420', 'ciqual_food_code:en': '25420' },
        images: {
          front_en: { imgid: '3', rev: '23', sizes: { full: { h: 800, w: 600 } } },
          nutrition_en: { imgid: '4', rev: '39', sizes: { full: { h: 900, w: 500 } } }
        },
        ecoscore_data: {
          adjustments: {
            origins_of_ingredients: {
              aggregated_origins: [{ epi_score: 0, origin: 'en:unknown', percent: 100 }],
              transportation_scores: { ad: 0, al: -5, at: 0 }
            },
            packaging: { score: -100, value: -15 }
          }
        },
        rev: 47
      }
    };
    const { back } = roundtrip(data);
    expect(back).toEqual(data);
  });
});

describe('record-wrapper brace matrix (io-specs serialization/document-output.md, record enclosure)', () => {
  test('bare single-object row is accepted, but is the ambiguous form (why writers wrap)', () => {
    // Since the ISSUE-15 fix this binds uniformly instead of raising `unknown-member`. It is still
    // the form best practice tells authors to avoid — writers always emit the enclosed form below.
    const doc: any = parse('~ $schema: {o1: object, o2?: object}\n---\n{key: val}', null);
    expect(JSON.parse(JSON.stringify(doc.toJSON()))).toEqual({ o1: { key: 'val' } });
  });
  test('wrapped form binds correctly', () => {
    const doc: any = parse('~ $schema: {o1: object, o2?: object}\n---\n{{key: val}}', null);
    expect(JSON.parse(JSON.stringify(doc.toJSON()))).toEqual({ o1: { key: 'val' } });
  });
  test('trailing content disambiguates without a wrap', () => {
    const doc: any = parse('~ $schema: {o1: object, n: number}\n---\n{key: val}, 5', null);
    expect(JSON.parse(JSON.stringify(doc.toJSON()))).toEqual({ o1: { key: 'val' }, n: 5 });
  });
});
