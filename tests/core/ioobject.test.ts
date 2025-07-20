import IOObject from '../../src/core/internet-object';

describe('IOObject', () => {
  it('should return correct length for empty and non-empty objects', () => {
    const obj = new IOObject();
    expect(obj.length).toBe(0);
    obj.set('a', 1);
    expect(obj.length).toBe(1);
    obj.set('b', 2);
    expect(obj.length).toBe(2);
  });

  it('should support iteration and accessors', () => {
    const obj = new IOObject({ a: 1, b: 2 });
    const keys: (string | undefined)[] = [];
    const values: any[] = [];
    for (const [key, value] of obj) {
      keys.push(key);
      values.push(value);
    }
    expect(keys).toContain('a');
    expect(keys).toContain('b');
    expect(values).toContain(1);
    expect(values).toContain(2);
  });

  it('should support mutators and deletion', () => {
    const obj = new IOObject();
    obj.set('a', 1);
    obj.set('b', 2);
    expect(obj.length).toBe(2);
    obj.delete('a');
    expect(obj.length).toBe(2); // length includes undefined slots
    obj.compact();
    expect(obj.length).toBe(1);
    expect(obj.get('a')).toBeUndefined();
    expect(obj.get('b')).toBe(2);
  });

  it('should serialize to JSON correctly', () => {
    const obj = new IOObject({ a: 1, b: 2 });
    expect(obj.toJSON()).toEqual({ a: 1, b: 2 });
  });
});
