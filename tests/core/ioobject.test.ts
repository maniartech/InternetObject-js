import IOObject from '../../src/core/internet-object';

describe('IOObject', () => {
  it('should return correct length for empty and non-empty objects, and Object.keys should reflect keys', () => {
    const obj = new IOObject();
    expect(obj.length).toBe(0);
  const userKeys0 = Object.keys(obj).filter(k => !['items', 'keyMap'].includes(k));
  expect(userKeys0).toEqual([]);
    obj.set('a', 1);
    expect(obj.length).toBe(1);
  const userKeys1 = Object.keys(obj).filter(k => !['items', 'keyMap'].includes(k));
  expect(userKeys1).toEqual(['a']);
    obj.set('b', 2);
    expect(obj.length).toBe(2);
  const userKeys2 = Object.keys(obj).filter(k => !['items', 'keyMap'].includes(k));
  expect(userKeys2).toEqual(expect.arrayContaining(['a', 'b']));
    // Dot notation access
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
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

  it('should support mutators and deletion, and remove instance properties', () => {
    const obj = new IOObject();
    obj.set('a', 1);
    obj.set('b', 2);
    expect(obj.length).toBe(2);
    expect(obj.a).toBe(1);
    expect(obj.b).toBe(2);
    obj.delete('a');
    expect(obj.length).toBe(2); // length includes undefined slots
    expect(obj.a).toBeUndefined();
    obj.compact();
    expect(obj.length).toBe(1);
    expect(obj.get('a')).toBeUndefined();
    expect(obj.get('b')).toBe(2);
    expect(obj.b).toBe(2);
    // Clear all
    obj.clear();
  const userKeysClear = Object.keys(obj).filter(k => !['items', 'keyMap'].includes(k));
  expect(userKeysClear).toEqual([]);
    expect(obj.b).toBeUndefined();
  });

  it('should serialize to JSON correctly', () => {
    const obj = new IOObject({ a: 1, b: 2 });
    expect(obj.toJSON()).toEqual({ a: 1, b: 2 });
  });
});
