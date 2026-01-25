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

  test('parseSchema() throws Invalid schema input when no schema body is provided', () => {
    expect(() => parseSchema('---')).toThrow(/invalid schema input/i);
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

  test('template tags ignore undefined interpolations', () => {
    const schema = io.schema`{ name: string${undefined} }`;
    expect(schema.get('name')?.type).toBe('string');

    const defs = io.defs`
      ~ $schema: { name: string, age: int }
    `;
    if (!defs) throw new Error('defs is null');

    const obj = io.object.with(defs)`Alice, 30${undefined}`;
    expect(obj).toEqual({ name: 'Alice', age: 30 });

    const baseDefs = parseDefinitions('~ @foo: 1');
    if (!baseDefs) throw new Error('baseDefs is null');

    const extended = io.defs.with(baseDefs)`~ @bar: 2${undefined}`;
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
    expect(() => toJSON({} as any)).toThrow(/object with toJSON/i);
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
