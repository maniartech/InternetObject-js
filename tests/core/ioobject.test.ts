import IOObject from '../../src/core/internet-object';

describe('IOObject', () => {
  describe('Basic Properties', () => {
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

    it('should report isEmpty correctly', () => {
      const empty = new IOObject({});
      const nonEmpty = new IOObject({ a: 1 });
      expect(empty.isEmpty()).toBe(true);
      expect(nonEmpty.isEmpty()).toBe(false);
    });
  });

  describe('Iteration and Access', () => {
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

    it('should provide keys() iterator', () => {
      const obj = new IOObject({ a: 1, b: 2, c: 3 });
      const keys = [...obj.keys()];
      expect(keys).toEqual(['a', 'b', 'c']);
    });

    it('should provide values() iterator', () => {
      const obj = new IOObject({ a: 1, b: 2, c: 3 });
      const values = [...obj.values()];
      expect(values).toEqual([1, 2, 3]);
    });

    it('should provide entries() iterator', () => {
      const obj = new IOObject({ a: 1, b: 2 });
      const entries = [...obj.entries()];
      expect(entries).toEqual([['a', 1], ['b', 2]]);
    });
  });

  describe('Positional Access', () => {
    it('should get value by index with getAt()', () => {
      const obj = new IOObject({ a: 10, b: 20, c: 30 });
      expect(obj.getAt(0)).toBe(10);
      expect(obj.getAt(1)).toBe(20);
      expect(obj.getAt(2)).toBe(30);
      expect(obj.getAt(99)).toBeUndefined();
    });

    it('should get key by index with keyAt()', () => {
      const obj = new IOObject({ x: 1, y: 2, z: 3 });
      expect(obj.keyAt(0)).toBe('x');
      expect(obj.keyAt(1)).toBe('y');
      expect(obj.keyAt(2)).toBe('z');
      expect(obj.keyAt(99)).toBeUndefined();
    });

    it('should set value by index with setAt()', () => {
      const obj = new IOObject({ a: 1, b: 2, c: 3 });
      const result = obj.setAt(1, 999);
      expect(result).toBe(true);
      expect(obj.getAt(1)).toBe(999);
    });

    it('should delete by index with deleteAt()', () => {
      const obj = new IOObject({ a: 1, b: 2, c: 3 });
      obj.deleteAt(1);
      expect(obj.has('b')).toBe(false);
      // Sparse deletion leaves undefined
      expect(obj.getAt(1)).toBeUndefined();
    });
  });

  describe('Index Lookups', () => {
    it('should find index of key with indexOfKey()', () => {
      const obj = new IOObject({ a: 1, b: 2, c: 3 });
      expect(obj.indexOfKey('a')).toBe(0);
      expect(obj.indexOfKey('b')).toBe(1);
      expect(obj.indexOfKey('c')).toBe(2);
      expect(obj.indexOfKey('missing')).toBe(-1);
    });

    it('should find index of value with indexOf()', () => {
      const obj = new IOObject({ a: 10, b: 20, c: 30 });
      expect(obj.indexOf(10)).toBe(0);
      expect(obj.indexOf(20)).toBe(1);
      expect(obj.indexOf(30)).toBe(2);
      expect(obj.indexOf(999)).toBe(-1);
    });
  });

  describe('Mutators', () => {
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

    it('should push key-value pairs as arrays', () => {
      const obj = new IOObject({ a: 1 });
      obj.push(['b', 2]);
      obj.push(['c', 3]);
      expect(obj.length).toBe(3);
      expect(obj.get('b')).toBe(2);
      expect(obj.get('c')).toBe(3);
      expect([...obj.keys()]).toEqual(['a', 'b', 'c']);
    });

    it('should push positional values without keys', () => {
      const obj = new IOObject({ a: 1 });
      obj.push(42);
      expect(obj.length).toBe(2);
      expect(obj.getAt(1)).toBe(42);
      expect(obj.keyAt(1)).toBeUndefined();
    });

    it('should compact sparse deletions', () => {
      const obj = new IOObject({ a: 1, b: 2, c: 3, d: 4 });
      obj.deleteAt(1); // Delete 'b'
      obj.deleteAt(3); // Delete 'd'
      obj.compact();
      expect(obj.length).toBe(2);
      expect([...obj.keys()]).toEqual(['a', 'c']);
      expect([...obj.values()]).toEqual([1, 3]);
    });
  });

  describe('Search Methods', () => {
    it('should find value matching predicate', () => {
      const obj = new IOObject({ a: 10, b: 25, c: 30 });
      const found = obj.find((value) => value > 20);
      expect(found).toBe(25);
    });

    it('should return undefined when find has no match', () => {
      const obj = new IOObject({ a: 1, b: 2 });
      const found = obj.find((value) => value > 100);
      expect(found).toBeUndefined();
    });

    it('should find index matching predicate', () => {
      const obj = new IOObject({ a: 10, b: 25, c: 30 });
      const index = obj.findIndex((value) => value > 20);
      expect(index).toBe(1);
    });

    it('should return -1 when findIndex has no match', () => {
      const obj = new IOObject({ a: 1, b: 2 });
      const index = obj.findIndex((value) => value > 100);
      expect(index).toBe(-1);
    });

    it('should pass key and index to find predicate', () => {
      const obj = new IOObject({ a: 10, b: 25 });
      let capturedKey: string | undefined;
      let capturedIndex: number = -1;
      obj.find((value, key, index) => {
        if (value === 25) {
          capturedKey = key;
          capturedIndex = index;
          return true;
        }
        return false;
      });
      expect(capturedKey).toBe('b');
      expect(capturedIndex).toBe(1);
    });
  });

  describe('Transformation Methods', () => {
    it('should map values to new array', () => {
      const obj = new IOObject({ a: 1, b: 2, c: 3 });
      const result = obj.map((value, key) => `${key}:${value}`);
      expect(result).toEqual(['a:1', 'b:2', 'c:3']);
    });

    it('should map with index', () => {
      const obj = new IOObject({ a: 10, b: 20 });
      const result = obj.map((value, key, index) => `${index}:${key}=${value}`);
      expect(result).toEqual(['0:a=10', '1:b=20']);
    });
  });

  describe('Static Factory', () => {
    it('should create from array of key-value pairs', () => {
      const obj = IOObject.fromArray([['x', 100], ['y', 200], ['z', 300]]);
      expect(obj.length).toBe(3);
      expect(obj.x).toBe(100);
      expect(obj.y).toBe(200);
      expect(obj.z).toBe(300);
    });
  });

  describe('Dot Notation Access', () => {
    it('should access simple properties via dot notation', () => {
      const obj = new IOObject({ name: 'John', age: 30 });
      expect(obj.name).toBe('John');
      expect(obj.age).toBe(30);
    });

    it('should access nested IOObjects via chained dot notation', () => {
      const inner = new IOObject({ name: 'John' });
      const outer = new IOObject({ profile: inner });
      expect(outer.profile.name).toBe('John');
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const obj = new IOObject({ a: 1, b: 2 });
      expect(obj.toJSON()).toEqual({ a: 1, b: 2 });
    });

    it('should serialize nested IOObjects', () => {
      const inner = new IOObject({ x: 10 });
      const outer = new IOObject({ inner, y: 20 });
      const json = JSON.stringify(outer);
      expect(JSON.parse(json)).toEqual({ inner: { x: 10 }, y: 20 });
    });
  });
});
