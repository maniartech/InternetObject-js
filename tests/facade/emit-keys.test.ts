import { describe, test, expect } from 'vitest';
import { parse, stringify } from '../../src';

/**
 * emitKeys — the single knob that governs how keys are emitted in serialized data rows.
 * See io-test-cases/SERIALIZATION-DECISIONS.md.
 *
 *   'all'    — every keyed member emits `key: value` (self-describing)
 *   'extras' — (DEFAULT) key only for a field NOT declared in the schema (open-schema extra, or
 *              every field when there is no schema); declared fields stay bare
 *   'none'   — values only (leanest; lossy when the schema can't recover the name)
 *
 * A keyless / positional member is always bare, in every mode.
 * These serialize with includeHeader defaulting to false (stringify() lean entry), so output is
 * the data row(s) only.
 */
const s = (io: string, mode?: 'all' | 'extras' | 'none') =>
  stringify(parse(io, null) as any, mode ? ({ emitKeys: mode } as any) : undefined);

describe('emitKeys — key emission in data rows', () => {
  describe('field IS declared in the schema', () => {
    const doc = '~ $schema: {name, age}\n---\nJohn, 25';
    test("extras (default) → bare", () => expect(s(doc, 'extras')).toBe('John, 25'));
    test("all → keyed (self-describing)", () => expect(s(doc, 'all')).toBe('name: John, age: 25'));
    test("none → bare", () => expect(s(doc, 'none')).toBe('John, 25'));
  });

  describe('no schema at all (JSON-like object)', () => {
    const doc = '{name: John, age: 25}';
    test("extras (default) → keyed (undeclared ⇒ keep names, lossless)", () =>
      expect(s(doc, 'extras')).toBe('name: John, age: 25'));
    test("all → keyed", () => expect(s(doc, 'all')).toBe('name: John, age: 25'));
    test("none → bare (lean, lossy by choice)", () => expect(s(doc, 'none')).toBe('John, 25'));
    test("default (no option) === extras", () =>
      expect(stringify(parse('{name: John}', null) as any)).toBe('name: John'));
  });

  describe('open schema — declared field bare, extra keyed', () => {
    const doc = '~ $schema: {name, *}\n---\n{name: John, nick: JJ}';
    test("extras → declared bare, extra keyed", () => expect(s(doc, 'extras')).toBe('John, nick: JJ'));
    test("all → both keyed", () => expect(s(doc, 'all')).toBe('name: John, nick: JJ'));
    test("none → both bare", () => expect(s(doc, 'none')).toBe('John, JJ'));
  });

  describe('mixed positional + explicit numeric key', () => {
    const doc = '{Alice, "5": 100}';
    // "5" is displaced (index 1 ≠ 5) → non-positional → kept in extras/all; dropped only in none.
    test("extras → Alice bare, \"5\" kept", () => expect(s(doc, 'extras')).toBe('Alice, "5": 100'));
    test("all → same", () => expect(s(doc, 'all')).toBe('Alice, "5": 100'));
    test("none → both bare", () => expect(s(doc, 'none')).toBe('Alice, 100'));
  });

  describe('keyless / positional members are always bare', () => {
    const doc = '{Alice, Bob}';
    test.each(['all', 'extras', 'none'] as const)('%s → bare', (m) =>
      expect(s(doc, m)).toBe('Alice, Bob'));
  });
});
