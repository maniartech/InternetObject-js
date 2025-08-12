import { Schema } from '../../../src';

describe('Schema Architecture Example', () => {
  test('basic schema creation and member access', () => {
    const schema = Schema.create('Person')
      .addMember('name', { type: 'string' })
      .addMember('age', { type: 'number' })
      .addMember('isActive', { type: 'boolean' })
      .setOpen(true)
      .build();

    expect(schema.name).toBe('Person');
    expect(schema.open).toBe(true);
    expect(schema.memberCount).toBe(3);
    expect(schema.names).toEqual(['name', 'age', 'isActive']);
    expect(schema.get('name')).toMatchObject({ type: 'string', path: 'name' });
    expect(schema.get('age')).toMatchObject({ type: 'number', path: 'age' });
    expect(schema.get('isActive')).toMatchObject({ type: 'boolean', path: 'isActive' });
    expect(schema.has('name')).toBe(true);
    expect(schema.has('missing')).toBe(false);
  });

  test('immutability of names and defs', () => {
    const schema = Schema.create('Test')
      .addMember('field', { type: 'string' })
      .build();
    expect(Object.isFrozen(schema.names)).toBe(true);
    expect(Object.isFrozen(schema.defs)).toBe(true);
    expect(() => {
      (schema.names as any).push('other');
    }).toThrow();
    expect(() => {
      (schema.defs as any).other = { type: 'number' };
    }).toThrow();
  });

  test('complex schema with sample data', () => {
    const schema = Schema.create('Employee')
      .addMember('id', { type: 'number' })
      .addMember('name', { type: 'string' })
      .addMember('roles', { type: 'array', itemType: 'string' })
      .addMember('active', { type: 'boolean' })
      .build();

    const sample = {
      id: 101,
      name: 'Alice',
      roles: ['admin', 'user'],
      active: true
    };

    // Simulate validation (not using SchemaValidator here)
    for (const key of schema.names) {
      expect(sample).toHaveProperty(key);
      expect(typeof sample[key]).toBe(
        schema.get(key)?.type === 'array' ? 'object' : schema.get(key)?.type
      );
    }
  });
});
