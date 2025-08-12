import { compileSchema } from '../../../src/schema';

describe('compileSchema - Playground Sample Data', () => {
  test('parses simple-object schema', () => {
    const schemaText = `name, age, isActive, joiningDt, address: {street, city, state}, colors`;
    const schema = compileSchema('SimpleObject', schemaText);
    expect(schema.name).toBe('SimpleObject');
    expect(schema.memberCount).toBe(6);
  const addressDef = schema.get('address');
  expect(addressDef).toMatchObject({ type: 'object', path: 'address' });
  expect(addressDef?.schema).toBeDefined();
  expect(addressDef?.schema?.get('street')).toMatchObject({ type: 'any', path: 'address.street' });
    expect(schema.get('colors')).toMatchObject({ type: 'array', path: 'colors' });
  });

  test('parses typed-collection schema', () => {
    const schemaText = `name: string, age: number, gender: {string, choices: [m, f]}, joiningDt: date, address: { street: string, city: string, state?: {string, len: 2} }, colors: string`;
    const schema = compileSchema('TypedCollection', schemaText);
    expect(schema.name).toBe('TypedCollection');
    expect(schema.memberCount).toBe(6);
    expect(schema.get('gender')).toMatchObject({ type: 'string', choices: ['m', 'f'], path: 'gender' });
  const addressDef = schema.get('address');
  expect(addressDef).toMatchObject({ type: 'object', path: 'address' });
  expect(addressDef?.schema?.get('state')).toMatchObject({ type: 'string', path: 'address.state', len: 2 });
    expect(schema.get('colors')).toMatchObject({ type: 'string', path: 'colors' });
  });

  test('parses simple-collection schema', () => {
    const schemaText = `name, age, gender, joiningDt, address: {street, city, state?}, colors, isActive`;
    const schema = compileSchema('SimpleCollection', schemaText);
    expect(schema.name).toBe('SimpleCollection');
    expect(schema.memberCount).toBe(7);
  const addressDef = schema.get('address');
  expect(addressDef).toMatchObject({ type: 'object', path: 'address' });
  expect(addressDef?.schema?.get('state')).toMatchObject({ path: 'address.state' });
    expect(schema.get('colors')).toMatchObject({ type: 'array', path: 'colors' });
    expect(schema.get('isActive')).toMatchObject({ type: 'any', path: 'isActive' });
  });

  test('open object form does not throw', () => {
    expect(() => compileSchema('OpenObject', 'name, age')).not.toThrow();
  });
});
