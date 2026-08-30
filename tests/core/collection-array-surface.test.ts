import { describe, it, expect } from 'vitest';
import parse from '../../src/parser/index';
import IOCollection from '../../src/core/collection';

/**
 * A5 — the rest of the array surface on `IOCollection`.
 *
 * The class already had map/filter/find/reduce/forEach/some/every but not join/sort/slice/at. That
 * split was not a principle, and it is what forced this in our own teaching examples:
 *
 *   [...rows.map(r => r.get('name'))].join(', ')     // the spread existed only because join did not
 *
 * `map`/`filter` keep returning `IOCollection`: `Array.prototype.map` returns the same type as its
 * input, and returning `Array` would break `rows.filter(...).getAt(0)`.
 */
describe('IOCollection array surface (A5)', () => {
  const doc: any = parse('name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25\n~ Carol, 28');
  const rows = () => (parse('name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25\n~ Carol, 28') as any)
    .sections.get(0).data;

  it('join — the method whose absence forced the spread', () => {
    const names = doc.sections.get(0).data.map((r: any) => r.get('name'));
    expect(names.join(', ')).toBe('Alice, Bob, Carol');
  });

  it('at, including negative indices', () => {
    const r = rows();
    expect(r.at(0).get('name')).toBe('Alice');
    expect(r.at(-1).get('name')).toBe('Carol');
    expect(r.at(99)).toBeUndefined();
  });

  it('slice returns an IOCollection, not an Array', () => {
    const part = rows().slice(1);
    expect(part).toBeInstanceOf(IOCollection);
    expect(part.length).toBe(2);
    expect(part.getAt(0).get('name')).toBe('Bob');
  });

  it('indexOf / lastIndexOf / includes', () => {
    const r = rows();
    const bob = r.getAt(1);
    expect(r.indexOf(bob)).toBe(1);
    expect(r.lastIndexOf(bob)).toBe(1);
    expect(r.includes(bob)).toBe(true);
    expect(r.indexOf({} as any)).toBe(-1);
  });

  it('concat accepts collections, arrays and single items', () => {
    const a = rows();
    const b = rows().slice(0, 1);
    expect(a.concat(b).length).toBe(4);
    expect(a.concat([b.getAt(0)]).length).toBe(4);
    expect(a.concat(b.getAt(0)).length).toBe(4);
    expect(a.length).toBe(3);            // the receiver is untouched
  });

  it('flatMap flattens one level', () => {
    const r = rows();
    const doubled = r.flatMap((x: any) => [x.get('name'), x.get('name')]);
    expect(doubled.length).toBe(6);
    expect(doubled).toBeInstanceOf(IOCollection);
  });

  describe('sort and reverse mutate; toSorted and toReversed do not', () => {
    it('sort mutates in place and returns this', () => {
      const r = rows();
      const same = r.sort((a: any, b: any) => a.get('age') - b.get('age'));
      expect(same).toBe(r);
      expect([...r].map((x: any) => x.get('age'))).toEqual([25, 28, 30]);
    });

    it('reverse mutates in place', () => {
      const r = rows();
      r.reverse();
      expect([...r].map((x: any) => x.get('name'))).toEqual(['Carol', 'Bob', 'Alice']);
    });

    it('toSorted leaves the receiver alone', () => {
      const r = rows();
      const sorted = r.toSorted((a: any, b: any) => a.get('age') - b.get('age'));
      expect([...sorted].map((x: any) => x.get('age'))).toEqual([25, 28, 30]);
      expect([...r].map((x: any) => x.get('age'))).toEqual([30, 25, 28]);   // unchanged
      expect(sorted).not.toBe(r);
    });

    it('toReversed leaves the receiver alone', () => {
      const r = rows();
      const rev = r.toReversed();
      expect([...rev].map((x: any) => x.get('name'))).toEqual(['Carol', 'Bob', 'Alice']);
      expect([...r].map((x: any) => x.get('name'))).toEqual(['Alice', 'Bob', 'Carol']);
    });
  });

  it('map and filter still return IOCollection — chaining stays in the type', () => {
    const r = rows();
    expect(r.map((x: any) => x)).toBeInstanceOf(IOCollection);
    expect(r.filter(() => true)).toBeInstanceOf(IOCollection);
    expect(r.filter((x: any) => x.get('age') > 26).getAt(0).get('name')).toBe('Alice');
  });

  it('none of the new methods appear in a key walk', () => {
    // Prototype methods are non-enumerable, so enumeration still yields data only (§7.2).
    const r = rows();
    expect(Object.keys(r)).toEqual([]);
    expect(Object.keys({ ...r })).toEqual([]);
  });

  /**
   * Pinned, not fixed: `IOCollection.getAt` throws out of range while `IOSectionCollection.getAt`
   * returns undefined — the latter matching its own `get`. Changing either is a behaviour change,
   * so A7 left both alone and this records the divergence.
   */
  it('getAt out-of-range behaviour differs by container (known)', () => {
    expect(() => rows().getAt(99)).toThrow();
    expect(doc.sections.getAt(99)).toBeUndefined();
  });
});
