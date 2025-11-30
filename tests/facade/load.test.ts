import { loadObject } from '../../src/facade/load';
import { compileSchema } from '../../src/schema';
import Definitions from '../../src/core/definitions';
import InternetObject from '../../src/core/internet-object';
import Collection from '../../src/core/collection';
import ValidationError from '../../src/errors/io-validation-error';

describe('High-level loadObject() API', () => {
  describe('loading single objects', () => {
    it('loads object with IO text schema', () => {
      const data = { name: 'Alice', age: 28 };
      const result = loadObject(data, '{ name: string, age: number }');

      expect(result).toBeInstanceOf(InternetObject);
      expect((result as InternetObject).get('name')).toBe('Alice');
      expect((result as InternetObject).get('age')).toBe(28);
    });

    it('loads object with precompiled schema', () => {
      const schema = compileSchema('User', '{ name: string, age: number }');
      const data = { name: 'Bob', age: 35 };

      const result = loadObject(data, schema);

      expect(result).toBeInstanceOf(InternetObject);
      expect((result as InternetObject).get('name')).toBe('Bob');
    });

    it('loads object with schema reference from definitions', () => {
      const defs = new Definitions();
      const schema = compileSchema('User', '{ name: string, age: number }');
      defs.set('User', schema);

      const data = { name: 'Charlie', age: 42 };
      const result = loadObject(data, 'User', defs);

      expect(result).toBeInstanceOf(InternetObject);
      expect((result as InternetObject).get('name')).toBe('Charlie');
    });

    it('validates object against schema', () => {
      const data = { name: 'Invalid', age: 'not a number' };

      expect(() => loadObject(data, '{ name: string, age: number }')).toThrow(ValidationError);
    });
  });

  describe('loading collections', () => {
    it('loads array with IO text schema', () => {
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 },
        { name: 'Charlie', age: 42 }
      ];

      const result = loadObject(data, '{ name: string, age: number }');

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(3);
      expect((result as Collection<InternetObject>).getAt(0).get('name')).toBe('Alice');
      expect((result as Collection<InternetObject>).getAt(1).get('name')).toBe('Bob');
      expect((result as Collection<InternetObject>).getAt(2).get('name')).toBe('Charlie');
    });

    it('loads empty array', () => {
      const data: any[] = [];
      const result = loadObject(data, '{ name: string }');

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(0);
    });

    it('collects errors in collection with error collector', () => {
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 'invalid' },  // Error
        { name: 'Charlie', age: 42 }
      ];

      const errors: Error[] = [];
      const result = loadObject(data, '{ name: string, age: number }', undefined, errors);

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(3);
      expect(errors).toHaveLength(1);
      expect((errors[0] as any).collectionIndex).toBe(1);

      // First and third items should be valid
      expect((result as Collection<InternetObject>).getAt(0)).toBeInstanceOf(InternetObject);
      expect((result as Collection<InternetObject>).getAt(2)).toBeInstanceOf(InternetObject);

      // Second item should be error object
      const errorItem = (result as Collection<InternetObject>).getAt(1) as any;
      expect(errorItem.__error).toBe(true);
      expect(errorItem.collectionIndex).toBe(1);
    });

    it('continues processing after errors without error collector', () => {
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 'invalid' },
        { name: 'Charlie', age: 42 }
      ];

      const result = loadObject(data, '{ name: string, age: number }');

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(3);
      expect((result as Collection<InternetObject>).getAt(0)).toBeInstanceOf(InternetObject);
      expect((result as Collection<InternetObject>).getAt(2)).toBeInstanceOf(InternetObject);
    });
  });

  describe('complex data structures', () => {
    it('loads objects with nested structures', () => {
      const data = {
        name: 'Alice',
        tags: ['developer', 'typescript']
      };

      const result = loadObject(data, '{ name: string, tags: [string] }');

      expect(result).toBeInstanceOf(InternetObject);
      expect((result as InternetObject).get('name')).toBe('Alice');
      expect((result as InternetObject).get('tags')).toEqual(['developer', 'typescript']);
    });

    it('loads advanced types', () => {
      const data = {
        id: 123456789012345n,
        price: '19.99',
        created: new Date('2024-01-15T10:30:00Z')
      };

      const result = loadObject(data, '{ id: bigint, price: decimal, created: datetime }');

      expect(result).toBeInstanceOf(InternetObject);
      expect((result as InternetObject).get('id')).toBe(123456789012345n);
      expect((result as InternetObject).get('price')).toHaveProperty('coefficient');
      expect((result as InternetObject).get('created')).toBeInstanceOf(Date);
    });

    it('loads collection with advanced types', () => {
      const data = [
        { id: 123n, price: '19.99' },
        { id: 456n, price: '29.99' }
      ];

      const result = loadObject(data, '{ id: bigint, price: decimal }');

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(2);
      expect((result as Collection<InternetObject>).getAt(0).get('id')).toBe(123n);
    });
  });

  describe('error handling', () => {
    it('throws for invalid data type', () => {
      expect(() => loadObject('not an object', '{ name: string }')).toThrow(ValidationError);
      expect(() => loadObject(123, '{ name: string }')).toThrow(ValidationError);
      expect(() => loadObject(null, '{ name: string }')).toThrow(ValidationError);
    });

    it('throws for missing required fields', () => {
      const data = { name: 'Alice' };  // Missing 'age'

      expect(() => loadObject(data, '{ name: string, age: number }')).toThrow(ValidationError);
    });

    it('throws for invalid schema reference', () => {
      const defs = new Definitions();
      const data = { name: 'Alice' };

      // When schema ref doesn't exist, it's compiled as IO text and fails validation
      expect(() => loadObject(data, 'UnknownSchema', defs)).toThrow(ValidationError);
    });
  });

  describe('integration with definitions', () => {
    it('resolves schema from definitions', () => {
      const defs = new Definitions();
      const userSchema = compileSchema('User', '{ name: string, age: number }');
      defs.set('User', userSchema);

      const data = { name: 'Alice', age: 28 };
      const result = loadObject(data, 'User', defs);

      expect(result).toBeInstanceOf(InternetObject);
      expect((result as InternetObject).get('name')).toBe('Alice');
    });

    it('handles collection with schema from definitions', () => {
      const defs = new Definitions();
      const userSchema = compileSchema('User', '{ name: string, age: number }');
      defs.set('User', userSchema);

      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];

      const result = loadObject(data, 'User', defs);

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(2);
    });
  });
});
