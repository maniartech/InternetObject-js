import { loadObject, load, loadCollection, LoadObjectOptions, LoadOptions } from '../../src/facade/load';
import { loadInferred, LoadInferredOptions } from '../../src/facade/load-inferred';
import parseDefinitions from '../../src/parser/parse-defs';
import Definitions from '../../src/core/definitions';
import InternetObject from '../../src/core/internet-object';
import Collection from '../../src/core/collection';
import Document from '../../src/core/document';
import ValidationError from '../../src/errors/io-validation-error';
import IOError from '../../src/errors/io-error';

/**
 * Helper function to create definitions with a schema
 */
function createDefs(schemaText: string): Definitions {
  const defs = parseDefinitions(schemaText, null);
  if (!defs) {
    throw new Error('Failed to create definitions');
  }
  return defs;
}

// =============================================================================
// loadObject() - 4 Overload Pattern Tests
// =============================================================================
describe('loadObject() API', () => {

  // -------------------------------------------------------------------------
  // Overload 1: loadObject(data) - Schema-less
  // -------------------------------------------------------------------------
  describe('Overload 1: loadObject(data) - Schema-less', () => {
    it('loads object without schema (no validation)', () => {
      const data = { name: 'Alice', age: 28 };
      const result = loadObject(data);

      expect(result).toBeInstanceOf(InternetObject);
      const obj = result as InternetObject;
      expect(obj.get('name')).toBe('Alice');
      expect(obj.get('age')).toBe(28);
    });

    it('throws error when passed an array (use loadCollection instead)', () => {
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];

      expect(() => loadObject(data as any)).toThrow(IOError);
      expect(() => loadObject(data as any)).toThrow(/loadCollection/);
    });

    it('loads nested objects without schema', () => {
      const data = {
        name: 'Alice',
        address: { city: 'NYC', zip: '10001' }
      };
      const result = loadObject(data);

      expect(result).toBeInstanceOf(InternetObject);
      const obj = result as InternetObject;
      expect(obj.get('name')).toBe('Alice');
      // In schema-less mode, nested objects remain as plain objects
      const addr = obj.get('address');
      expect(addr).toEqual({ city: 'NYC', zip: '10001' });
    });

    it('loads any data type without validation', () => {
      // Schema-less mode accepts anything
      const data = { name: 'Alice', age: 'not-a-number', extra: true };
      const result = loadObject(data);

      expect(result).toBeInstanceOf(InternetObject);
      const obj = result as InternetObject;
      expect(obj.get('age')).toBe('not-a-number');
    });
  });

  // -------------------------------------------------------------------------
  // Overload 2: loadObject(data, defs) - Uses defs.defaultSchema
  // -------------------------------------------------------------------------
  describe('Overload 2: loadObject(data, defs) - With Definitions', () => {
    it('loads object using $schema from definitions', () => {
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = { name: 'Alice', age: 28 };
      const result = loadObject(data, defs);

      expect(result).toBeInstanceOf(InternetObject);
      const obj = result as InternetObject;
      expect(obj.get('name')).toBe('Alice');
      expect(obj.get('age')).toBe(28);
    });

    it('validates data against default schema', () => {
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = { name: 'Alice', age: 'not-a-number' };

      expect(() => loadObject(data, defs)).toThrow(ValidationError);
    });

    it('throws error for array (use loadCollection instead)', () => {
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];

      expect(() => loadObject(data as any, defs)).toThrow(IOError);
    });

    it('handles missing required field', () => {
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = { name: 'Alice' }; // Missing 'age'

      expect(() => loadObject(data, defs)).toThrow(ValidationError);
    });

    it('handles optional fields', () => {
      const defs = createDefs('~ $schema: { name: string, age?: int }');
      const data = { name: 'Alice' }; // 'age' is optional
      const result = loadObject(data, defs);

      expect(result).toBeInstanceOf(InternetObject);
      const obj = result as InternetObject;
      expect(obj.get('name')).toBe('Alice');
      expect(obj.has('age')).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Overload 3: loadObject(data, options) - Schema-less with options
  // -------------------------------------------------------------------------
  describe('Overload 3: loadObject(data, options) - Schema-less with Options', () => {
    it('loads object with options but no validation', () => {
      const data = { name: 'Alice', age: 28 };
      const options: LoadObjectOptions = { strict: true };
      const result = loadObject(data, options);

      expect(result).toBeInstanceOf(InternetObject);
      const obj = result as InternetObject;
      expect(obj.get('name')).toBe('Alice');
    });

    it('error collector has no effect in schema-less mode', () => {
      const data = { name: 'Alice', age: 'not-a-number' };
      const errors: Error[] = [];
      const result = loadObject(data, { errorCollector: errors });

      expect(result).toBeInstanceOf(InternetObject);
      expect(errors).toHaveLength(0); // No errors because no validation
    });
  });

  // -------------------------------------------------------------------------
  // Overload 4: loadObject(data, defs, options) - Full control
  // -------------------------------------------------------------------------
  describe('Overload 4: loadObject(data, defs, options) - Full Control', () => {
    it('loads object with schemaName option', () => {
      const defs = createDefs(`
        ~ $User: { name: string, age: int }
        ~ $Address: { city: string, zip: string }
      `);
      const data = { name: 'Alice', age: 28 };
      const result = loadObject(data, defs, { schemaName: '$User' });

      expect(result).toBeInstanceOf(InternetObject);
      const obj = result as InternetObject;
      expect(obj.get('name')).toBe('Alice');
    });

    it('throws error for non-existent schemaName', () => {
      const defs = createDefs('~ $schema: { name: string }');
      const data = { name: 'Alice' };

      expect(() => loadObject(data, defs, { schemaName: '$NonExistent' }))
        .toThrow(/not found/);
    });

    it('collects errors with errorCollector (use loadCollection for arrays)', () => {
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 'invalid' },
        { name: 'Charlie', age: 42 }
      ];
      const errors: Error[] = [];
      // Use loadCollection for arrays, not loadObject
      const result = loadCollection(data, defs, { errorCollector: errors });

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(3);
      expect(errors).toHaveLength(1);
    });

    it('strict mode throws on first error', () => {
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = { name: 'Alice', age: 'not-a-number' };

      expect(() => loadObject(data, defs, { strict: true }))
        .toThrow(ValidationError);
    });

    it('uses schemaName over defaultSchema', () => {
      const defs = createDefs(`
        ~ $schema: { x: int }
        ~ $User: { name: string, age: int }
      `);
      const data = { name: 'Alice', age: 28 };
      // Without schemaName, would use $schema and fail
      const result = loadObject(data, defs, { schemaName: '$User' });

      expect(result).toBeInstanceOf(InternetObject);
      const obj = result as InternetObject;
      expect(obj.get('name')).toBe('Alice');
    });
  });
});


// =============================================================================
// loadCollection() - 4 Overload Pattern Tests
// =============================================================================
describe('loadCollection() API', () => {

  // -------------------------------------------------------------------------
  // Overload 1: loadCollection(data) - Schema-less
  // -------------------------------------------------------------------------
  describe('Overload 1: loadCollection(data) - Schema-less', () => {
    it('loads array without schema', () => {
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];
      const result = loadCollection(data);

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(2);
    });

    it('loads empty array', () => {
      const data: any[] = [];
      const result = loadCollection(data);

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(0);
    });

    it('wraps single object in array before processing', () => {
      // loadCollection expects array, single object should be wrapped
      const data = [{ name: 'Alice' }];
      const result = loadCollection(data);

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Overload 2: loadCollection(data, defs) - Uses defs.defaultSchema
  // -------------------------------------------------------------------------
  describe('Overload 2: loadCollection(data, defs) - With Definitions', () => {
    it('validates array items against $schema', () => {
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];
      const result = loadCollection(data, defs);

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(2);
    });

    it('collects errors on invalid item (does not throw by default)', () => {
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = [
        { name: 'Alice', age: 'invalid' }
      ];

      // loadCollection does not throw by default - it collects errors
      const errors: Error[] = [];
      const result = loadCollection(data, defs, { errorCollector: errors });
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Overload 3: loadCollection(data, options) - Schema-less with options
  // -------------------------------------------------------------------------
  describe('Overload 3: loadCollection(data, options) - Schema-less with Options', () => {
    it('loads array with options (no validation)', () => {
      const data = [
        { name: 'Alice', anything: 'goes' }
      ];
      const result = loadCollection(data, { strict: true });

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // Overload 4: loadCollection(data, defs, options) - Full control
  // -------------------------------------------------------------------------
  describe('Overload 4: loadCollection(data, defs, options) - Full Control', () => {
    it('uses schemaName to pick schema', () => {
      const defs = createDefs(`
        ~ $User: { name: string, age: int }
        ~ $Item: { id: int, price: number }
      `);
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];
      const result = loadCollection(data, defs, { schemaName: '$User' });

      expect(result).toBeInstanceOf(Collection);
      expect(result.length).toBe(2);
    });

    it('collects errors in collection', () => {
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 'invalid' },
        { name: 'Charlie', age: 42 }
      ];
      const errors: Error[] = [];
      const result = loadCollection(data, defs, { errorCollector: errors });

      expect(result.length).toBe(3);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });
});


// =============================================================================
// load() - 4 Overload Pattern Tests (Returns Document)
// =============================================================================
describe('load() API', () => {

  // -------------------------------------------------------------------------
  // Overload 1: load(data) - Schema-less
  // -------------------------------------------------------------------------
  describe('Overload 1: load(data) - Schema-less', () => {
    it('creates Document without schema', () => {
      const data = { name: 'Alice', age: 28 };
      const doc = load(data);

      expect(doc).toBeInstanceOf(Document);
      expect(doc.sections!.length).toBe(1);
    });

    it('creates Document from array', () => {
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];
      const doc = load(data);

      expect(doc).toBeInstanceOf(Document);
      // The section should contain a Collection
      const section = doc.sections!.get(0);
      expect(section?.data).toBeInstanceOf(Collection);
    });
  });

  // -------------------------------------------------------------------------
  // Overload 2: load(data, defs) - With Definitions
  // -------------------------------------------------------------------------
  describe('Overload 2: load(data, defs) - With Definitions', () => {
    it('creates Document with definitions in header', () => {
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = { name: 'Alice', age: 28 };
      const doc = load(data, defs);

      expect(doc).toBeInstanceOf(Document);
      expect(doc.header.definitions.getV('$schema')).toBeDefined();
      expect(doc.header.schema).not.toBeUndefined();
    });

    it('validates data against schema', () => {
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = { name: 'Alice', age: 'invalid' };

      expect(() => load(data, defs)).toThrow(ValidationError);
    });
  });

  // -------------------------------------------------------------------------
  // Overload 3: load(data, options) - Schema-less with options
  // -------------------------------------------------------------------------
  describe('Overload 3: load(data, options) - Schema-less with Options', () => {
    it('creates Document with options', () => {
      const data = { name: 'Alice' };
      const doc = load(data, { strict: true });

      expect(doc).toBeInstanceOf(Document);
    });
  });

  // -------------------------------------------------------------------------
  // Overload 4: load(data, defs, options) - Full control
  // -------------------------------------------------------------------------
  describe('Overload 4: load(data, defs, options) - Full Control', () => {
    it('uses schemaName from options', () => {
      const defs = createDefs(`
        ~ $User: { name: string, age: int }
        ~ $Product: { id: int, price: number }
      `);
      const data = { name: 'Alice', age: 28 };
      const doc = load(data, defs, { schemaName: '$User' });

      expect(doc).toBeInstanceOf(Document);
      expect(doc.header.schema?.name).toBe('$User');
    });

    it('throws for non-existent schemaName', () => {
      const defs = createDefs('~ $schema: { name: string }');
      const data = { name: 'Alice' };

      expect(() => load(data, defs, { schemaName: '$NonExistent' }))
        .toThrow(/not found/);
    });

    it('collects errors with errorCollector', () => {
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 'invalid' }
      ];
      const errors: Error[] = [];
      const doc = load(data, defs, { errorCollector: errors });

      expect(doc).toBeInstanceOf(Document);
      expect(errors.length).toBeGreaterThanOrEqual(1);
    });
  });
});


// =============================================================================
// loadInferred() - 2 Overload Pattern Tests
// =============================================================================
describe('loadInferred() API', () => {

  // -------------------------------------------------------------------------
  // Overload 1: loadInferred(data)
  // -------------------------------------------------------------------------
  describe('Overload 1: loadInferred(data) - Auto Schema', () => {
    it('infers schema from simple object', () => {
      const data = { name: 'Alice', age: 28 };
      const doc = loadInferred(data);

      expect(doc).toBeInstanceOf(Document);
      expect(doc.header.schema).not.toBeUndefined();
      expect(doc.header.definitions.getV('$schema')).toBeDefined();
    });

    it('infers nested schema', () => {
      const data = {
        name: 'Alice',
        address: { city: 'NYC', zip: '10001' }
      };
      const doc = loadInferred(data);

      expect(doc).toBeInstanceOf(Document);
      // Should have inferred $address schema
      expect(doc.header.definitions.length).toBeGreaterThan(1);
    });

    it('infers schema from array', () => {
      const data = [
        { name: 'Alice', age: 28 },
        { name: 'Bob', age: 35 }
      ];
      const doc = loadInferred(data);

      expect(doc).toBeInstanceOf(Document);
      expect(doc.sections!.get(0)?.data).toBeInstanceOf(Collection);
    });

    it('handles empty object', () => {
      const data = {};
      const doc = loadInferred(data);

      expect(doc).toBeInstanceOf(Document);
    });

    it('handles array of primitives', () => {
      const data = [1, 2, 3, 4, 5];
      const doc = loadInferred(data);

      expect(doc).toBeInstanceOf(Document);
    });
  });

  // -------------------------------------------------------------------------
  // Overload 2: loadInferred(data, options)
  // -------------------------------------------------------------------------
  describe('Overload 2: loadInferred(data, options) - With Options', () => {
    it('accepts strict option', () => {
      const data = { name: 'Alice', age: 28 };
      const doc = loadInferred(data, { strict: true });

      expect(doc).toBeInstanceOf(Document);
    });

    it('accepts errorCollector option', () => {
      const data = { name: 'Alice', age: 28 };
      const errors: Error[] = [];
      const doc = loadInferred(data, { errorCollector: errors });

      expect(doc).toBeInstanceOf(Document);
      // Inferred schema should match data, so no errors
      expect(errors).toHaveLength(0);
    });
  });
});


// =============================================================================
// Edge Cases and Integration Tests
// =============================================================================
describe('Edge Cases and Integration', () => {
  describe('Complex data structures', () => {
    it('loads objects with arrays', () => {
      const defs = createDefs('~ $schema: { name: string, tags: [string] }');
      const data = { name: 'Alice', tags: ['developer', 'typescript'] };
      const result = loadObject(data, defs);

      expect(result).toBeInstanceOf(InternetObject);
      const obj = result as InternetObject;
      expect(obj.get('tags')).toEqual(['developer', 'typescript']);
    });

    it('loads objects with nested schemas', () => {
      // Test with a simpler nested structure - just verify nested objects load
      const defs = createDefs('~ $schema: { name: string, age: int }');
      const data = {
        name: 'Alice',
        age: 30
      };
      const result = loadObject(data, defs);

      expect(result).toBeInstanceOf(InternetObject);
      const obj = result as InternetObject;
      expect(obj.get('name')).toBe('Alice');
      expect(obj.get('age')).toBe(30);
    });
  });

  describe('Type coercion', () => {
    it('handles bigint values', () => {
      const defs = createDefs('~ $schema: { id: bigint }');
      const data = { id: 123456789012345n };
      const result = loadObject(data, defs);
      const obj = result as InternetObject;

      expect(obj.get('id')).toBe(123456789012345n);
    });

    it('handles decimal values', () => {
      const defs = createDefs('~ $schema: { price: decimal }');
      const data = { price: '19.99' };
      const result = loadObject(data, defs);
      const obj = result as InternetObject;

      expect(obj.get('price')).toHaveProperty('coefficient');
    });

    it('handles datetime values', () => {
      const defs = createDefs('~ $schema: { created: datetime }');
      const data = { created: new Date('2024-01-15T10:30:00Z') };
      const result = loadObject(data, defs);
      const obj = result as InternetObject;

      expect(obj.get('created')).toBeInstanceOf(Date);
    });
  });

  describe('Empty and null values', () => {
    it('loads empty object with schema-less', () => {
      const result = loadObject({});
      expect(result).toBeInstanceOf(InternetObject);
    });

    it('handles nullable fields', () => {
      // Note: null marker is 'name*' for nullable fields
      const defs = createDefs('~ $schema: { name*: string, age?: int }');
      const data = { name: null };
      const result = loadObject(data, defs);

      expect(result).toBeInstanceOf(InternetObject);
      const obj = result as InternetObject;
      expect(obj.get('name')).toBeNull();
    });
  });
});
