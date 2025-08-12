import { compileSchema } from '../../../src/schema'

describe('compileSchema - Internet Object DSL', () => {
  test('parses a nested object schema', () => {
    const schemaText = `
name: string,
age: number,
isActive: bool,
address: {
  street: string,
  city: string,
  state: string
},
colors: [string]
`;
    const schema = compileSchema('Person', schemaText);
    expect(schema.name).toBe('Person');
    expect(schema.memberCount).toBe(5);
    expect(schema.get('name')).toMatchObject({ type: 'string', path: 'name' });
    expect(schema.get('age')).toMatchObject({ type: 'number', path: 'age' });
    expect(schema.get('isActive')).toMatchObject({ type: 'bool', path: 'isActive' });
    expect(schema.get('address')).toMatchObject({ type: 'object', path: 'address' });
    expect(schema.get('address')?.schema).toBeDefined();
  expect(schema.get('address')?.schema.get('street')).toMatchObject({ type: 'string', path: 'address.street' });
    expect(schema.get('colors')).toMatchObject({ type: 'array', path: 'colors' });
    expect(schema.get('colors')?.of).toMatchObject({ type: 'string', path: 'colors' });
  });

  test('parses array of objects', () => {
    const schemaText = `
items: [ { id: number, value: string } ]
`;
    const schema = compileSchema('Collection', schemaText);
    expect(schema.name).toBe('Collection');
    expect(schema.memberCount).toBe(1);
    expect(schema.get('items')).toMatchObject({ type: 'array', path: 'items' });
    expect(schema.get('items')?.of.type).toBe('object');
    expect(schema.get('items')?.of.schema).toBeDefined();
  expect(schema.get('items')?.of.schema.get('id')).toMatchObject({ type: 'number', path: 'items.id' });
  expect(schema.get('items')?.of.schema.get('value')).toMatchObject({ type: 'string', path: 'items.value' });
  });

  // Open object forms like 'name, age' are valid and do not throw
});
