import { describe, it, expect } from 'vitest';
import parse from '../../src/parser/index';

/**
 * A variable read WITHOUT a schema must yield its value.
 *
 * Until 2026-08-22 it yielded the AST node instead, so `~ @red: "#f00"` followed by `color: @red`
 * projected `{ pos, row, col, token, value, type, subType }` — the parser's internals — in place of
 * the string. An array variable leaked its brackets as nodes too.
 *
 * It stayed invisible because every example in the specification declares a schema, and the schema
 * path decodes separately. The corpus's `document/` suite is what surfaced it.
 *
 * The two lookups are deliberately distinct and both are load-bearing:
 *   `getV`      returns the stored NODE — the schema type-checkers read `.type` off it to decide
 *               whether a variable holds a string or a boolean.
 *   `getValue`  returns the decoded VALUE — the projection path.
 * Conflating them breaks one side or the other; the first attempt at this fix broke `choices`.
 */
const value = (src: string) => parse(src, null).toObject();

describe('variable resolution in the value model (no schema)', () => {
  it('resolves a string variable to its string', () => {
    expect(value('~ @red: "#f00"\n---\ncolor: @red')).toEqual({ color: '#f00' });
  });

  it('resolves numeric, boolean and null variables', () => {
    expect(value('~ @n: 42\n---\nx: @n')).toEqual({ x: 42 });
    expect(value('~ @b: T\n---\nx: @b')).toEqual({ x: true });
    expect(value('~ @z: N\n---\nx: @z')).toEqual({ x: null });
  });

  it('resolves inside arrays, objects and collections', () => {
    expect(value('~ @n: 42\n---\nx: [@n]')).toEqual({ x: [42] });
    expect(value('~ @n: 42\n---\nx: { y: @n }')).toEqual({ x: { y: 42 } });
    expect(value('~ @n: 42\n---\n~ x: @n')).toEqual([{ x: 42 }]);
  });

  it('resolves a container-valued variable', () => {
    expect(value('~ @o: {a: 1}\n---\nx: @o')).toEqual({ x: { a: 1 } });
    expect(value('~ @a: [1, 2]\n---\nx: @a')).toEqual({ x: [1, 2] });
  });

  it('never leaks node internals into the value model', () => {
    const projected: any = value('~ @red: "#f00"\n---\ncolor: @red');
    // The exact shape the defect produced. Naming the keys makes the regression unmistakable.
    for (const leaked of ['pos', 'row', 'col', 'token', 'type', 'subType']) {
      expect(projected.color?.[leaked]).toBeUndefined();
    }
  });

  it('resolves a variable defined in terms of another, in either order', () => {
    expect(value('~ @a: 1\n~ @b: @a\n---\nx: @b')).toEqual({ x: 1 });
    // Definitions may be read before everything they refer to has been parsed.
    expect(value('~ @b: @a\n~ @a: 1\n---\nx: @b')).toEqual({ x: 1 });
  });

  it('reports a self-referential variable instead of recursing', () => {
    // The value is unknowable; the important property is that it terminates with a designated
    // code rather than hanging or returning a node.
    for (const src of ['~ @a: @a\n---\nx: @a', '~ @a: @b\n~ @b: @a\n---\nx: @a']) {
      let code: string | undefined;
      try { parse(src, null).toObject(); } catch (e: any) { code = e?.errorCode; }
      expect(code).toBe('invalid-definition');
    }
  });

  it('allows a schema to reference ITSELF — a recursive type is not a cycle', () => {
    // The guard above must not catch this. Inference emits a self-referencing schema whenever a
    // map's values can contain the map, and the round-trip fuzzer found the over-broad guard
    // within one run of ~24,000 documents:
    //
    //   ~ $node: {"*": {any, "null": T}, child: {object, schema: {*: $node}, optional: T}}
    //
    // A schema referring to itself is how a recursive type is written. A VARIABLE referring to
    // itself has no value. Only the second is an error.
    const src = '~ $node: {v?: int, child: {object, schema: {*: $node}, optional: T}}\n---\n~ v: 1';
    expect(() => parse(src, null).toObject()).not.toThrow();
  });

  it('still resolves through the schema path', () => {
    // The schema path decodes separately and must keep working — this is what the first attempt
    // at the fix broke, by making `getV` return values.
    expect(value('~ @n: 5\n~ $schema: {x: int}\n---\n~ x: @n')).toEqual([{ x: 5 }]);
    expect(value('~ @r: red\n~ $schema: {c: {string, choices: [@r]}}\n---\n~ c: red'))
      .toEqual([{ c: 'red' }]);
  });

  it('treats a quoted @string as a reference, by design', () => {
    // FINDINGS #3, confirmed 2026-06-30: `@name` and `$name` are references in ANY string form,
    // quoted and raw included. A literal `@`-leading value is therefore not writable as data.
    // Pinned here so nobody "fixes" it into a difference from every other implementation.
    let code: string | undefined;
    try { parse('---\nx: "@a"', null).toObject(); } catch (e: any) { code = e?.errorCode; }
    expect(code).toBe('undefined-variable');
  });
});
