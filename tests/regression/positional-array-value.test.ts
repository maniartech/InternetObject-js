import { describe, test, expect } from 'vitest';
import { parseDocument } from '../../src';

/**
 * R1 — a positional value that is itself an Array must be preserved intact.
 *
 * Regression: `IOObject.push` treats any array argument as a `[key, value]` tuple, so a positional
 * ARRAY value used to be destructured (`["1984","T","N","Hello"]` → `{"1984":"T"}`, dropping the rest).
 * `ObjectNode.toValue` / open-schema extras now use `IOObject.pushValue`, which never re-interprets.
 * Spec: `[...]` is an Array value (array.md), and an array is a valid single positional value in a
 * record (object.md / data.md); schemaless records preserve positional values (object.md).
 */
describe('R1 — positional array value is preserved (no push tuple-corruption)', () => {
  test('no-schema array value stays intact at position 0', () => {
    expect((parseDocument('["1984", "T", "N", "Hello"]', null) as any).toObject())
      .toEqual({ '0': ['1984', 'T', 'N', 'Hello'] });
  });

  test('single-element array is not collapsed to {}', () => {
    expect((parseDocument('["only"]', null) as any).toObject()).toEqual({ '0': ['only'] });
  });

  test('scalar followed by an array — both positional, both preserved', () => {
    expect((parseDocument('foo, ["a", "b", "c"]', null) as any).toObject())
      .toEqual({ '0': 'foo', '1': ['a', 'b', 'c'] });
  });

  test('keyed array member is unaffected', () => {
    expect((parseDocument('{name: John, tags: ["a", "b"]}', null) as any).toObject())
      .toEqual({ name: 'John', tags: ['a', 'b'] });
  });
});
