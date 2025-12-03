import { compileSchema } from '../../../src/schema';

describe('compileSchema - Additional Properties Validation', () => {
  test('additional properties: string', () => {
    const schemaText = `name: string, *: string`;
    const schema = compileSchema('ExtraString', schemaText);
    expect(schema.open).toMatchObject({ type: 'string', path: '*' });
    expect(schema.get('*')).toMatchObject({ type: 'string', path: '*' });
  });

  test('additional properties: {}', () => {
    const schemaText = `name: string, *: {}`;
    const schema = compileSchema('ExtraObject', schemaText);
    expect(schema.open).toMatchObject({ type: 'object', path: '*' });
    const extra = schema.get('*');
    expect(extra).toMatchObject({ type: 'object', path: '*' });
    // For empty object additional props (*: {}), the inner schema is open
    expect(extra?.schema?.open).toBe(true);
  });

  test('additional properties: []', () => {
    const schemaText = `name: string, *: []`;
    const schema = compileSchema('ExtraArray', schemaText);
    expect(schema.open).toMatchObject({ type: 'array', path: '*' });
    const extra = schema.get('*');
    expect(extra).toMatchObject({ type: 'array', path: '*' });
    expect(extra?.of).toMatchObject({ type: 'any' });
  });

  test('additional properties: {string, minLen: 10}', () => {
    const schemaText = `name: string, *: {string, minLen: 10}`;
    const schema = compileSchema('ExtraStringMinLen', schemaText);
    expect(schema.open).toMatchObject({ type: 'string', path: '*', minLen: 10 });
    expect(schema.get('*')).toMatchObject({ type: 'string', path: '*', minLen: 10 });
  });

  test('additional properties: [string]', () => {
    const schemaText = `name: string, *: [string]`;
    const schema = compileSchema('ExtraArrayString', schemaText);
    expect(schema.open).toMatchObject({ type: 'array', path: '*' });
    const extra = schema.get('*');
    expect(extra).toMatchObject({ type: 'array', path: '*' });
    expect(extra?.of).toMatchObject({ type: 'string' });
  });
});
