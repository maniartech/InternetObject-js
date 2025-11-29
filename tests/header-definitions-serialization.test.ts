/**
 * Tests for complete header definitions serialization including:
 * - Schema definitions ($schema, $address, etc.)
 * - Variable definitions (@var)
 * - Regular metadata definitions
 * - Mixed combinations of all three
 */

import { parse, stringify } from '../src/index';
import Document from '../src/core/document';

describe('Header Definitions Serialization', () => {

  describe('Schema Definitions Only', () => {
    test('should serialize single schema definition', () => {
      const io = `
~ $address: {street, city, state}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify definitions structure
      expect(doc2.header.definitions.length).toBe(1);
      expect(doc2.header.definitions.keys).toContain('$address');
      expect(doc2.header.definitions.get('$address')).toBeDefined();
    });

    test('should serialize multiple schema definitions', () => {
      const io = `
~ $address: {street, city, state}
~ $person: {name, age, $address}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify definitions structure
      expect(doc2.header.definitions.length).toBe(2);
      expect(doc2.header.definitions.keys).toContain('$address');
      expect(doc2.header.definitions.keys).toContain('$person');
      expect(doc2.header.definitions.get('$address')).toBeDefined();
      expect(doc2.header.definitions.get('$person')).toBeDefined();
    });

    test('should serialize default schema definition', () => {
      const io = `
~ $schema: {id, name, email}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // When only $schema exists, outputs as bare schema line
      expect(doc2.header.definitions.length).toBe(1);
      expect(doc2.header.definitions.keys).toContain('$schema');
      expect(doc2.header.schema).toBeDefined();
      expect(doc2.header.schema!.names).toEqual(['id', 'name', 'email']);
    });
  });

  describe('Variable Definitions', () => {
    test('should serialize variable definitions', () => {
      const io = `
~ @yes: T
~ @no: F
~ $schema: {name, active}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify definitions structure
      expect(doc2.header.definitions.length).toBe(3);
      expect(doc2.header.definitions.keys).toContain('@yes');
      expect(doc2.header.definitions.keys).toContain('@no');
      expect(doc2.header.definitions.keys).toContain('$schema');

      // Verify variable values (they're stored as TokenNodes, so get actual value)
      const yesValue = doc2.header.definitions.get('@yes');
      const noValue = doc2.header.definitions.get('@no');
      expect(yesValue.value).toBe(true);
      expect(noValue.value).toBe(false);
    });

    test('should serialize string variable definitions', () => {
      const io = `
~ @default: "unknown"
~ @active: "yes"
~ $schema: {name, status}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify definitions structure
      expect(doc2.header.definitions.length).toBe(3);
      expect(doc2.header.definitions.keys).toContain('@default');
      expect(doc2.header.definitions.keys).toContain('@active');

      // Verify variable values
      const defaultValue = doc2.header.definitions.get('@default');
      const activeValue = doc2.header.definitions.get('@active');
      expect(defaultValue.value).toBe('unknown');
      expect(activeValue.value).toBe('yes');
    });
  });

  describe('Metadata Definitions', () => {
    test('should serialize metadata definitions', () => {
      const io = `
~ pageSize: 10
~ currentPage: 1
~ totalRecords: 100
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify definitions structure
      expect(doc2.header.definitions.length).toBe(3);
      expect(doc2.header.definitions.keys).toEqual(['pageSize', 'currentPage', 'totalRecords']);
      expect(doc2.header.definitions.get('pageSize')).toBe(10);
      expect(doc2.header.definitions.get('currentPage')).toBe(1);
      expect(doc2.header.definitions.get('totalRecords')).toBe(100);
    });

    test('should serialize mixed type metadata', () => {
      const io = `
~ appName: "MyApp"
~ version: 1.0
~ active: T
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify definitions structure
      expect(doc2.header.definitions.length).toBe(3);
      expect(doc2.header.definitions.keys).toEqual(['appName', 'version', 'active']);
      expect(doc2.header.definitions.get('appName')).toBe('MyApp');
      expect(doc2.header.definitions.get('version')).toBe(1.0);
      expect(doc2.header.definitions.get('active')).toBe(true);
    });
  });

  describe('Mixed Definitions', () => {
    test('should serialize metadata + schema definitions with data', () => {
      const io = `
~ appName: "UserAPI"
~ version: 1.0
~ $schema: {id, name, email, *}
---
~ 1, Alice, alice@example.com
~ 2, Bob, bob@example.com
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify definitions structure
      expect(doc2.header.definitions.length).toBe(3);
      expect(doc2.header.definitions.keys).toEqual(['appName', 'version', '$schema']);
      expect(doc2.header.definitions.get('appName')).toBe('UserAPI');
      expect(doc2.header.definitions.get('version')).toBe(1.0);
      expect(doc2.header.schema).toBeDefined();
      expect(doc2.header.schema!.names).toEqual(['id', 'name', 'email']);

      // Verify data section is preserved
      const json2 = doc2.toJSON();
      const data2 = json2.data as any[];
      expect(Array.isArray(data2)).toBe(true);
      expect(data2.length).toBe(2);
      expect(data2[0]).toEqual({ id: 1, name: 'Alice', email: 'alice@example.com' });
      expect(data2[1]).toEqual({ id: 2, name: 'Bob', email: 'bob@example.com' });
    });

    test('should serialize metadata + variable definitions with data', () => {
      const io = `
~ pageSize: 10
~ @yes: T
~ @no: F
~ $schema: {name, active, *}
---
~ Alice, T
~ Bob, F
~ Charlie, T
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify definitions structure
      expect(doc2.header.definitions.length).toBe(4);
      expect(doc2.header.definitions.keys).toEqual(['pageSize', '@yes', '@no', '$schema']);
      expect(doc2.header.definitions.get('pageSize')).toBe(10);

      const yesValue = doc2.header.definitions.get('@yes');
      const noValue = doc2.header.definitions.get('@no');
      expect(yesValue.value).toBe(true);
      expect(noValue.value).toBe(false);

      // Verify data section is preserved
      const json2 = doc2.toJSON();
      const data2 = json2.data as any[];
      expect(Array.isArray(data2)).toBe(true);
      expect(data2.length).toBe(3);
      expect(data2[0]).toEqual({ name: 'Alice', active: true });
      expect(data2[1]).toEqual({ name: 'Bob', active: false });
      expect(data2[2]).toEqual({ name: 'Charlie', active: true });
    });

    test('should serialize all three types together with data', () => {
      const io = `
~ appName: "DataAPI"
~ version: 2.0
~ @default: "N/A"
~ $address: {street, city}
~ $schema: {id, name, $address, *}
---
~ 1, Alice, {123 Main St, Boston}
~ 2, Bob, {456 Oak Ave, Seattle}
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify definitions structure
      expect(doc2.header.definitions.length).toBe(5);
      expect(doc2.header.definitions.keys).toEqual(['appName', 'version', '@default', '$address', '$schema']);
      expect(doc2.header.definitions.get('appName')).toBe('DataAPI');
      expect(doc2.header.definitions.get('version')).toBe(2.0);

      const defaultValue = doc2.header.definitions.get('@default');
      expect(defaultValue.value).toBe('N/A');

      expect(doc2.header.definitions.get('$address')).toBeDefined();
      expect(doc2.header.schema).toBeDefined();

      // Verify data section with nested objects
      const json2 = doc2.toJSON();
      const data2 = json2.data as any[];
      expect(Array.isArray(data2)).toBe(true);
      expect(data2.length).toBe(2);
      expect(data2[0].id).toBe(1);
      expect(data2[0].name).toBe('Alice');
      expect(data2[0].$address['0']).toBe('123 Main St');
      expect(data2[0].$address['1']).toBe('Boston');
      expect(data2[1].id).toBe(2);
      expect(data2[1].name).toBe('Bob');
      expect(data2[1].$address['0']).toBe('456 Oak Ave');
      expect(data2[1].$address['1']).toBe('Seattle');
    });

    test('should preserve definition order', () => {
      const io = `
~ pageSize: 10
~ $schema: {name, age}
~ @active: T
~ version: 1.0
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify definitions order is preserved
      expect(doc2.header.definitions.length).toBe(4);
      expect(doc2.header.definitions.keys).toEqual(['pageSize', '$schema', '@active', 'version']);
      expect(doc2.header.definitions.get('pageSize')).toBe(10);
      expect(doc2.header.definitions.get('version')).toBe(1.0);

      const activeValue = doc2.header.definitions.get('@active');
      expect(activeValue.value).toBe(true);
    });
  });

  describe('Schema Definitions with Constraints', () => {
    test('should serialize schema with optional fields', () => {
      const io = `
~ $schema: {id, name, email?}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify schema structure with optional marker
      expect(doc2.header.schema).toBeDefined();
      expect(doc2.header.schema!.names).toEqual(['id', 'name', 'email']);
      expect(doc2.header.schema!.defs.email.optional).toBe(true);
    });

    test('should serialize schema with nullable fields', () => {
      const io = `
~ $schema: {id, name, middleName*}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify schema structure with nullable marker
      expect(doc2.header.schema).toBeDefined();
      expect(doc2.header.schema!.names).toEqual(['id', 'name', 'middleName']);
      expect(doc2.header.schema!.defs.middleName.null).toBe(true);
    });

    test('should serialize schema with optional and nullable fields', () => {
      const io = `
~ $schema: {id, name, nickname?*, email?}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify schema structure with both markers
      expect(doc2.header.schema).toBeDefined();
      expect(doc2.header.schema!.names).toEqual(['id', 'name', 'nickname', 'email']);
      expect(doc2.header.schema!.defs.nickname.optional).toBe(true);
      expect(doc2.header.schema!.defs.nickname.null).toBe(true);
      expect(doc2.header.schema!.defs.email.optional).toBe(true);
    });
  });

  describe('Nested Schema Definitions', () => {
    test('should serialize nested schema definitions', () => {
      const io = `
~ $address: {street, city, state}
~ $schema: {id, name, $address}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify nested schema structure
      expect(doc2.header.definitions.length).toBe(2);
      expect(doc2.header.definitions.keys).toEqual(['$address', '$schema']);
      expect(doc2.header.definitions.get('$address')).toBeDefined();
      expect(doc2.header.schema).toBeDefined();
      expect(doc2.header.schema!.names).toEqual(['id', 'name', '$address']);
    });

    test('should serialize deeply nested schemas', () => {
      const io = `
~ $geo: {lat, lon}
~ $address: {street, city, $geo}
~ $schema: {id, name, $address}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify deeply nested schema structure
      expect(doc2.header.definitions.length).toBe(3);
      expect(doc2.header.definitions.keys).toEqual(['$geo', '$address', '$schema']);
      expect(doc2.header.definitions.get('$geo')).toBeDefined();
      expect(doc2.header.definitions.get('$address')).toBeDefined();
      expect(doc2.header.schema).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty schema definition', () => {
      const io = `
~ $empty: {}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify empty schema is preserved
      expect(doc2.header.definitions.length).toBe(1);
      expect(doc2.header.definitions.keys).toContain('$empty');
      const emptySchema = doc2.header.definitions.get('$empty');
      expect(emptySchema).toBeDefined();
      expect(emptySchema.names.length).toBe(0);
    });

    test('should handle special characters in metadata values', () => {
      const io = `
~ appName: "My App: v2.0"
~ description: "Test, with comma"
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify special characters are preserved
      expect(doc2.header.definitions.length).toBe(2);
      expect(doc2.header.definitions.get('appName')).toBe('My App: v2.0');
      expect(doc2.header.definitions.get('description')).toBe('Test, with comma');
    });

    test('should serialize definitions with empty data section', () => {
      const io = `
~ appName: "API"
~ version: 1.0
~ $schema: {id, name}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Verify all definitions are preserved
      expect(doc2.header.definitions.length).toBe(3);
      expect(doc2.header.definitions.keys).toEqual(['appName', 'version', '$schema']);
      expect(doc2.header.definitions.get('appName')).toBe('API');
      expect(doc2.header.definitions.get('version')).toBe(1.0);
      expect(doc2.header.schema).toBeDefined();
    });
  });

  describe('Round-trip Serialization', () => {
    test('should preserve schema definitions and data through round-trip', () => {
      const io = `
~ $address: {street, city}
~ $schema: {name, email, $address}
---
~ Alice, alice@test.com, {Main St, NYC}
~ Bob, bob@test.com, {Oak Ave, LA}
`;
      const doc1 = parse(io, null) as Document;
      const serialized = stringify(doc1, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Compare original and round-tripped documents
      expect(doc2.header.definitions.length).toBe(doc1.header.definitions.length);
      expect(doc2.header.definitions.keys).toEqual(doc1.header.definitions.keys);
      expect(doc2.header.schema!.names).toEqual(doc1.header.schema!.names);

      // Verify data is preserved
      const data2 = doc2.toJSON() as any[];
      expect(Array.isArray(data2)).toBe(true);
      expect(data2.length).toBe(2);
      expect(data2[0].name).toBe('Alice');
      expect(data2[0].email).toBe('alice@test.com');
      expect(data2[0].$address['0']).toBe('Main St');
      expect(data2[0].$address['1']).toBe('NYC');
    });

    test('should preserve all definition types and data through round-trip', () => {
      const io = `
~ appName: "Test"
~ @yes: T
~ $schema: {id, name, active, *}
---
~ 1, Alice, T
~ 2, Bob, F
~ 3, Charlie, T
`;
      const doc1 = parse(io, null) as Document;
      const serialized = stringify(doc1, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Compare definitions
      expect(doc2.header.definitions.length).toBe(doc1.header.definitions.length);
      expect(doc2.header.definitions.keys).toEqual(doc1.header.definitions.keys);
      expect(doc2.header.definitions.get('appName')).toBe(doc1.header.definitions.get('appName'));

      // Variable values are stored as TokenNodes
      const yesVal1 = doc1.header.definitions.get('@yes');
      const yesVal2 = doc2.header.definitions.get('@yes');
      expect(yesVal2.value).toBe(yesVal1.value);

      // Verify data is preserved
      const json2 = doc2.toJSON();
      const data2 = json2.data as any[];
      expect(Array.isArray(data2)).toBe(true);
      expect(data2.length).toBe(3);
      expect(data2[0]).toEqual({ id: 1, name: 'Alice', active: true });
      expect(data2[1]).toEqual({ id: 2, name: 'Bob', active: false });
      expect(data2[2]).toEqual({ id: 3, name: 'Charlie', active: true });
    });

    test('should preserve complex mixed definitions and data through round-trip', () => {
      const io = `
~ version: 1.0
~ pageSize: 10
~ @default: "unknown"
~ $address: {street, city}
~ $schema: {id, name, email, $address}
---
~ 1, Alice, alice@example.com, {Elm St, Boston}
~ 2, Bob, bob@example.com, {Oak Ave, Seattle}
~ 3, Charlie, charlie@example.com, {Pine Rd, Austin}
`;
      const doc1 = parse(io, null) as Document;
      const serialized = stringify(doc1, undefined, undefined, { includeTypes: true });
      const doc2 = parse(serialized, null) as Document;

      // Compare all definitions
      expect(doc2.header.definitions.length).toBe(5);
      expect(doc2.header.definitions.keys).toEqual(['version', 'pageSize', '@default', '$address', '$schema']);
      expect(doc2.header.definitions.get('version')).toBe(1.0);
      expect(doc2.header.definitions.get('pageSize')).toBe(10);

      const defaultVal = doc2.header.definitions.get('@default');
      expect(defaultVal.value).toBe('unknown');

      expect(doc2.header.definitions.get('$address')).toBeDefined();
      expect(doc2.header.schema).toBeDefined();
      expect(doc2.header.schema!.names).toEqual(['id', 'name', 'email', '$address']);

      // Verify data is preserved with nested objects
      const json2 = doc2.toJSON();
      const data2 = json2.data as any[];
      expect(Array.isArray(data2)).toBe(true);
      expect(data2.length).toBe(3);
      expect(data2[0].id).toBe(1);
      expect(data2[0].name).toBe('Alice');
      expect(data2[0].$address['0']).toBe('Elm St');
      expect(data2[0].$address['1']).toBe('Boston');
      expect(data2[2].name).toBe('Charlie');
      expect(data2[2].$address['0']).toBe('Pine Rd');
      expect(data2[2].$address['1']).toBe('Austin');
    });
  });
});
