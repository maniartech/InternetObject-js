import { stringify } from '../../src/facade/stringify';
import { compileSchema } from '../../src/schema';
import { loadObject } from '../../src/facade/load';
import InternetObject from '../../src/core/internet-object';
import Collection from '../../src/core/collection';
import Definitions from '../../src/core/definitions';

describe('High-level stringify() API', () => {
  describe('stringify single objects', () => {
    it('stringifies simple object', () => {
      const obj = new InternetObject();
      obj.set('name', 'Alice');
      obj.set('age', 28);

      const schema = compileSchema('User', '{ name: string, age: number }');
      const result = stringify(obj, schema);

      expect(result).toContain('Alice');
      expect(result).toContain('28');
    });

    it('stringifies object with boolean', () => {
      const obj = new InternetObject();
      obj.set('name', 'Bob');
      obj.set('active', true);

      const schema = compileSchema('User', '{ name: string, active: bool }');
      const result = stringify(obj, schema);

      expect(result).toContain('Bob');
      expect(result).toContain('T');  // Boolean as IO format T
    });

    it('stringifies object with optional undefined fields', () => {
      const obj = new InternetObject();
      obj.set('name', 'Charlie');
      // Don't set age - it's optional

      const schema = compileSchema('User', '{ name: string, age?: number }');
      const result = stringify(obj, schema);

      expect(result).toContain('Charlie');
    });

    it('stringifies advanced types - bigint', () => {
      const obj = new InternetObject();
      obj.set('id', 123456789012345n);

      const schema = compileSchema('Entity', '{ id: bigint }');
      const result = stringify(obj, schema);

      expect(result).toContain('123456789012345');
    });

    it('stringifies advanced types - datetime', () => {
      const obj = new InternetObject();
      const date = new Date('2024-01-15T10:30:00Z');
      obj.set('created', date);

      const schema = compileSchema('Entity', '{ created: datetime }');
      const result = stringify(obj, schema);

      expect(result).toContain('2024');
    });
  });

  describe('stringify collections', () => {
    it('stringifies collection of objects', () => {
      const obj1 = new InternetObject();
      obj1.set('name', 'Alice');
      obj1.set('age', 28);

      const obj2 = new InternetObject();
      obj2.set('name', 'Bob');
      obj2.set('age', 35);

      const collection = new Collection([obj1, obj2]);
      const schema = compileSchema('User', '{ name: string, age: number }');

      const result = stringify(collection, schema);

      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).toContain('28');
      expect(result).toContain('35');
    });

    it('stringifies empty collection', () => {
      const collection = new Collection([]);
      const schema = compileSchema('User', '{ name: string }');

      const result = stringify(collection, schema);

      expect(result).toBe('[]');
    });

    it('includes error objects by default', () => {
      const obj = new InternetObject();
      obj.set('name', 'Alice');

      const errorObj = {
        __error: true,
        message: 'Validation failed',
        collectionIndex: 1
      };

      const collection = new Collection([obj, errorObj as any]);
      const schema = compileSchema('User', '{ name: string }');

      const result = stringify(collection, schema);

      expect(result).toContain('Alice');
      expect(result).toContain('error');
    });

    it('skips error objects when skipErrors is true', () => {
      const obj1 = new InternetObject();
      obj1.set('name', 'Alice');

      const errorObj = {
        __error: true,
        message: 'Validation failed'
      };

      const obj2 = new InternetObject();
      obj2.set('name', 'Bob');

      const collection = new Collection([obj1, errorObj as any, obj2]);
      const schema = compileSchema('User', '{ name: string }');

      const result = stringify(collection, schema, undefined, { skipErrors: true });

      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).not.toContain('error');
    });
  });

  describe('formatting options', () => {
    it('formats with numeric indent', () => {
      const obj = new InternetObject();
      obj.set('name', 'Alice');
      obj.set('age', 28);

      const schema = compileSchema('User', '{ name: string, age: number }');
      const result = stringify(obj, schema, undefined, { indent: 2 });

      expect(result).toContain('\n');
      expect(result).toContain('  ');  // Indentation
    });

    it('formats with string indent', () => {
      const obj = new InternetObject();
      obj.set('name', 'Alice');

      const schema = compileSchema('User', '{ name: string }');
      const result = stringify(obj, schema, undefined, { indent: '\t' });

      expect(result).toContain('\n');
      expect(result).toContain('\t');
    });

    it('compact output without indent', () => {
      const obj = new InternetObject();
      obj.set('name', 'Alice');
      obj.set('age', 28);

      const schema = compileSchema('User', '{ name: string, age: number }');
      const result = stringify(obj, schema);

      expect(result).not.toContain('\n');
      expect(result).toContain(',');
    });
  });

  describe('round-trip with loadObject', () => {
    it('load -> stringify maintains data', () => {
      const originalData = { name: 'Alice', age: 28, active: true };
      const schema = compileSchema('User', '{ name: string, age: number, active: bool }');

      // Load
      const loaded = loadObject(originalData, schema) as InternetObject;

      // Verify loaded data
      expect(loaded.get('name')).toBe('Alice');
      expect(loaded.get('age')).toBe(28);
      expect(loaded.get('active')).toBe(true);

      // Stringify
      const stringified = stringify(loaded, schema);

      // Result should contain all values
      expect(stringified).toContain('Alice');
      expect(stringified).toContain('28');
      expect(stringified).toContain('T');  // Boolean as IO format
    });

    it('collection loadObject -> stringify maintains data', () => {
      const originalData = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];
      const schema = compileSchema('User', '{ name: string, age: number }');

      // Load
      const loaded = loadObject(originalData, schema) as Collection<InternetObject>;
      expect(loaded.length).toBe(2);

      // Stringify
      const stringified = stringify(loaded, schema);

      // Result should contain both objects
      expect(stringified).toContain('Alice');
      expect(stringified).toContain('Bob');
      expect(stringified).toContain('28');
      expect(stringified).toContain('35');
    });

    it('preserves advanced types through round-trip', () => {
      const originalData = {
        id: 999999999999999n,
        created: new Date('2024-01-15T10:30:00Z')
      };
      const schema = compileSchema('Entity', '{ id: bigint, created: datetime }');

      // Load
      const loaded = loadObject(originalData, schema) as InternetObject;
      expect(loaded.get('id')).toBe(999999999999999n);
      expect(loaded.get('created')).toBeInstanceOf(Date);

      // Stringify
      const stringified = stringify(loaded, schema);

      expect(stringified).toContain('999999999999999');
      expect(stringified).toContain('2024');
    });
  });

  describe('without schema', () => {
    it('falls back to JSON stringify for objects without schema', () => {
      const obj = new InternetObject();
      obj.set('name', 'Alice');
      obj.set('age', 28);

      const result = stringify(obj);

      // Should produce some valid output
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('stringifies plain values', () => {
      expect(stringify('hello')).toBe('"hello"');
      expect(stringify(42)).toBe('42');
      expect(stringify(true)).toBe('true');
      expect(stringify(null)).toBe('null');
    });
  });

  describe('with definitions', () => {
    it('resolves schema from definitions', () => {
      const defs = new Definitions();
      const schema = compileSchema('User', '{ name: string, age: number }');
      defs.set('User', schema);

      const obj = new InternetObject();
      obj.set('name', 'Alice');
      obj.set('age', 28);

      const result = stringify(obj, 'User', defs);

      expect(result).toContain('Alice');
      expect(result).toContain('28');
    });
  });
});
