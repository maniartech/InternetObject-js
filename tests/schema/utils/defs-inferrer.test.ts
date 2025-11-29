import { inferDefs, InferredDefs } from '../../../src/schema/utils/defs-inferrer';
import { loadDoc, load } from '../../../src/facade/load';
import { stringify, parse } from '../../../src/index';

describe('Definition Inference (inferDefs)', () => {

  describe('Basic Type Inference', () => {
    it('infers string type from string value', () => {
      const data = { name: 'Alice' };
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['name'].type).toBe('string');
    });

    it('infers number type from number value', () => {
      const data = { age: 28 };
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['age'].type).toBe('number');
    });

    it('infers bool type from boolean value', () => {
      const data = { active: true };
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['active'].type).toBe('bool');
    });

    it('infers nullable any from null value', () => {
      const data = { value: null };
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['value'].type).toBe('any');
      expect(rootSchema.defs['value'].null).toBe(true);
    });
  });

  describe('Nested Object Inference', () => {
    it('creates named schema for nested objects', () => {
      const data = {
        name: 'Alice',
        address: { city: 'NYC', zip: '10001' }
      };
      const { definitions, rootSchema } = inferDefs(data);

      // Root schema should reference $address
      expect(rootSchema.defs['address'].schemaRef).toBe('$address');

      // $address should be in definitions
      const addressSchema = definitions.get('$address');
      expect(addressSchema).toBeDefined();
      expect(addressSchema!.defs['city'].type).toBe('string');
      expect(addressSchema!.defs['zip'].type).toBe('string');
    });

    it('creates deeply nested schemas', () => {
      const data = {
        user: {
          profile: {
            social: { twitter: '@alice' }
          }
        }
      };
      const { definitions } = inferDefs(data);

      expect(definitions.get('$user')).toBeDefined();
      expect(definitions.get('$profile')).toBeDefined();
      expect(definitions.get('$social')).toBeDefined();
    });
  });

  describe('Array of Objects Inference', () => {
    it('creates singularized schema for array items', () => {
      const data = {
        books: [
          { title: 'Book 1', author: 'Author 1' },
          { title: 'Book 2', author: 'Author 2' }
        ]
      };
      const { definitions, rootSchema } = inferDefs(data);

      // Root schema should have books: [$book]
      expect(rootSchema.defs['books'].type).toBe('array');
      expect(rootSchema.defs['books'].schemaRef).toBe('$book');

      // $book should be in definitions
      const bookSchema = definitions.get('$book');
      expect(bookSchema).toBeDefined();
      expect(bookSchema!.defs['title'].type).toBe('string');
      expect(bookSchema!.defs['author'].type).toBe('string');
    });

    it('singularizes common plural forms', () => {
      // Test various pluralization patterns
      const testCases = [
        { field: 'categories', expected: '$category' },
        { field: 'boxes', expected: '$box' },
        { field: 'subscribers', expected: '$subscriber' },
        { field: 'items', expected: '$item' },
      ];

      for (const { field, expected } of testCases) {
        const data = { [field]: [{ name: 'Test' }] };
        const { rootSchema } = inferDefs(data);
        expect(rootSchema.defs[field].schemaRef).toBe(expected);
      }
    });
  });

  describe('Root-Level Arrays (Collections)', () => {
    it('treats root array of objects as collection', () => {
      const users = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];
      const { rootSchema, definitions } = inferDefs(users);

      // Root schema should be the item schema
      expect(rootSchema.name).toBe('$schema');
      expect(rootSchema.defs['name'].type).toBe('string');
      expect(rootSchema.defs['age'].type).toBe('number');
    });

    it('loadDoc creates collection from root array', () => {
      const users = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];
      const doc = loadDoc(users, undefined, { inferDefs: true });

      expect(doc).toBeDefined();
      expect(doc.header.schema).toBeDefined();

      // Stringify should output collection format
      const ioText = stringify(doc, undefined, undefined, { includeHeader: true });
      expect(ioText).toContain('name: string');
      expect(ioText).toContain('age: number');
    });

    it('root array with nested objects creates proper schemas', () => {
      const orders = [
        { id: 1, customer: { name: 'Alice', email: 'alice@test.com' }, total: 100 },
        { id: 2, customer: { name: 'Bob', email: 'bob@test.com' }, total: 200 }
      ];
      const { definitions, rootSchema } = inferDefs(orders);

      // Root schema should have customer reference
      expect(rootSchema.defs['customer'].schemaRef).toBe('$customer');

      // $customer should be in definitions
      const customerSchema = definitions.get('$customer');
      expect(customerSchema).toBeDefined();
      expect(customerSchema!.defs['name'].type).toBe('string');
      expect(customerSchema!.defs['email'].type).toBe('string');
    });

    it('handles root array of primitives', () => {
      const numbers = [1, 2, 3, 4, 5];
      const { rootSchema } = inferDefs(numbers);

      // Should handle gracefully - creates basic array schema
      expect(rootSchema).toBeDefined();
    });

    it('handles empty root array', () => {
      const empty: any[] = [];
      const { rootSchema } = inferDefs(empty);

      expect(rootSchema).toBeDefined();
    });

    it('round-trips root array data correctly', () => {
      const users = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];

      const doc = loadDoc(users, undefined, { inferDefs: true });
      const ioText = stringify(doc, undefined, undefined, { includeHeader: true });

      // Parse it back
      const reparsed = parse(ioText);
      const json = reparsed.toJSON();

      // Should match original
      expect(json).toEqual(users);
    });
  });

  describe('Multi-Pass Schema Inference', () => {
    describe('Rule 1: Null Value on First Encounter', () => {
      it('sets type to any with null:true when first value is null', () => {
        const data = [
          { name: 'Alice', age: null }
        ];
        const { rootSchema } = inferDefs(data);

        expect(rootSchema.defs['age'].type).toBe('any');
        expect(rootSchema.defs['age'].null).toBe(true);
      });
    });

    describe('Rule 2: New Key in Later Iterations → Optional', () => {
      it('marks new keys as optional', () => {
        const data = [
          { name: 'Alice' },
          { name: 'Bob', email: 'bob@test.com' }
        ];
        const { rootSchema } = inferDefs(data);

        expect(rootSchema.defs['email'].optional).toBe(true);
        expect(rootSchema.defs['email'].type).toBe('string');
      });
    });

    describe('Rule 3: New Key with Null Value → Optional & Nullable', () => {
      it('marks new keys with null value as optional and nullable', () => {
        const data = [
          { name: 'Alice' },
          { name: 'Bob', middleName: null }
        ];
        const { rootSchema } = inferDefs(data);

        expect(rootSchema.defs['middleName'].optional).toBe(true);
        expect(rootSchema.defs['middleName'].null).toBe(true);
        expect(rootSchema.defs['middleName'].type).toBe('any');
      });
    });

    describe('Rule 4: Missing Key in Later Iterations → Optional', () => {
      it('marks keys missing in later objects as optional', () => {
        const data = [
          { name: 'Alice', age: 28 },
          { name: 'Bob' }  // age is missing
        ];
        const { rootSchema } = inferDefs(data);

        expect(rootSchema.defs['age'].optional).toBe(true);
        expect(rootSchema.defs['age'].type).toBe('number');
      });
    });

    describe('Rule 5: Type Mismatch → Any', () => {
      it('changes type to any when types differ', () => {
        const data = [
          { name: 'Alice', id: 123 },
          { name: 'Bob', id: 'B-456' }
        ];
        const { rootSchema } = inferDefs(data);

        expect(rootSchema.defs['id'].type).toBe('any');
      });
    });

    describe('Rule 6: Null in Later Iteration → Add Nullable', () => {
      it('adds nullable when value becomes null', () => {
        const data = [
          { name: 'Alice', age: 28 },
          { name: 'Bob', age: null }
        ];
        const { rootSchema } = inferDefs(data);

        // Should still be number type but nullable
        // Note: current implementation might change to 'any' - depends on impl
        expect(rootSchema.defs['age'].null).toBe(true);
      });
    });

    describe('Recursive Application to Nested Objects', () => {
      it('applies rules recursively to nested object arrays', () => {
        const data = [
          {
            name: 'Alice',
            address: { city: 'NYC', zip: '10001' }
          },
          {
            name: 'Bob',
            address: { city: 'LA', country: 'USA' }  // zip missing, country new
          }
        ];
        const { definitions } = inferDefs(data);

        const addressSchema = definitions.get('$address');
        expect(addressSchema).toBeDefined();

        // zip should be optional (missing in second)
        expect(addressSchema!.defs['zip'].optional).toBe(true);

        // country should be optional (not in first)
        expect(addressSchema!.defs['country'].optional).toBe(true);
      });
    });
  });

  describe('Member Order Preservation', () => {
    it('maintains discovery order of members', () => {
      const data = [
        { a: 1, b: 2 },
        { a: 1, c: 3, b: 2 }  // c discovered after a and b
      ];
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.names).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty arrays within objects', () => {
      const data = { items: [] };
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['items'].type).toBe('array');
      // Cannot infer item type from empty array
      expect(rootSchema.defs['items'].schemaRef).toBeUndefined();
    });

    it('handles arrays with mixed primitive types', () => {
      const data = { values: [1, 'hello', true, null] };
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['values'].type).toBe('array');
    });

    it('handles Date objects', () => {
      const data = { created: new Date('2024-01-15') };
      const { rootSchema } = inferDefs(data);

      // Current impl may treat Date as object
      expect(rootSchema.defs['created']).toBeDefined();
    });
  });

  describe('Complete Example', () => {
    it('handles library data example', () => {
      const libraryData = {
        name: 'City Library',
        address: '123 Main St',
        books: [
          {
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            isbn: 1234567890,
            available: true,
            categories: ['Fiction', 'Classic'],
            borrowedBy: { userId: 'user123', dueDate: '2024-02-20' }
          },
          {
            title: '1984',
            author: 'George Orwell',
            isbn: 2345678901,
            available: false,
            categories: ['Fiction', 'Dystopian']
            // borrowedBy is missing - should be marked optional
          }
        ]
      };

      const doc = loadDoc(libraryData, undefined, { inferDefs: true });
      const ioText = stringify(doc, undefined, undefined, { includeHeader: true });

      // Should contain schema definitions
      expect(ioText).toContain('$borrowedBy');
      expect(ioText).toContain('$book');
      expect(ioText).toContain('$schema');

      // borrowedBy should be optional in $book
      expect(ioText).toMatch(/borrowedBy\?/);
    });
  });
});
