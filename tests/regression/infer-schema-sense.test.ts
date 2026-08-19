import { describe, test, expect } from 'vitest';
import { loadInferred } from '../../src/facade/load-inferred';
import { stringifyHeader, stringifyDocument } from '../../src/facade/stringify-document';
import parse from '../../src/parser/index';

/**
 * The third inference invariant — SENSE (the other two: shape preservation, value round-trip).
 *
 * An inferred header must read as a truthful description of the data it came from: names drawn
 * from the data's own vocabulary, types matching what the values are, and no definition that
 * exists only as an accident of how inference walked the tree. Concretely:
 *
 *  - a name like `$1` is not a name — the concept under `images: {"1": …}` is an IMAGE
 *  - two members with one shape mean ONE definition, referenced twice
 *  - a `{}` definition asserts nothing and must not exist
 *  - a definition nothing references must not exist
 */

const header = (v: any) => stringifyHeader(loadInferred(v) as any).trim();

const roundTrips = (v: any) => {
  const io = stringifyDocument(loadInferred(v) as any, { includeHeader: true, includeTypes: true });
  const back: any = parse(io, null);
  expect(back.getErrors()).toEqual([]);
  expect(JSON.parse(JSON.stringify(back.toJSON()))).toEqual(v);
};

describe('names come from the data, not from inference accidents', () => {
  test('numeric keys name their shape after the parent: images/1 -> $image', () => {
    const v = { images: { front: { w: 1, h: 2 } }, gallery: { '1': { url: 'a', size: 1 }, '2': { url: 'b', size: 2 } } };
    // `gallery` is map-shaped, so its items already get $gallery/{*}; force the static case:
    const s = header({ images: { '1': { url: 'a', size: 1 }, front_en: { kind: 'x' } } });
    expect(s).toContain('$image: {url: string, size: number}');
    expect(s).not.toMatch(/~ \$\d/);
    roundTrips(v);
  });

  test('a genuinely different shape under the same parent gets the next derived name', () => {
    const s = header({ images: { '1': { url: 'a' }, '2': { alt: 'b' }, front_en: { kind: 'x' } } });
    expect(s).toContain('$image:');
    expect(s).toContain('$image_2:');
    expect(s).not.toMatch(/~ \$\d/);
  });

  test('singularization does not mangle: sizes -> $size, not $siz', () => {
    const s = header({ sizes: { '100': { h: 1, w: 2 }, full: { h: 3, w: 4 } } });
    expect(s).toContain('$size: {h: number, w: number}');
    expect(s).not.toContain('$siz:');
  });
});

describe('one shape, one definition', () => {
  test('identical shapes share a definition instead of duplicating it', () => {
    const s = header({ display: { en: 'a' }, small: { en: 'b' }, thumb: { en: 'c' } });
    expect((s.match(/\{en: string\}/g) ?? []).length).toBe(1);
    expect(s).toContain('small: $display');
    expect(s).toContain('thumb: $display');
  });

  test('a node whose children share its shape becomes a recursive schema', () => {
    // Depth matters: the grandchild gives the child's `children` member a schema reference,
    // which makes node and child structurally identical -- and collapsing them yields a
    // definition that references itself. Verified to parse and round-trip.
    const v = { node: { value: 'root', children: [
      { value: 'child', children: [{ value: 'grandchild', children: [] }] },
    ] } };
    expect(header(v)).toContain('$node: {value: string, children: [$node]}');
    roundTrips(v);
  });
});

describe('no vacuous definitions', () => {
  test('an empty object defines nothing — the member is a plain object', () => {
    const s = header({ meta: {}, real: { x: 1 } });
    expect(s).not.toMatch(/: \{\}/);
    expect(s).toContain('meta: object');
    roundTrips({ meta: {}, real: { x: 1 } });
  });

  test('a definition nothing references is not emitted', () => {
    // The array is heterogeneous, so the member stays untyped — the item schema collected
    // from its object element must not linger in the header.
    const s = header({ m: [['a', 'b'], { x: 1 }] });
    expect(s.split('\n').filter(l => l.startsWith('~ $')).length).toBe(0);
  });
});

describe('adversarial keys cannot corrupt the schema', () => {
  test('a member name containing signature separators cannot forge another schema', () => {
    // `a:string||,b` used to produce the same structural signature as {a: string, b: string};
    // the two schemas silently merged and the emitted document failed its own validation.
    const v = { p: { a: 'x', b: 'y' }, q: { 'a:string,b': 'z' } };
    const s = header(v);
    expect(s).toContain('$p: {a: string, b: string}');
    expect(s).toContain('"a:string,b"');
    roundTrips(v);
  });

  test('a literal `*` key degrades to an untyped object instead of an invalid header', () => {
    // `*` IS the wildcard in schema syntax, so no schema can declare a member by that name.
    // The data is unaffected -- the key is quoted in data rows.
    const v = { p: { '*': 'wild', a: 1 } };
    expect(header(v)).toContain('p: object');
    roundTrips(v);
    roundTrips({ m: [{ '*': 1 }, { '*': 2 }] });        // in an array
    roundTrips({ m: { k1: { '*': 1 }, k2: { '*': 2 } } }); // in a map-shaped container
  });
});

describe('types tell the truth about the values', () => {
  test('a Date is a datetime, not an empty record', () => {
    expect(header({ when: new Date('2024-03-20T00:00:00Z'), n: 1 })).toContain('when: datetime');
  });

  test('homogeneous primitive arrays carry their element type', () => {
    const s = header({ tags: ['a', 'b'], counts: [1, 2], flags: [true] });
    expect(s).toContain('tags: [string]');
    expect(s).toContain('counts: [number]');
    expect(s).toContain('flags: [bool]');
  });

  test('an element type never survives evidence against it', () => {
    // Second record's numbers would be rejected by `[string]` — the member must be untyped.
    const s = header([{ v: ['a'] }, { v: [1] }]);
    expect(s).toContain('v: array');
    roundTrips([{ v: ['a'] }, { v: [1] }]);
  });
});
