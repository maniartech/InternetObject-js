import { loadObject, loadCollection } from '../../src/schema/load-processor';
import { compileSchema } from '../../src/schema';
import Schema from '../../src/schema/schema';
import Definitions from '../../src/core/definitions';
import ValidationError from '../../src/errors/io-validation-error';
import InternetObject from '../../src/core/internet-object';
import Collection from '../../src/core/collection';

describe('Load Processor', () => {
  describe('loadObject', () => {
    describe('basic types', () => {
      it('loads object with primitive types', () => {
        const schema = compileSchema('TestSchema', '{ name: string, age: number, active: bool }');
        const data = { name: 'Alice', age: 28, active: true };

        const result = loadObject(data, schema);

        expect(result).toBeInstanceOf(InternetObject);
        expect(result.get('name')).toBe('Alice');
        expect(result.get('age')).toBe(28);
        expect(result.get('active')).toBe(true);
      });

      it('loads object with optional fields', () => {
        const schema = compileSchema('TestSchema', '{ name: string, age?: number }');
        const data = { name: 'Bob' };

        const result = loadObject(data, schema);

        expect(result.get('name')).toBe('Bob');
        expect(result.get('age')).toBeUndefined();
      });

      it.skip('applies default values for missing fields', () => {
        // TODO: Implement default value syntax in schema parser
        const schema = compileSchema('TestSchema', '{ name: string, count: number = 10 }');
        const data = { name: 'Charlie' };

        const result = loadObject(data, schema);

        expect(result.get('name')).toBe('Charlie');
        expect(result.get('count')).toBe(10);
      });

      it('throws ValidationError for missing required field', () => {
        const schema = compileSchema('TestSchema', '{ name: string, age: number }');
        const data = { name: 'Dave' };

        expect(() => loadObject(data, schema)).toThrow(ValidationError);
        expect(() => loadObject(data, schema)).toThrow(/age/);
      });
    });

    describe('type validation', () => {
      it('validates string type', () => {
        const schema = compileSchema('TestSchema', '{ name: string }');

        expect(() => loadObject({ name: 123 }, schema)).toThrow(ValidationError);
      });

      it('validates number type', () => {
        const schema = compileSchema('TestSchema', '{ age: number }');

        expect(() => loadObject({ age: 'not a number' }, schema)).toThrow(ValidationError);
      });

      it.skip('validates boolean type', () => {
        // TODO: Fix error type - should throw ValidationError not IOError
        const schema = compileSchema('TestSchema', '{ active: bool }');

        expect(() => loadObject({ active: 'yes' }, schema)).toThrow(ValidationError);
      });

      it.skip('validates with constraints (min/max)', () => {
        // TODO: Fix schema parser to handle constraints properly
        const schema = compileSchema('TestSchema', '{ age: number(0, 120) }');

        expect(() => loadObject({ age: -5 }, schema)).toThrow(ValidationError);
        expect(() => loadObject({ age: 150 }, schema)).toThrow(ValidationError);

        const valid = loadObject({ age: 25 }, schema);
        expect(valid.get('age')).toBe(25);
      });

      it.skip('validates choices', () => {
        // TODO: Fix schema parser to handle choices properly
        const schema = compileSchema('TestSchema', '{ status: string(choice: active, inactive, pending) }');

        expect(() => loadObject({ status: 'deleted' }, schema)).toThrow(ValidationError);

        const valid = loadObject({ status: 'active' }, schema);
        expect(valid.get('status')).toBe('active');
      });
    });

    describe('complex types', () => {
      it.skip('loads nested objects', () => {
        // TODO: Object type should return InternetObject for nested objects
        const schema = compileSchema('TestSchema', '{ name: string, address: { city: string, zip: string } }');
        const data = {
          name: 'Eve',
          address: { city: 'NYC', zip: '10001' }
        };

        const result = loadObject(data, schema);

        expect(result.get('name')).toBe('Eve');
        const address = result.get('address');
        expect(address).toBeInstanceOf(InternetObject);
        expect(address.get('city')).toBe('NYC');
        expect(address.get('zip')).toBe('10001');
      });

      it('loads arrays', () => {
        const schema = compileSchema('TestSchema', '{ name: string, tags: [string] }');
        const data = {
          name: 'Frank',
          tags: ['developer', 'typescript', 'testing']
        };

        const result = loadObject(data, schema);

        expect(result.get('name')).toBe('Frank');
        const tags = result.get('tags');
        expect(Array.isArray(tags)).toBe(true);
        expect(tags).toHaveLength(3);
        expect(tags[0]).toBe('developer');
      });

      it.skip('validates array items', () => {
        // TODO: Array type should validate items
        const schema = compileSchema('TestSchema', '{ scores: [number] }');
        const data = { scores: [90, 'invalid', 85] };

        expect(() => loadObject(data, schema)).toThrow(ValidationError);
      });

      it('loads advanced types - bigint', () => {
        const schema = compileSchema('TestSchema', '{ id: bigint }');
        const data = { id: 123456789012345n };

        const result = loadObject(data, schema);

        expect(result.get('id')).toBe(123456789012345n);
      });

      it('loads advanced types - decimal', () => {
        const schema = compileSchema('TestSchema', '{ price: decimal }');
        const data = { price: '19.99' };

        const result = loadObject(data, schema);

        // Decimal returns a Decimal object, not a string
        const price = result.get('price');
        expect(price).toHaveProperty('coefficient');
        expect(price).toHaveProperty('scale', 2);
      });

      it('loads advanced types - datetime', () => {
        const schema = compileSchema('TestSchema', '{ created: datetime }');
        const date = new Date('2024-01-15T10:30:00Z');
        const data = { created: date };

        const result = loadObject(data, schema);

        expect(result.get('created')).toEqual(date);
      });
    });

    describe('open schemas', () => {
      it.skip('allows additional properties in open schema', () => {
        // TODO: Implement '...' syntax in schema parser
        const schema = compileSchema('TestSchema', '{ name: string, ... }');
        const data = {
          name: 'Grace',
          extra: 'allowed',
          another: 42
        };

        const result = loadObject(data, schema);

        expect(result.get('name')).toBe('Grace');
        expect(result.get('extra')).toBe('allowed');
        expect(result.get('another')).toBe(42);
      });

      it('rejects additional properties in closed schema', () => {
        const schema = compileSchema('TestSchema', '{ name: string }');
        const data = {
          name: 'Henry',
          extra: 'not allowed'
        };

        expect(() => loadObject(data, schema)).toThrow(ValidationError);
        expect(() => loadObject(data, schema)).toThrow(/extra/);
      });

      it.skip('validates additional properties in constrained open schema', () => {
        // TODO: Implement '...: type' syntax in schema parser
        const schema = compileSchema('TestSchema', '{ name: string, ...: number }');
        const data = {
          name: 'Iris',
          score1: 90,
          score2: 85
        };

        const result = loadObject(data, schema);

        expect(result.get('name')).toBe('Iris');
        expect(result.get('score1')).toBe(90);
        expect(result.get('score2')).toBe(85);
      });

      it('rejects invalid additional properties in constrained open schema', () => {
        const schema = compileSchema('TestSchema', '{ name: string, ...: number }');
        const data = {
          name: 'Jack',
          score: 'invalid'
        };

        expect(() => loadObject(data, schema)).toThrow(ValidationError);
      });
    });

    describe.skip('variable references', () => {
      // TODO: Implement variable reference syntax in schema parser
      it('resolves default value from definitions', () => {
        const defs = new Definitions();
        defs.set('defaultAge', 25);

        const schema = compileSchema('TestSchema', '{ name: string, age: number = @defaultAge }');
        const data = { name: 'Kate' };

        const result = loadObject(data, schema, defs);

        expect(result.get('age')).toBe(25);
      });

      it('resolves min/max from definitions', () => {
        const defs = new Definitions();
        defs.set('minAge', 18);
        defs.set('maxAge', 65);

        const schema = compileSchema('TestSchema', '{ age: number(@minAge, @maxAge) }');

        expect(() => loadObject({ age: 15 }, schema, defs)).toThrow(ValidationError);
        expect(() => loadObject({ age: 70 }, schema, defs)).toThrow(ValidationError);

        const valid = loadObject({ age: 30 }, schema, defs);
        expect(valid.get('age')).toBe(30);
      });

      it('resolves choices from definitions', () => {
        const defs = new Definitions();
        defs.set('validStatuses', ['active', 'inactive', 'pending']);

        const schema = compileSchema('TestSchema', '{ status: string(choice: @validStatuses) }');

        expect(() => loadObject({ status: 'deleted' }, schema, defs)).toThrow(ValidationError);

        const valid = loadObject({ status: 'active' }, schema, defs);
        expect(valid.get('status')).toBe('active');
      });

      it('resolves schema reference from definitions', () => {
        const defs = new Definitions();
        const addressSchema = compileSchema('TestSchema', '{ city: string, zip: string }');
        defs.set('Address', addressSchema);

        const data = { city: 'Boston', zip: '02101' };

        const result = loadObject(data, 'Address', defs);

        expect(result.get('city')).toBe('Boston');
        expect(result.get('zip')).toBe('02101');
      });
    });

    describe('error handling', () => {
      it('throws ValidationError for non-object input', () => {
        const schema = compileSchema('TestSchema', '{ name: string }');

        expect(() => loadObject('not an object', schema)).toThrow(ValidationError);
        expect(() => loadObject(123, schema)).toThrow(ValidationError);
        expect(() => loadObject(null, schema)).toThrow(ValidationError);
        expect(() => loadObject([1, 2], schema)).toThrow(ValidationError);
      });

      it.skip('throws error for unregistered type', () => {
        // Error is thrown at schema compile time, not loadObject time
        const schema = compileSchema('TestSchema', '{ id: unknownType }');
        const data = { id: 'test' };

        expect(() => loadObject(data, schema)).toThrow(/not registered/);
      });

      it.skip('enhances validation errors with field context', () => {
        // TODO: Implement constraint syntax in schema parser
        const schema = compileSchema('TestSchema', '{ age: number(0, 120) }');

        try {
          loadObject({ age: 150 }, schema);
          fail('Should have thrown ValidationError');
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
          expect((error as Error).message).toContain('age');
        }
      });
    });
  });

  describe('loadCollection', () => {
    describe('basic collection loading', () => {
      it('loads array of simple objects', () => {
        const schema = compileSchema('TestSchema', '{ name: string, age: number }');
        const data = [
          { name: 'Alice', age: 28 },
          { name: 'Bob', age: 35 },
          { name: 'Charlie', age: 42 }
        ];

        const result = loadCollection(data, schema);

        expect(result).toBeInstanceOf(Collection);
        expect(result).toHaveLength(3);
        expect(result.getAt(0).get('name')).toBe('Alice');
        expect(result.getAt(1).get('name')).toBe('Bob');
        expect(result.getAt(2).get('name')).toBe('Charlie');
      });

      it('loads empty array', () => {
        const schema = compileSchema('TestSchema', '{ name: string }');
        const data: any[] = [];

        const result = loadCollection(data, schema);

        expect(result).toBeInstanceOf(Collection);
        expect(result).toHaveLength(0);
      });
    });

    describe('error collection', () => {
      it('continues processing after individual item error', () => {
        const schema = compileSchema('TestSchema', '{ name: string, age: number }');
        const data = [
          { name: 'Alice', age: 28 },
          { name: 'Bob', age: 'invalid' },  // Error
          { name: 'Charlie', age: 42 }
        ];

        const errors: Error[] = [];
        const result = loadCollection(data, schema, undefined, errors);

        expect(result).toHaveLength(3);
        expect(result.getAt(0)).toBeInstanceOf(InternetObject);
        expect(result.getAt(2)).toBeInstanceOf(InternetObject);

        // Check error object
        expect(result.getAt(1)).toHaveProperty('__error', true);
        expect(result.getAt(1)).toHaveProperty('collectionIndex', 1);

        // Check error collector
        expect(errors).toHaveLength(1);
        expect(errors[0]).toBeInstanceOf(ValidationError);
        expect((errors[0] as any).collectionIndex).toBe(1);
      });

      it('attaches collectionIndex to all errors', () => {
        const schema = compileSchema('TestSchema', '{ name: string, age: number }');
        const data = [
          { name: 'Alice', age: 'invalid' },
          { name: 'Bob', age: 'also invalid' },
          { name: 'Charlie', age: 42 }
        ];

        const errors: Error[] = [];
        const result = loadCollection(data, schema, undefined, errors);

        expect(errors).toHaveLength(2);
        expect((errors[0] as any).collectionIndex).toBe(0);
        expect((errors[1] as any).collectionIndex).toBe(1);

        expect(result.getAt(0)).toHaveProperty('collectionIndex', 0);
        expect(result.getAt(1)).toHaveProperty('collectionIndex', 1);
        expect(result.getAt(2)).toBeInstanceOf(InternetObject);
      });

      it('collects errors without error collector parameter', () => {
        const schema = compileSchema('TestSchema', '{ name: string, age: number }');
        const data = [
          { name: 'Alice', age: 28 },
          { name: 'Bob', age: 'invalid' }
        ];

        const result = loadCollection(data, schema);

        expect(result).toHaveLength(2);
        expect(result.getAt(0)).toBeInstanceOf(InternetObject);
        expect(result.getAt(1)).toHaveProperty('__error', true);
      });
    });

    describe('complex collections', () => {
      it.skip('loads collection with nested objects', () => {
        // TODO: Object type should return InternetObject for nested objects
        const schema = compileSchema('TestSchema', '{ name: string, address: { city: string } }');
        const data = [
          { name: 'Alice', address: { city: 'NYC' } },
          { name: 'Bob', address: { city: 'LA' } }
        ];

        const result = loadCollection(data, schema);

        expect(result).toHaveLength(2);
        expect(result.getAt(0).get('address').get('city')).toBe('NYC');
        expect(result.getAt(1).get('address').get('city')).toBe('LA');
      });

      it('loads collection with arrays in items', () => {
        const schema = compileSchema('TestSchema', '{ name: string, tags: [string] }');
        const data = [
          { name: 'Alice', tags: ['dev', 'testing'] },
          { name: 'Bob', tags: ['design', 'ux'] }
        ];

        const result = loadCollection(data, schema);

        expect(result).toHaveLength(2);
        expect(result.getAt(0).get('tags')).toEqual(['dev', 'testing']);
        expect(result.getAt(1).get('tags')).toEqual(['design', 'ux']);
      });

      it('validates complex types in collection items', () => {
        const schema = compileSchema('TestSchema', '{ id: bigint, price: decimal }');
        const data = [
          { id: 123n, price: '19.99' },
          { id: 'invalid', price: '29.99' },  // Error
          { id: 456n, price: '39.99' }
        ];

        const errors: Error[] = [];
        const result = loadCollection(data, schema, undefined, errors);

        expect(result).toHaveLength(3);
        expect(result.getAt(0)).toBeInstanceOf(InternetObject);
        expect(result.getAt(1)).toHaveProperty('__error', true);
        expect(result.getAt(2)).toBeInstanceOf(InternetObject);
        expect(errors).toHaveLength(1);
      });
    });

    describe('schema references', () => {
      it('resolves schema from definitions', () => {
        const defs = new Definitions();
        const schema = compileSchema('TestSchema', '{ name: string, age: number }');
        defs.set('Person', schema);

        const data = [
          { name: 'Alice', age: 28 },
          { name: 'Bob', age: 35 }
        ];

        const result = loadCollection(data, 'Person', defs);

        expect(result).toHaveLength(2);
        expect(result.getAt(0).get('name')).toBe('Alice');
        expect(result.getAt(1).get('name')).toBe('Bob');
      });

      it('throws error for invalid schema reference', () => {
        const defs = new Definitions();
        const data = [{ name: 'Alice' }];

        expect(() => loadCollection(data, 'Unknown', defs)).toThrow(/not found/);
      });
    });

    describe('error handling', () => {
      it('throws ValidationError for non-array input', () => {
        const schema = compileSchema('TestSchema', '{ name: string }');

        expect(() => loadCollection({} as any, schema)).toThrow(ValidationError);
        expect(() => loadCollection('not array' as any, schema)).toThrow(ValidationError);
        expect(() => loadCollection(123 as any, schema)).toThrow(ValidationError);
      });

      it('handles mixed validation and runtime errors', () => {
        const schema = compileSchema('TestSchema', '{ name: string, age: number }');
        const data = [
          { name: 'Alice', age: 28 },
          { name: 'Bob', age: 'invalid' },
          null,  // Will cause runtime error
          { name: 'Dave', age: 50 }
        ];

        const errors: Error[] = [];
        const result = loadCollection(data, schema, undefined, errors);

        expect(result).toHaveLength(4);
        expect(errors.length).toBeGreaterThan(0);
        expect(result.getAt(0)).toBeInstanceOf(InternetObject);
        expect(result.getAt(1)).toHaveProperty('__error', true);
        expect(result.getAt(2)).toHaveProperty('__error', true);
        expect(result.getAt(3)).toBeInstanceOf(InternetObject);
      });
    });
  });
});
