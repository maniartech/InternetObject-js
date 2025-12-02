import { stringify } from '../../src/facade/stringify';
import { compileSchema } from '../../src/schema';
import { loadObject, loadCollection } from '../../src/facade/load';
import InternetObject from '../../src/core/internet-object';
import Collection from '../../src/core/collection';
import Definitions from '../../src/core/definitions';

/**
 * Helper to create definitions with a schema as the default
 */
function createDefsWithSchema(schemaName: string, schemaText: string): Definitions {
  const defs = new Definitions();
  const schema = compileSchema(schemaName, schemaText);
  defs.set('$schema', schema);
  return defs;
}

describe('High-level stringify() API', () => {
  describe('stringify single objects', () => {
    it('stringifies simple object', () => {
      const obj = new InternetObject();
      obj.set('name', 'Alice');
      obj.set('age', 28);

      const defs = createDefsWithSchema('User', '{ name: string, age: number }');
      const result = stringify(obj, defs);

      expect(result).toContain('Alice');
      expect(result).toContain('28');
    });

    it('stringifies object with boolean', () => {
      const obj = new InternetObject();
      obj.set('name', 'Bob');
      obj.set('active', true);

      const defs = createDefsWithSchema('User', '{ name: string, active: bool }');
      const result = stringify(obj, defs);

      expect(result).toContain('Bob');
      expect(result).toContain('T');  // Boolean as IO format T
    });

    it('stringifies object with optional undefined fields', () => {
      const obj = new InternetObject();
      obj.set('name', 'Charlie');
      // Don't set age - it's optional

      const defs = createDefsWithSchema('User', '{ name: string, age?: number }');
      const result = stringify(obj, defs);

      expect(result).toContain('Charlie');
    });

    it('stringifies advanced types - bigint', () => {
      const obj = new InternetObject();
      obj.set('id', 123456789012345n);

      const defs = createDefsWithSchema('Entity', '{ id: bigint }');
      const result = stringify(obj, defs);

      expect(result).toContain('123456789012345');
    });

    it('stringifies advanced types - datetime', () => {
      const obj = new InternetObject();
      const date = new Date('2024-01-15T10:30:00Z');
      obj.set('created', date);

      const defs = createDefsWithSchema('Entity', '{ created: datetime }');
      const result = stringify(obj, defs);

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
      const defs = createDefsWithSchema('User', '{ name: string, age: number }');

      const result = stringify(collection, defs);

      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).toContain('28');
      expect(result).toContain('35');
    });

    it('stringifies empty collection', () => {
      const collection = new Collection([]);
      const defs = createDefsWithSchema('User', '{ name: string }');

      const result = stringify(collection, defs);

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
      const defs = createDefsWithSchema('User', '{ name: string }');

      const result = stringify(collection, defs);

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
      const defs = createDefsWithSchema('User', '{ name: string }');

      const result = stringify(collection, defs, { skipErrors: true });

      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).not.toContain('error');
    });
  });

  describe('formatting options', () => {
    it('formats with numeric indent - simple objects remain compact', () => {
      const obj = new InternetObject();
      obj.set('name', 'Alice');
      obj.set('age', 28);

      const defs = createDefsWithSchema('User', '{ name: string, age: number }');
      const result = stringify(obj, defs, { indent: 2 });

      // Simple objects stay compact (no nested structures)
      expect(result).toBe('Alice, 28');
    });

    it('formats with string indent - simple objects remain compact', () => {
      const obj = new InternetObject();
      obj.set('name', 'Alice');

      const defs = createDefsWithSchema('User', '{ name: string }');
      const result = stringify(obj, defs, { indent: '\t' });

      // Single value, stays compact
      expect(result).toBe('Alice');
    });

    it('compact output without indent', () => {
      const obj = new InternetObject();
      obj.set('name', 'Alice');
      obj.set('age', 28);

      const defs = createDefsWithSchema('User', '{ name: string, age: number }');
      const result = stringify(obj, defs);

      expect(result).not.toContain('\n');
      expect(result).toContain(',');
    });
  });

  describe('round-trip with loadObject', () => {
    it('load -> stringify maintains data', () => {
      const originalData = { name: 'Alice', age: 28, active: true };
      const defs = createDefsWithSchema('User', '{ name: string, age: number, active: bool }');

      // Load
      const loaded = loadObject(originalData, defs) as InternetObject;

      // Verify loaded data
      expect(loaded.get('name')).toBe('Alice');
      expect(loaded.get('age')).toBe(28);
      expect(loaded.get('active')).toBe(true);

      // Stringify
      const stringified = stringify(loaded, defs);

      // Result should contain all values
      expect(stringified).toContain('Alice');
      expect(stringified).toContain('28');
      expect(stringified).toContain('T');  // Boolean as IO format
    });

    it('collection loadCollection -> stringify maintains data', () => {
      const originalData = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];
      const defs = createDefsWithSchema('User', '{ name: string, age: number }');

      // Load using loadCollection for arrays
      const loaded = loadCollection(originalData, defs);
      expect(loaded.length).toBe(2);

      // Stringify
      const stringified = stringify(loaded, defs);

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
      const defs = createDefsWithSchema('Entity', '{ id: bigint, created: datetime }');

      // Load
      const loaded = loadObject(originalData, defs) as InternetObject;
      expect(loaded.get('id')).toBe(999999999999999n);
      expect(loaded.get('created')).toBeInstanceOf(Date);

      // Stringify
      const stringified = stringify(loaded, defs);

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

  describe('with definitions using schemaName', () => {
    it('uses schemaName to pick schema from definitions', () => {
      const defs = new Definitions();
      const schema = compileSchema('User', '{ name: string, age: number }');
      defs.set('$User', schema);

      const obj = new InternetObject();
      obj.set('name', 'Alice');
      obj.set('age', 28);

      // Use schemaName option to pick $User schema
      const result = stringify(obj, defs, { schemaName: '$User' });

      expect(result).toContain('Alice');
      expect(result).toContain('28');
    });
  });
});
