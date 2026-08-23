import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { loadInferred } from '../../src/facade/load-inferred';
import { stringifyDocument } from '../../src/facade/stringify-document';
import parse from '../../src/parser/index';

/**
 * Shape preservation — the structural invariant.
 *
 * An array MUST stay an array and an object MUST stay an object, all the way through
 * infer → serialize → parse. Values may be re-spelled (a string may gain quotes, a number may
 * change notation) but the SHAPE of the tree may not change.
 *
 * This was violated by the formatter, not the parser: a nested array is `typeof 'object'`, so
 * `[['a','b']]` was treated as an array of objects, expanded one-per-line, and each inner array
 * printed through the object formatter with positional keys — `{"0": a, "1": b}`. The data still
 * round-tripped, so a value-only check could not see it; the document on the page simply showed a
 * different shape than the data had.
 *
 * It reproduced ONLY with `indent` set, which is why the issue #61 suite missed it entirely — that
 * suite exercises compact output. Every case here therefore runs in BOTH modes.
 */

const MODES = [
  { label: 'compact', opts: { includeHeader: true, includeTypes: true } },
  { label: 'formatted', opts: { includeHeader: true, includeTypes: true, indent: 2 } },
] as const;

/** Describe a value's shape only — the tree of array/object/leaf, with no values in it. */
function shapeOf(v: any): any {
  if (Array.isArray(v)) return { kind: 'array', items: v.map(shapeOf) };
  if (v !== null && typeof v === 'object' && !(v instanceof Date) && !(v instanceof Uint8Array)) {
    const out: Record<string, any> = {};
    for (const k of Object.keys(v)) out[k] = shapeOf(v[k]);
    return { kind: 'object', keys: out };
  }
  return { kind: 'leaf' };
}

/** Round-trip `value` through IO and return the re-parsed tree, normalized to plain JSON. */
function roundTrip(value: any, opts: any) {
  const io = stringifyDocument(loadInferred(value) as any, opts);
  const back: any = parse(io, null);
  expect(back.getErrors()).toEqual([]);
  return JSON.parse(JSON.stringify(back.toJSON()));
}

const CASES: [string, any][] = [
  ['array of pairs', { m: [['a', 'b'], ['c', 'd']] }],
  ['array of numeric pairs', { m: [[1, 2], [3, 4]] }],
  ['array of arrays of arrays', { m: [[['a']], [['b']]] }],
  ['mixed arrays and objects', { m: [['a', 'b'], { x: 1 }, ['c', 'd']] }],
  ['array of objects', { m: [{ x: 1 }, { x: 2 }] }],
  ['map whose values are arrays of pairs', { m: { '3': [['a', 'b']], '4': [['c', 'd']] } }],
  ['empty array vs empty object', { a: [], o: {} }],
  ['array containing empty array', { m: [[], ['a']] }],
  ['array of arrays of objects', { m: [[{ x: 1 }], [{ x: 2 }]] }],
  ['deeply nested', { a: { b: [{ c: [['d', 'e']] }] } }],
  ['nulls inside nested arrays', { m: [['a', null], [null, 'b']] }],
];

describe('shape is preserved through infer → serialize → parse', () => {
  for (const [label, value] of CASES) {
    for (const { label: mode, opts } of MODES) {
      test(`${label} (${mode})`, () => {
        const back = roundTrip(value, opts);
        expect(shapeOf(back)).toEqual(shapeOf(value));
        expect(back).toEqual(value);
      });
    }
  }
});

describe('an array is never written as an object', () => {
  for (const { label: mode, opts } of MODES) {
    test(`no positional keys leak into the output (${mode})`, () => {
      // `{"0": a, "1": b}` is what a mis-formatted array looks like. It must never appear for
      // data that contains no such key.
      const io = stringifyDocument(loadInferred({ m: [['a', 'b'], ['c', 'd']] }) as any, opts);
      expect(io).not.toMatch(/"0"\s*:/);
      // Formatted mode spaces the brackets (`[ a, b ]`), so match either.
      expect(io).toMatch(/\[\s*a,\s*b\s*\]/);
    });
  }
});

describe('the real-world document keeps its shape in both modes', () => {
  const fixture = JSON.parse(
    readFileSync(join(__dirname, '../fixtures/issue-61-openfoodfacts.json'), 'utf8')
  );

  for (const { label: mode, opts } of MODES) {
    test(`issue #61 fixture (${mode})`, () => {
      const back = roundTrip(fixture, opts);
      expect(shapeOf(back)).toEqual(shapeOf(fixture));
    });

    test(`nova_groups_markers stays an array of arrays (${mode})`, () => {
      // The member that exposed the bug: {"3": [[k, v], …], "4": [[k, v], …]}.
      const back = roundTrip(fixture, opts);
      const markers = back.product.nova_groups_markers['3'];
      expect(Array.isArray(markers)).toBe(true);
      expect(markers.every((p: any) => Array.isArray(p))).toBe(true);
      expect(markers).toEqual(fixture.product.nova_groups_markers['3']);
    });
  }
});

describe('the shape comparison is capable of failing', () => {
  test('an array and an object with the same contents are not the same shape', () => {
    expect(shapeOf(['a', 'b'])).not.toEqual(shapeOf({ 0: 'a', 1: 'b' }));
    expect(shapeOf({ m: [[1]] })).not.toEqual(shapeOf({ m: [1] }));
  });
});
