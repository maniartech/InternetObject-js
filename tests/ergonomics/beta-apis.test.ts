import { describe, expect, test } from 'vitest';

import Definitions from '../../src/core/definitions';

import io, {
  ioSchema,
  parseSchema,
  parseDefinitions,
  toJSON,
  validate,
  validateCollection,
  validateObject,
} from '../../src/';


describe('beta ergonomic APIs', () => {
  test('parseDefinitions() works without passing null', () => {
    const defs1 = parseDefinitions('~ @foo: 123');
    const defs2 = parseDefinitions('~ @foo: 123', null);

    expect((defs1?.getV('@foo') as any)?.value ?? defs1?.getV('@foo')).toBe(123);
    expect((defs2?.getV('@foo') as any)?.value ?? defs2?.getV('@foo')).toBe(123);
  });

  test('parseSchema() compiles an inline schema', () => {
    const schema = parseSchema('{ name: string, age: int }');
    expect(schema).toBeDefined();
    expect(schema.get('name')?.type).toBe('string');
  });

  test('parseSchema() throws on empty schema string', () => {
    expect(() => parseSchema('')).toThrow(/non-empty schema/i);
    expect(() => parseSchema('   \n  ')).toThrow(/non-empty schema/i);
  });

  // A malformed definition must fail with a DESIGNATED code and an IO error class, like every
  // other error in the library (ADR 0002). This test used to pin the opposite — a bare
  // `Error('Invalid schema input')` that no caller could branch on — which is what the schema
  // corpus surfaced the first time anything ran it.
  test('parseSchema() reports a designated code when no schema body is provided', () => {
    expect(() => parseSchema('---')).toThrow(/expected-value/);
    let code: string | undefined;
    try { parseSchema('name:'); } catch (e: any) { code = e?.errorCode; }
    expect(code).toBe('expected-value');
  });

  test('parseSchema() supports parentDefs for [$Schema] array shorthand', () => {
    const defs = parseDefinitions('~ $Address: { street: string }');
    if (!defs) throw new Error('defs is null');

    expect(() => parseSchema('{ addresses: [$Address] }')).toThrow();
    expect(() => parseSchema('{ addresses: [$Address] }', defs)).not.toThrow();
  });

  test('io.schema template tag works and supports .with(defs)', () => {
    const schema1 = io.schema`{ name: string }`;
    expect(schema1.get('name')?.type).toBe('string');

    const defs = parseDefinitions('~ $Address: { street: string }');
    if (!defs) throw new Error('defs is null');

    const schema2 = io.schema.with(defs)`{ addresses: [$Address] }`;
    expect(schema2.get('addresses')?.type).toBe('array');
  });

  test('undefined interpolates as null (N), like every other value', () => {
    // BEHAVIOUR CHANGE (A1). These tags used to splice interpolations in RAW, so `undefined`
    // contributed an empty string and vanished. That is the same mechanism that let
    // `${'Smith, John'}` split one member into two -- see template-literal.ts. Every `${...}` is
    // now serialized as a VALUE, with no exceptions, so `undefined` serializes as `N`.
    const obj = io.object`name: Alice, nickname: ${undefined}` as any;
    expect(obj.toObject()).toEqual({ name: 'Alice', nickname: null });

    const nulled = io.object`name: Alice, nickname: ${null}` as any;
    expect(nulled.toObject()).toEqual({ name: 'Alice', nickname: null });
  });

  test('.with(defs) still threads external definitions', () => {
    const defs = io.defs`
      ~ $schema: { name: string, age: int }
    `;
    if (!defs) throw new Error('defs is null');

    const obj = io.object.with(defs)`Alice, 30`;
    expect(obj).toEqual({ name: 'Alice', age: 30 });

    const baseDefs = parseDefinitions('~ @foo: 1');
    if (!baseDefs) throw new Error('baseDefs is null');

    const extended = io.defs.with(baseDefs)`~ @bar: 2`;
    expect((extended?.getV('@foo') as any)?.value ?? extended?.getV('@foo')).toBe(1);
  });

  test('ioSchema export behaves like io.schema', () => {
    const schema = ioSchema`{ name: string }`;
    expect(schema.get('name')?.type).toBe('string');
  });

  test('toJSON() converts Jsonable values', () => {
    const doc = io.doc`
      name, age
      ---
      ~ Alice, 30
    `;

    expect(toJSON(doc)).toEqual([{ name: 'Alice', age: 30 }]);
    expect(io.toJSON(doc)).toEqual([{ name: 'Alice', age: 30 }]);
  });

  test('toJSON() throws for null/undefined and non-Jsonable', () => {
    expect(() => toJSON(null as any)).toThrow(/null\/undefined/i);
    expect(() => toJSON(undefined as any)).toThrow(/null\/undefined/i);
    expect(() => toJSON({} as any)).toThrow(/object with toObject\(\) or toJSON\(\)/i);
  });

  test('validateObject()/validateCollection()/validate() return ValidationResult', () => {
    const schema = parseSchema('{ name: string, age: int }');

    const okObj = validateObject({ name: 'Alice', age: 30 }, schema);
    expect(okObj.valid).toBe(true);
    expect(okObj.errors).toEqual([]);
    expect(okObj.data).toEqual({ name: 'Alice', age: 30 });

    const badObj = validateObject({ name: 'Alice', age: 'nope' } as any, schema);
    expect(badObj.valid).toBe(false);
    expect(badObj.errors.length).toBeGreaterThan(0);

    const okCol = validateCollection([{ name: 'A', age: 1 }], schema);
    expect(okCol.valid).toBe(true);
    expect(okCol.data).toEqual([{ name: 'A', age: 1 }]);

    const badCol = validate([{ name: 'A', age: 'x' }], schema);
    expect(badCol.valid).toBe(false);
  });

  test('validate* returns invalid when Definitions has no default $schema', () => {
    const emptyDefs = new Definitions();
    const res = validateObject({ any: 'thing' }, emptyDefs);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBe(1);
    expect(res.errors[0].message).toMatch(/default schema/i);
  });

  test('validateCollection returns invalid when item errors are collected', () => {
    const schema = parseSchema('{ age: int }');
    const res = validateCollection([{ age: 1 }, { age: 'nope' } as any], schema);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.data).toBeUndefined();
  });
});
