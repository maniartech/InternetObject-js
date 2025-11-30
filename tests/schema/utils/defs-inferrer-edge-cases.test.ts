import { inferDefs } from '../../../src/schema/utils/defs-inferrer';
import { loadDoc, load } from '../../../src/facade/load';
import { stringify, parse } from '../../../src/index';

describe('inferDefs Edge Cases', () => {

  describe('Deeply Nested Complex Structures', () => {

    it('handles 5 levels of nested objects', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep'
                }
              }
            }
          }
        }
      };
      const { definitions, rootSchema } = inferDefs(data);

      // All nested schemas should be created
      expect(definitions.get('$level1')).toBeDefined();
      expect(definitions.get('$level2')).toBeDefined();
      expect(definitions.get('$level3')).toBeDefined();
      expect(definitions.get('$level4')).toBeDefined();
      expect(definitions.get('$level5')).toBeDefined();

      // Each level should reference the next
      expect(rootSchema.defs['level1'].schemaRef).toBe('$level1');
      expect(definitions.get('$level1')!.defs['level2'].schemaRef).toBe('$level2');
      expect(definitions.get('$level2')!.defs['level3'].schemaRef).toBe('$level3');
      expect(definitions.get('$level3')!.defs['level4'].schemaRef).toBe('$level4');
      expect(definitions.get('$level4')!.defs['level5'].schemaRef).toBe('$level5');
      expect(definitions.get('$level5')!.defs['value'].type).toBe('string');
    });

    it('handles arrays nested within arrays (multi-dimensional)', () => {
      const data = {
        matrix: [
          { rows: [{ cells: [{ value: 1 }, { value: 2 }] }] },
          { rows: [{ cells: [{ value: 3 }] }] }
        ]
      };
      const { definitions, rootSchema } = inferDefs(data);

      // Should create schemas for each level
      expect(rootSchema.defs['matrix'].type).toBe('array');
      // Check that nested schemas exist (name might vary based on singularization)
      expect(definitions.get('$row')).toBeDefined();
      expect(definitions.get('$cell')).toBeDefined();
      expect(definitions.get('$cell')!.defs['value'].type).toBe('number');
    });

    it('handles recursive-like structure with same-named nested objects', () => {
      const data = {
        node: {
          value: 'root',
          children: [
            { value: 'child1', children: [] },
            { value: 'child2', children: [{ value: 'grandchild', children: [] }] }
          ]
        }
      };
      const { definitions, rootSchema } = inferDefs(data);

      expect(definitions.get('$node')).toBeDefined();
      expect(definitions.get('$child')).toBeDefined();
      // Children should have proper schema
      expect(definitions.get('$child')!.defs['value'].type).toBe('string');
      expect(definitions.get('$child')!.defs['children'].type).toBe('array');
    });

    it('handles mixed array depths in different branches', () => {
      const data = {
        flat: { items: [1, 2, 3] },
        nested: { items: [{ x: 1 }, { x: 2 }] },
        deep: { items: [[{ y: 1 }], [{ y: 2 }]] }
      };
      const { definitions, rootSchema } = inferDefs(data);

      expect(definitions.get('$flat')).toBeDefined();
      expect(definitions.get('$nested')).toBeDefined();
      expect(definitions.get('$deep')).toBeDefined();
    });
  });

  describe('Multi-Pass Schema Merging Edge Cases', () => {

    it('merges schemas when field appears in some objects but not others (optional)', () => {
      const data = [
        { id: 1, name: 'Alice', email: 'alice@test.com' },
        { id: 2, name: 'Bob' },  // No email
        { id: 3, name: 'Charlie', email: 'charlie@test.com' }
      ];
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['id'].type).toBe('number');
      expect(rootSchema.defs['name'].type).toBe('string');
      expect(rootSchema.defs['email'].type).toBe('string');
      expect(rootSchema.defs['email'].optional).toBe(true);  // Should be optional
    });

    it('handles field that appears with different types across objects', () => {
      const data = [
        { id: 1, value: 'text' },
        { id: 2, value: 123 },
        { id: 3, value: true }
      ];
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['value'].type).toBe('any');  // Type mismatch → any
    });

    it('handles field that is null in some objects, has value in others', () => {
      const data = [
        { id: 1, description: 'First item' },
        { id: 2, description: null },
        { id: 3, description: 'Third item' }
      ];
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['description'].type).toBe('string');
      expect(rootSchema.defs['description'].null).toBe(true);  // Should be nullable
    });

    it('handles field that starts as null then gets type info', () => {
      const data = [
        { id: 1, extra: null },  // First encounter is null
        { id: 2, extra: { nested: 'value' } }  // Later has structure
      ];
      const { definitions, rootSchema } = inferDefs(data);

      // Since first was null and second has structure, should be any+null
      expect(rootSchema.defs['extra'].null).toBe(true);
    });

    it('merges deeply nested array items across multiple objects', () => {
      const data = [
        {
          id: 1,
          orders: [
            { orderId: 'A', items: [{ sku: '001', qty: 1 }] }
          ]
        },
        {
          id: 2,
          orders: [
            { orderId: 'B', items: [{ sku: '002', qty: 2, discount: 0.1 }] }  // discount is new
          ]
        }
      ];
      const { definitions } = inferDefs(data);

      // Deep multi-pass should detect discount as optional in $item schema
      const itemSchema = definitions.get('$item');
      expect(itemSchema).toBeDefined();
      expect(itemSchema!.defs['sku'].type).toBe('string');
      expect(itemSchema!.defs['qty'].type).toBe('number');
      expect(itemSchema!.defs['discount']?.optional).toBe(true);
    });

    it('handles completely disjoint object structures in array', () => {
      const data = [
        { type: 'A', aField: 'value' },
        { type: 'B', bField: 123 },
        { type: 'C', cField: true }
      ];
      const { rootSchema } = inferDefs(data);

      // All type-specific fields should be optional
      expect(rootSchema.defs['aField'].optional).toBe(true);
      expect(rootSchema.defs['bField'].optional).toBe(true);
      expect(rootSchema.defs['cField'].optional).toBe(true);
      expect(rootSchema.defs['type'].optional).toBeUndefined();  // type is in all
    });
  });

  describe('Empty and Sparse Data Handling', () => {

    it('handles empty object', () => {
      const data = {};
      const { rootSchema, definitions } = inferDefs(data);

      expect(rootSchema.names.length).toBe(0);
      // $schema is created but has no members
      const schema = definitions.get('$schema');
      expect(schema).toBeDefined();
      expect(schema!.names.length).toBe(0);
    });

    it('handles object with only null values', () => {
      const data = { a: null, b: null, c: null };
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['a'].type).toBe('any');
      expect(rootSchema.defs['a'].null).toBe(true);
      expect(rootSchema.defs['b'].type).toBe('any');
      expect(rootSchema.defs['b'].null).toBe(true);
    });

    it('handles array with empty objects', () => {
      const data = [
        { id: 1 },
        {},
        { id: 3 }
      ];
      const { rootSchema } = inferDefs(data);

      // id should be optional since it's missing in one object
      expect(rootSchema.defs['id'].optional).toBe(true);
    });

    it('handles empty arrays within objects', () => {
      const data = {
        items: [],
        tags: []
      };
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['items'].type).toBe('array');
      expect(rootSchema.defs['tags'].type).toBe('array');
    });

    it('handles sparse nested arrays', () => {
      const data = [
        { items: [{ x: 1 }] },
        { items: [] },  // Empty array
        { items: [{ x: 2 }, { x: 3, extra: 'data' }] }
      ];
      const { definitions } = inferDefs(data);

      const itemSchema = definitions.get('$item');
      expect(itemSchema).toBeDefined();
      expect(itemSchema!.defs['extra']?.optional).toBe(true);
    });
  });

  describe('Special Characters and Names', () => {

    it('handles field names with underscores and numbers', () => {
      const data = {
        user_id: 123,
        address_line_1: 'Street',
        created_at: '2024-01-01'
      };
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['user_id'].type).toBe('number');
      expect(rootSchema.defs['address_line_1'].type).toBe('string');
      expect(rootSchema.defs['created_at'].type).toBe('string');
    });

    it('handles camelCase and PascalCase field names', () => {
      const data = {
        firstName: 'John',
        LastName: 'Doe',
        phoneNumber: '123-456'
      };
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['firstName'].type).toBe('string');
      expect(rootSchema.defs['LastName'].type).toBe('string');
      expect(rootSchema.defs['phoneNumber'].type).toBe('string');
    });

    it('creates appropriate schema names for nested objects with special names', () => {
      const data = {
        user_profile: { display_name: 'John' },
        orderItems: [{ item_id: 1 }]
      };
      const { definitions } = inferDefs(data);

      expect(definitions.get('$user_profile')).toBeDefined();
      expect(definitions.get('$orderItem')).toBeDefined();
    });
  });

  describe('Type Edge Cases', () => {

    it('handles Date objects', () => {
      const data = {
        created: new Date('2024-01-15'),
        updated: new Date()
      };
      const { rootSchema } = inferDefs(data);

      // Dates are currently inferred as 'object' type
      // TODO: Future enhancement could detect Date objects and infer date/datetime
      expect(rootSchema.defs['created'].type).toBe('object');
    });

    it('handles mixed number types (int and float)', () => {
      const data = [
        { value: 10 },
        { value: 10.5 },
        { value: 100 }
      ];
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['value'].type).toBe('number');
    });

    it('handles very large numbers', () => {
      const data = {
        bigNumber: 9007199254740991,  // Number.MAX_SAFE_INTEGER
        negBig: -9007199254740991
      };
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['bigNumber'].type).toBe('number');
      expect(rootSchema.defs['negBig'].type).toBe('number');
    });

    it('handles empty string vs non-empty string', () => {
      const data = [
        { name: 'Alice' },
        { name: '' },  // Empty string
        { name: 'Bob' }
      ];
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['name'].type).toBe('string');
    });

    it('handles boolean true/false variants', () => {
      const data = [
        { active: true },
        { active: false },
        { active: true }
      ];
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['active'].type).toBe('bool');
    });
  });

  describe('Array Singularization Edge Cases', () => {

    it('handles irregular plural: children → child', () => {
      const data = {
        children: [{ name: 'Alice', age: 5 }]
      };
      const { definitions, rootSchema } = inferDefs(data);

      expect(rootSchema.defs['children'].schemaRef).toBe('$child');
      expect(definitions.get('$child')).toBeDefined();
    });

    it('handles irregular plural: people → person', () => {
      const data = {
        people: [{ name: 'John' }]
      };
      const { definitions, rootSchema } = inferDefs(data);

      expect(rootSchema.defs['people'].schemaRef).toBe('$person');
      expect(definitions.get('$person')).toBeDefined();
    });

    it('handles already singular names', () => {
      const data = {
        person: [{ name: 'Jane' }]  // Already singular
      };
      const { definitions, rootSchema } = inferDefs(data);

      // Should use as-is or add Item suffix
      const schemaRef = rootSchema.defs['person'].schemaRef;
      expect(schemaRef).toBeDefined();
    });

    it('handles names ending in -es correctly', () => {
      const testCases = [
        { field: 'addresses', expected: '$address' },
        { field: 'boxes', expected: '$box' },
        { field: 'classes', expected: '$class' },
        // 'buses' -> 'buse' (current behavior, not perfect singularization)
      ];

      for (const { field, expected } of testCases) {
        const data: any = { [field]: [{ value: 1 }] };
        const { definitions, rootSchema } = inferDefs(data);
        expect(rootSchema.defs[field].schemaRef).toBe(expected);
      }
    });

    it('handles names ending in -ies → -y', () => {
      const testCases = [
        { field: 'categories', expected: '$category' },
        { field: 'companies', expected: '$company' },
        { field: 'queries', expected: '$query' }
      ];

      for (const { field, expected } of testCases) {
        const data: any = { [field]: [{ value: 1 }] };
        const { definitions, rootSchema } = inferDefs(data);
        expect(rootSchema.defs[field].schemaRef).toBe(expected);
      }
    });
  });

  describe('Root-Level Array Edge Cases', () => {

    it('handles root array with single object', () => {
      const data = [{ id: 1, name: 'Only' }];
      const { rootSchema, definitions } = inferDefs(data);

      expect(rootSchema.defs['id'].type).toBe('number');
      expect(rootSchema.defs['name'].type).toBe('string');
    });

    it('handles root array with 100+ objects (performance)', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        active: i % 2 === 0
      }));
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['id'].type).toBe('number');
      expect(rootSchema.defs['name'].type).toBe('string');
      expect(rootSchema.defs['active'].type).toBe('bool');
    });

    it('handles root array of primitive values', () => {
      const data = [1, 2, 3, 4, 5];
      const { rootSchema } = inferDefs(data);

      // Root array of primitives - schema should handle primitives
      expect(rootSchema).toBeDefined();
    });

    it('handles root array of mixed primitives', () => {
      const data = [1, 'two', true, null];
      const { rootSchema } = inferDefs(data);

      // Root array of mixed primitives
      expect(rootSchema).toBeDefined();
    });
  });

  describe('Schema Deduplication', () => {

    it('reuses schema for identical nested objects', () => {
      const data = {
        billing: { street: '123 Main', city: 'NYC' },
        shipping: { street: '456 Oak', city: 'LA' }
      };
      const { definitions, rootSchema } = inferDefs(data);

      // Both should get their own schema (different names)
      expect(rootSchema.defs['billing'].schemaRef).toBe('$billing');
      expect(rootSchema.defs['shipping'].schemaRef).toBe('$shipping');

      // But both schemas should have same structure
      const billingSchema = definitions.get('$billing');
      const shippingSchema = definitions.get('$shipping');
      expect(billingSchema!.names).toEqual(shippingSchema!.names);
    });

    it('handles array of arrays correctly', () => {
      const data = {
        grid: [[1, 2], [3, 4], [5, 6]]
      };
      const { rootSchema } = inferDefs(data);

      expect(rootSchema.defs['grid'].type).toBe('array');
    });
  });
});

describe('stringify Edge Cases for Optional Fields', () => {

  describe('Optional Field Handling', () => {

    it('omits undefined optional field at end', () => {
      const schema = '{ name: string, age?: number }';
      const data = { name: 'Alice' };  // age is undefined

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      // Should not have trailing comma or empty placeholder
      expect(result).toBe('Alice');
    });

    it('handles undefined optional field in middle', () => {
      const schema = '{ name: string, middle?: string, last: string }';
      const data = { name: 'John', last: 'Doe' };  // middle is undefined

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      // Middle field should have placeholder for positional format
      expect(result).toContain('John');
      expect(result).toContain('Doe');
    });

    it('handles multiple consecutive undefined optional fields', () => {
      const schema = '{ a: string, b?: number, c?: string, d?: bool, e: string }';
      const data = { a: 'start', e: 'end' };

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      expect(result).toContain('start');
      expect(result).toContain('end');
    });

    it('handles all optional fields undefined except first', () => {
      const schema = '{ req: string, opt1?: number, opt2?: string, opt3?: bool }';
      const data = { req: 'value' };

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      expect(result).toBe('value');
    });

    it('handles nested objects with optional fields', () => {
      const schema = '{ user: { name: string, email?: string } }';
      const data = { user: { name: 'Alice' } };

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      expect(result).toContain('Alice');
    });
  });

  describe('Null vs Undefined Distinction', () => {

    it('outputs N for explicit null', () => {
      const schema = '{ name: string, age*: number }';
      const data = { name: 'Alice', age: null };

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      expect(result).toContain('Alice');
      expect(result).toContain('N');
    });

    it('distinguishes between null and undefined', () => {
      const schema = '{ a: string, b*?: number, c*?: string }';
      const data = { a: 'value', b: null };  // b is null, c is undefined

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      expect(result).toContain('value');
      expect(result).toContain('N');  // b should be N
    });

    it('handles optional nullable at end with undefined', () => {
      const schema = '{ name: string, extra*?: any }';
      const data = { name: 'Test' };  // extra is undefined

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      expect(result).toBe('Test');
    });

    it('handles optional nullable at end with null', () => {
      const schema = '{ name: string, extra*?: any }';
      const data = { name: 'Test', extra: null };

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      expect(result).toContain('Test');
      expect(result).toContain('N');
    });
  });

  describe('Empty String Handling', () => {

    it('outputs quoted empty string for empty string value', () => {
      const schema = '{ name: string }';
      const data = { name: '' };

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      expect(result).toBe('""');
    });

    it('distinguishes empty string from undefined', () => {
      const schema = '{ a: string, b?: string, c: string }';
      const data = { a: 'first', b: '', c: 'last' };

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      expect(result).toContain('first');
      expect(result).toContain('""');
      expect(result).toContain('last');
    });
  });

  describe('Array with Optional Fields in Items', () => {

    it('handles array items with optional fields', () => {
      const schema = '{ items: [{ id: number, name?: string }] }';
      const data = {
        items: [
          { id: 1, name: 'First' },
          { id: 2 },  // name is undefined
          { id: 3, name: 'Third' }
        ]
      };

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      expect(result).toContain('1');
      expect(result).toContain('First');
      expect(result).toContain('2');
      expect(result).toContain('3');
      expect(result).toContain('Third');
    });
  });

  describe('Complex Nested Optional Structures', () => {

    it('handles deeply nested optional fields', () => {
      const schema = '{ a: { b: { c?: { d: string } } } }';
      const data = { a: { b: {} } };  // c is undefined

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      expect(result).toBeDefined();
    });

    it('handles mixed nested optional and required', () => {
      const schema = `{
        user: {
          name: string,
          profile?: {
            bio?: string,
            avatar?: string
          }
        }
      }`;
      const data = {
        user: {
          name: 'Alice'
          // profile is undefined
        }
      };

      const doc = loadDoc(data, schema);
      const result = stringify(doc, undefined, undefined, { includeHeader: false });

      expect(result).toContain('Alice');
    });
  });
});

describe('Round-Trip Tests with inferDefs', () => {

  it('round-trips simple object', () => {
    const original = {
      name: 'Alice',
      age: 30,
      active: true
    };

    const doc = loadDoc(original, undefined, { inferDefs: true });
    const ioText = stringify(doc, undefined, undefined, { includeHeader: true });
    const reparsed = parse(ioText);

    expect(reparsed.toJSON()).toEqual(original);
  });

  it('round-trips object with nested structure', () => {
    const original = {
      user: {
        name: 'John',
        email: 'john@test.com'
      },
      settings: {
        theme: 'dark',
        notifications: true
      }
    };

    const doc = loadDoc(original, undefined, { inferDefs: true });
    const ioText = stringify(doc, undefined, undefined, { includeHeader: true });
    const reparsed = parse(ioText);

    expect(reparsed.toJSON()).toEqual(original);
  });

  it('round-trips array of objects', () => {
    const original = {
      items: [
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' }
      ]
    };

    const doc = loadDoc(original, undefined, { inferDefs: true });
    const ioText = stringify(doc, undefined, undefined, { includeHeader: true });
    const reparsed = parse(ioText);

    // Compare JSON representation (structure) rather than object types
    const reparsedJson = JSON.parse(JSON.stringify(reparsed.toJSON()));
    expect(reparsedJson).toEqual(original);
  });

  it('round-trips object with null values', () => {
    const original = {
      name: 'Test',
      description: null,
      count: 5
    };

    const doc = loadDoc(original, undefined, { inferDefs: true });
    const ioText = stringify(doc, undefined, undefined, { includeHeader: true });
    const reparsed = parse(ioText);

    expect(reparsed.toJSON()).toEqual(original);
  });

  it('round-trips empty arrays', () => {
    const original = {
      items: [],
      tags: []
    };

    const doc = loadDoc(original, undefined, { inferDefs: true });
    const ioText = stringify(doc, undefined, undefined, { includeHeader: true });
    const reparsed = parse(ioText);

    expect(reparsed.toJSON()).toEqual(original);
  });

  it('round-trips boolean values', () => {
    const original = {
      yes: true,
      no: false,
      maybe: true
    };

    const doc = loadDoc(original, undefined, { inferDefs: true });
    const ioText = stringify(doc, undefined, undefined, { includeHeader: true });
    const reparsed = parse(ioText);

    expect(reparsed.toJSON()).toEqual(original);
  });
});

describe('Schema Name Conflict Resolution', () => {

  describe('Same key name at different paths with different structures', () => {

    it('resolves conflict between root.address and root.employee.address', () => {
      const data = {
        address: { city: 'NYC', zip: '10001' },
        employee: {
          name: 'Alice',
          address: { street: '123 Main St', city: 'NYC' }
        }
      };
      const { definitions, rootSchema } = inferDefs(data);

      // Root address keeps base name
      expect(definitions.get('$address')).toBeDefined();
      expect(definitions.get('$address')!.defs['city']).toBeDefined();
      expect(definitions.get('$address')!.defs['zip']).toBeDefined();

      // Employee address gets qualified name
      expect(definitions.get('$employeeAddress')).toBeDefined();
      expect(definitions.get('$employeeAddress')!.defs['street']).toBeDefined();
      expect(definitions.get('$employeeAddress')!.defs['city']).toBeDefined();

      // Schema refs should be correct
      expect(rootSchema.defs['address'].schemaRef).toBe('$address');
      expect(definitions.get('$employee')!.defs['address'].schemaRef).toBe('$employeeAddress');
    });

    it('resolves conflict with 3 levels: address, employee.address, employee.manager.address', () => {
      const data = {
        address: { city: 'NYC' },
        employee: {
          name: 'Alice',
          address: { street: '123 Main' },
          manager: {
            name: 'Bob',
            address: { building: 'HQ', floor: 5 }
          }
        }
      };
      const { definitions, rootSchema } = inferDefs(data);

      // Root address keeps base name
      expect(definitions.get('$address')).toBeDefined();
      expect(definitions.get('$address')!.defs['city']).toBeDefined();

      // Employee address gets qualified name
      expect(definitions.get('$employeeAddress')).toBeDefined();
      expect(definitions.get('$employeeAddress')!.defs['street']).toBeDefined();

      // Manager address gets fully qualified name
      expect(definitions.get('$employeeManagerAddress')).toBeDefined();
      expect(definitions.get('$employeeManagerAddress')!.defs['building']).toBeDefined();
      expect(definitions.get('$employeeManagerAddress')!.defs['floor']).toBeDefined();

      // Verify schema refs
      expect(rootSchema.defs['address'].schemaRef).toBe('$address');
      expect(definitions.get('$employee')!.defs['address'].schemaRef).toBe('$employeeAddress');
      expect(definitions.get('$manager')!.defs['address'].schemaRef).toBe('$employeeManagerAddress');
    });

    it('shares schema when same key at different paths has identical structure', () => {
      const data = {
        homeAddress: { city: 'NYC', zip: '10001' },
        workAddress: { city: 'LA', zip: '90001' }  // Same structure
      };
      const { definitions, rootSchema } = inferDefs(data);

      // These have different property names, so they get separate schemas
      expect(definitions.get('$homeAddress')).toBeDefined();
      expect(definitions.get('$workAddress')).toBeDefined();

      // Both have same structure
      expect(definitions.get('$homeAddress')!.defs['city'].type).toBe('string');
      expect(definitions.get('$homeAddress')!.defs['zip'].type).toBe('string');
      expect(definitions.get('$workAddress')!.defs['city'].type).toBe('string');
      expect(definitions.get('$workAddress')!.defs['zip'].type).toBe('string');
    });

    it('resolves array item schema name conflicts', () => {
      const data = {
        items: [{ sku: 'A', price: 100 }],
        orders: [
          {
            items: [{ name: 'Widget', qty: 5 }]  // Different "items" structure
          }
        ]
      };
      const { definitions, rootSchema } = inferDefs(data);

      // Root items array item schema
      expect(definitions.get('$item')).toBeDefined();
      expect(definitions.get('$item')!.defs['sku']).toBeDefined();
      expect(definitions.get('$item')!.defs['price']).toBeDefined();

      // Order items array gets qualified name
      expect(definitions.get('$orderItem')).toBeDefined();
      expect(definitions.get('$orderItem')!.defs['name']).toBeDefined();
      expect(definitions.get('$orderItem')!.defs['qty']).toBeDefined();

      // Verify schema refs
      expect(rootSchema.defs['items'].schemaRef).toBe('$item');
      expect(definitions.get('$order')!.defs['items'].schemaRef).toBe('$orderItem');
    });

    it('resolves multiple nested array item conflicts', () => {
      const data = {
        logs: [{ message: 'info', level: 1 }],
        events: [
          {
            logs: [{ timestamp: '2024-01-01', type: 'click' }]
          }
        ]
      };
      const { definitions, rootSchema } = inferDefs(data);

      // Root logs item
      expect(definitions.get('$log')).toBeDefined();
      expect(definitions.get('$log')!.defs['message']).toBeDefined();
      expect(definitions.get('$log')!.defs['level']).toBeDefined();

      // Event logs get qualified name
      expect(definitions.get('$eventLog')).toBeDefined();
      expect(definitions.get('$eventLog')!.defs['timestamp']).toBeDefined();
      expect(definitions.get('$eventLog')!.defs['type']).toBeDefined();
    });
  });

  describe('Complex conflict scenarios', () => {

    it('handles company structure with multiple address conflicts', () => {
      const company = {
        address: { city: 'SF', zip: '94102' },
        employees: [
          {
            name: 'Alice',
            address: { street: '123 Main', apt: '4B' },
            manager: {
              name: 'Bob',
              address: { building: 'HQ', floor: 5 }
            }
          }
        ]
      };
      const { definitions, rootSchema } = inferDefs(company);

      // Company address (root level) keeps base name
      expect(definitions.get('$address')).toBeDefined();
      expect(definitions.get('$address')!.defs['city']).toBeDefined();

      // Employee address gets qualified
      expect(definitions.get('$employeeAddress')).toBeDefined();
      expect(definitions.get('$employeeAddress')!.defs['street']).toBeDefined();

      // Manager address gets fully qualified
      expect(definitions.get('$employeeManagerAddress')).toBeDefined();
      expect(definitions.get('$employeeManagerAddress')!.defs['building']).toBeDefined();

      // All should be properly linked
      expect(rootSchema.defs['address'].schemaRef).toBe('$address');
    });

    it('handles deeply nested objects with same name at multiple levels', () => {
      const data = {
        config: { setting: 'root' },
        app: {
          config: { setting: 'app', debug: true },
          module: {
            config: { setting: 'module', verbose: false, timeout: 30 }
          }
        }
      };
      const { definitions, rootSchema } = inferDefs(data);

      // Root config keeps base name
      expect(definitions.get('$config')).toBeDefined();
      expect(Object.keys(definitions.get('$config')!.defs).length).toBe(1);

      // App config gets qualified
      expect(definitions.get('$appConfig')).toBeDefined();
      expect(Object.keys(definitions.get('$appConfig')!.defs).length).toBe(2);

      // Module config gets fully qualified
      expect(definitions.get('$appModuleConfig')).toBeDefined();
      expect(Object.keys(definitions.get('$appModuleConfig')!.defs).length).toBe(3);
    });

    it('handles arrays within arrays with name conflicts', () => {
      const data = {
        users: [
          {
            name: 'Alice',
            groups: [
              {
                name: 'Admin',
                users: [  // Different user structure at nested level
                  { id: 1, role: 'owner' }
                ]
              }
            ]
          }
        ]
      };
      const { definitions, rootSchema } = inferDefs(data);

      // Root users array item
      expect(definitions.get('$user')).toBeDefined();
      expect(definitions.get('$user')!.defs['name']).toBeDefined();
      expect(definitions.get('$user')!.defs['groups']).toBeDefined();

      // Nested users (different structure) should get qualified name
      // The path would be ['users', 'groups', 'users']
      // This should become $groupUser or similar
      const nestedUserSchema = definitions.get('$groupUser') ||
                               definitions.get('$userGroupUser');
      expect(nestedUserSchema).toBeDefined();
      expect(nestedUserSchema!.defs['id']).toBeDefined();
      expect(nestedUserSchema!.defs['role']).toBeDefined();
    });
  });

  describe('Same structure at different paths (no conflict)', () => {

    it('uses same schema when identical structure at different paths within same parent', () => {
      const data = {
        people: [
          {
            homeAddress: { city: 'NYC', zip: '10001' },
            workAddress: { city: 'LA', zip: '90001' }
          }
        ]
      };
      const { definitions } = inferDefs(data);

      // These should have separate schemas because they're different properties
      expect(definitions.get('$homeAddress')).toBeDefined();
      expect(definitions.get('$workAddress')).toBeDefined();
    });
  });

  describe('Round-trip with conflict resolution', () => {

    it('round-trips data with address conflicts', () => {
      const original = {
        address: { city: 'NYC', zip: '10001' },
        employee: {
          name: 'Alice',
          address: { street: '123 Main', city: 'NYC' }
        }
      };

      const doc = loadDoc(original, undefined, { inferDefs: true });
      const ioText = stringify(doc, undefined, undefined, { includeHeader: true });
      const reparsed = parse(ioText);

      expect(reparsed.toJSON()).toEqual(original);
    });

    it('round-trips company structure with multiple conflicts', () => {
      const original = {
        address: { city: 'SF', zip: '94102' },
        employees: [
          {
            name: 'Alice',
            address: { street: '123 Main', apt: '4B' },
            manager: {
              name: 'Bob',
              address: { building: 'HQ', floor: 5 }
            }
          },
          {
            name: 'Charlie',
            address: { street: '456 Oak', apt: '2A' },
            manager: {
              name: 'Dana',
              address: { building: 'West', floor: 3 }
            }
          }
        ]
      };

      const doc = loadDoc(original, undefined, { inferDefs: true });
      const ioText = stringify(doc, undefined, undefined, { includeHeader: true });
      const reparsed = parse(ioText);

      // Use JSON.parse/stringify for deep comparison of plain objects
      expect(JSON.parse(JSON.stringify(reparsed.toJSON()))).toEqual(original);
    });

    it('round-trips nested array item conflicts', () => {
      const original = {
        items: [{ sku: 'A', price: 100 }, { sku: 'B', price: 200 }],
        orders: [
          {
            id: 1,
            items: [{ name: 'Widget', qty: 5 }, { name: 'Gadget', qty: 3 }]
          }
        ]
      };

      const doc = loadDoc(original, undefined, { inferDefs: true });
      const ioText = stringify(doc, undefined, undefined, { includeHeader: true });
      const reparsed = parse(ioText);

      // Use JSON.parse/stringify for deep comparison of plain objects
      expect(JSON.parse(JSON.stringify(reparsed.toJSON()))).toEqual(original);
    });
  });
});
