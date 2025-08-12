import { compileSchema } from '../../../src/schema';

describe('compileSchema - Advanced Patterns', () => {
  test('optional and nullable fields', () => {
    const schemaText = `email?: string, bio?*: string, nickname*: string`;
    const schema = compileSchema('UserProfile', schemaText);
    expect(schema.get('email')).toMatchObject({ type: 'string', path: 'email', optional: true });
    expect(schema.get('bio')).toMatchObject({ type: 'string', path: 'bio', optional: true, null: true });
    expect(schema.get('nickname')).toMatchObject({ type: 'string', path: 'nickname', null: true });
  });

  test('dynamic/extra fields', () => {
    const schemaText = `name: string, *`;
    const schema = compileSchema('DynamicUser', schemaText);
  expect(schema.get('name')).toMatchObject({ type: 'string', path: 'name' });
  expect(schema.open).toBe(true);
  });

  // Reference resolution requires Definitions and is not tested here

  test('open forms', () => {
    const schemaText = `meta: {}, tags: []`;
    const schema = compileSchema('OpenForms', schemaText);
    expect(schema.get('meta')).toMatchObject({ type: 'object', path: 'meta' });
    expect(schema.get('tags')).toMatchObject({ type: 'array', path: 'tags', of: { type: 'any' } });
  });

  test('constraints', () => {
    const schemaText = `score: {int, min: 0, max: 100}, name: {string, maxLen: 100}`;
    const schema = compileSchema('Constrained', schemaText);
    expect(schema.get('score')).toMatchObject({ type: 'int', path: 'score', min: 0, max: 100 });
    expect(schema.get('name')).toMatchObject({ type: 'string', path: 'name', maxLen: 100 });
  });
});
