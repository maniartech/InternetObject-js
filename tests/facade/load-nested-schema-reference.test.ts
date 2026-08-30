import { describe, it, expect } from 'vitest';
import { load, loadObject, parseDocument, parseDefinitions, stringify } from '../../src/index';

/**
 * `load()` must resolve a `$name` schema reference inside a member definition, exactly as
 * `parseDocument()` does for the same document.
 *
 * Found 2026-08-23 while checking that every README example actually runs: example 8 (named
 * schemas) threw `schema2.names is not iterable`. `ObjectDef.load` read `memberDef.schema` raw,
 * so `address: $address` arrived as an unresolved TokenNode, while `validate()` and `stringify()`
 * in the same file already went through `_resolveSchema`. The text route never hit it because
 * the parser resolves references before the typedef sees them — the native route is the only
 * one that hands a TokenNode to load().
 */
const DEFS = `
  ~ $address: { street: string, city: string }
  ~ $schema: { name: string, age: int, address: $address }
`;
const DATA = { name: 'Alice', age: 30, address: { street: '123 Main St', city: 'NYC' } };

describe('load() with a member whose schema is a $reference', () => {
  it('loads a nested object through the referenced schema', () => {
    expect(load(DATA, parseDefinitions(DEFS)).toObject()).toEqual(DATA);
  });

  it('agrees with the text route', () => {
    const viaText = parseDocument(`${DEFS}\n---\nAlice, 30, {123 Main St, NYC}`).toObject();
    expect(load(DATA, parseDefinitions(DEFS)).toObject()).toEqual(viaText);
  });

  it('validates through the referenced schema, not around it', () => {
    const bad = { ...DATA, address: { street: 123, city: 'NYC' } };
    expect(() => load(bad, parseDefinitions(DEFS))).toThrow(/street/);
  });

  it('works for loadObject() too', () => {
    expect(loadObject(DATA, parseDefinitions(DEFS)).toObject()).toEqual(DATA);
  });

  it('round-trips through stringify()', () => {
    expect(stringify(load(DATA, parseDefinitions(DEFS)))).toBe('Alice, 30, {123 Main St, NYC}');
  });

  it('resolves a reference to a reference', () => {
    const defs = parseDefinitions(`
      ~ $addr: { street: string, city: string }
      ~ $address: $addr
      ~ $schema: { name: string, address: $address }
    `);
    const data = { name: 'Alice', address: { street: 'x', city: 'y' } };
    expect(load(data, defs).toObject()).toEqual(data);
  });
});
