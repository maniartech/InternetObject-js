import IODefinitions from '../../src/core/definitions';

describe('IODefinitions', () => {
  it('should set and get variable values', () => {
    const defs = new IODefinitions();
    defs.set('@var', 123);
    expect(defs.getV('@var')).toBe(123);
  });

  it('should iterate keys and entries in definition order', () => {
    const defs = new IODefinitions();
    defs.set('@a', 1);
    defs.set('b', 2);
    defs.set('@c', 3);
    expect([...defs.keyIterator()]).toEqual(['@a', 'b', '@c']);
    expect([...defs.entries()]).toEqual([
      ['@a', { isSchema: false, isVariable: true, value: 1 }],
      ['b', { isSchema: false, isVariable: false, value: 2 }],
      ['@c', { isSchema: false, isVariable: true, value: 3 }],
    ]);
  });

  it('should delete regular, variable, and schema definitions', () => {
    const defs = new IODefinitions();
    defs.set('foo', 'bar');
    defs.set('@var', 123);
    defs.set('$schema', 'myschema');
    expect(defs.delete('foo')).toBe(true);
    expect(defs.get('foo')).toBeUndefined();
    expect(defs.delete('@var')).toBe(true);
    expect(() => defs.getV('@var')).toThrow();
    expect(defs.delete('$schema')).toBe(true);
    expect(defs.defaultSchema).toBe(null);
    expect(defs.delete('notfound')).toBe(false);
  });

  it('should merge definitions without override', () => {
    const defs1 = new IODefinitions();
    defs1.set('a', 1);
    const defs2 = new IODefinitions();
    defs2.set('a', 2);
    defs2.set('b', 3);
    defs1.merge(defs2);
    expect(defs1.get('a')).toBe(1); // not overridden
    expect(defs1.get('b')).toBe(3);
  });

  it('should merge definitions with override', () => {
    const defs1 = new IODefinitions();
    defs1.set('a', 1);
    const defs2 = new IODefinitions();
    defs2.set('a', 2);
    defs2.set('b', 3);
    defs1.merge(defs2, true);
    expect(defs1.get('a')).toBe(2); // overridden
    expect(defs1.get('b')).toBe(3);
  });

  it('should handle circular references gracefully', () => {
    const defs = new IODefinitions();
    defs.set('@a', () => defs.getV('@b'));
    defs.set('@b', () => defs.getV('@a'));
    // Should not throw, but returns a function that would cause stack overflow if called
    expect(typeof defs.getV('@a')).toBe('function');
    expect(typeof defs.getV('@b')).toBe('function');
  });

  it('should serialize complex values to JSON', () => {
    const defs = new IODefinitions();
    defs.set('obj', { foo: 'bar', baz: 42 });
    defs.set('arr', [1, 2, 3]);
    expect(defs.toJSON()).toEqual({ obj: { foo: 'bar', baz: 42 }, arr: [1, 2, 3] });
  });

  it('should merge definitions', () => {
    const defs1 = new IODefinitions();
    const defs2 = new IODefinitions();
    defs2.set('@var', 456);
    defs1.merge(defs2);
    expect(defs1.getV('@var')).toBe(456);
  });

  it('should serialize to JSON correctly', () => {
    const defs = new IODefinitions();
    defs.set('key', 'value');
    expect(defs.toJSON()).toEqual({ key: 'value' });
  });

  it('should allow later definitions to reference earlier variables', () => {
    const defs = new IODefinitions();
    defs.set('@foo', 'bar');
    defs.set('baz', defs.getV('@foo'));
    expect(defs.get('baz')).toBe('bar');
  });

  it('should not allow earlier definitions to reference later variables', () => {
    const defs = new IODefinitions();
    expect(() => defs.getV('@foo')).toThrow();

    // Before defining @foo, referencing baz should not be resolvable
    expect(defs.get('baz')).toBeUndefined();
    defs.set('@foo', 'bar');
    // After defining @foo, calling baz should work
  defs.set('baz', defs.getV('@foo'));
  expect(defs.get('baz')).toBe('bar');
  });

  it('should throw when referencing undefined variable', () => {
    const defs = new IODefinitions();
    expect(() => defs.getV('@missing')).toThrow();
  });

  it('should preserve definition order for references', () => {
    const defs = new IODefinitions();
    defs.set('@a', 1);
    defs.set('@b', defs.getV('@a') + 1);
    defs.set('@c', defs.getV('@b') + 1);
    expect(defs.getV('@c')).toBe(3);
  });

  it('should delete definitions and update default schema', () => {
    const defs = new IODefinitions();
    defs.set('$schema', 'myschema');
    expect(defs.defaultSchema).toBe('myschema');
    defs.delete('$schema');
    expect(defs.defaultSchema).toBe(null);
  });
});
