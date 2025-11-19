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
      const result = stringify(doc);

      expect(result).toContain('~ $address: {street, city, state}');
    });

    test('should serialize multiple schema definitions', () => {
      const io = `
~ $address: {street, city, state}, ~ $person: {name, age, $address}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ $address: {street, city, state}');
      expect(result).toContain('~ $person: {name, age, $address}');
    });

    test('should serialize default schema definition', () => {
      const io = `
~ $schema: {id, name, email}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      // When only $schema exists, outputs as bare schema line (schema-only mode)
      expect(result).toContain('id, name, email');
      expect(result).not.toContain('~ $schema:');
    });
  });

  describe('Variable Definitions', () => {
    test('should serialize variable definitions', () => {
      const io = `
~ @yes: T, ~ @no: F, ~ $schema: {name, active}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ @yes: T');
      expect(result).toContain('~ @no: F');
    });

    test('should serialize string variable definitions', () => {
      const io = `
~ @default: "unknown", ~ @active: "yes", ~ $schema: {name, status}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ @default: "unknown"');
      expect(result).toContain('~ @active: "yes"');
    });
  });

  describe('Metadata Definitions', () => {
    test('should serialize metadata definitions', () => {
      const io = `
~ pageSize: 10, ~ currentPage: 1, ~ totalRecords: 100
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ pageSize: 10');
      expect(result).toContain('~ currentPage: 1');
      expect(result).toContain('~ totalRecords: 100');
    });

    test('should serialize mixed type metadata', () => {
      const io = `
~ appName: "MyApp", ~ version: 1.0, ~ active: T
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ appName: "MyApp"');
      expect(result).toContain('~ version: 1');
      expect(result).toContain('~ active: T');
    });
  });

  describe('Mixed Definitions', () => {
    test('should serialize metadata + schema definitions', () => {
      const io = `
~ appName: "UserAPI", ~ version: 1.0, ~ $schema: {id, name, email}
---
1, Alice, alice@example.com
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ appName: "UserAPI"');
      expect(result).toContain('~ version: 1');
      expect(result).toContain('~ $schema: {id, name, email}');
    });

    test('should serialize metadata + variable definitions', () => {
      const io = `
~ pageSize: 10, ~ @yes: T, ~ @no: F, ~ $schema: {name, active}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ pageSize: 10');
      expect(result).toContain('~ @yes: T');
      expect(result).toContain('~ @no: F');
      expect(result).toContain('~ $schema: {name, active}');
    });

    test('should serialize all three types together', () => {
      const io = `
~ appName: "DataAPI", ~ version: 2.0, ~ @default: "N/A", ~ $address: {street, city}, ~ $schema: {id, name, $address}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ appName: "DataAPI"');
      expect(result).toContain('~ version: 2');
      expect(result).toContain('~ @default: "N/A"');
      expect(result).toContain('~ $address: {street, city}');
      expect(result).toContain('~ $schema: {id, name, $address}');
    });

    test('should preserve definition order', () => {
      const io = `
~ pageSize: 10, ~ $schema: {name, age}, ~ @active: T, ~ version: 1.0
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      // Verify all definitions are present in output
      expect(result).toContain('~ pageSize: 10');
      expect(result).toContain('~ $schema: {name, age}');
      expect(result).toContain('~ @active: T');
      expect(result).toContain('~ version: 1');

      // Definitions should appear in the same order as defined
      const pageIndex = result.indexOf('~ pageSize: 10');
      const schemaIndex = result.indexOf('~ $schema: {name, age}');
      const activeIndex = result.indexOf('~ @active: T');
      const versionIndex = result.indexOf('~ version: 1');

      expect(pageIndex).toBeGreaterThanOrEqual(0);
      expect(schemaIndex).toBeGreaterThanOrEqual(0);
      expect(activeIndex).toBeGreaterThanOrEqual(0);
      expect(versionIndex).toBeGreaterThanOrEqual(0);

      expect(pageIndex).toBeLessThan(schemaIndex);
      expect(schemaIndex).toBeLessThan(activeIndex);
      expect(activeIndex).toBeLessThan(versionIndex);
    });
  });

  describe('Schema Definitions with Constraints', () => {
    test('should serialize schema with optional fields', () => {
      const io = `
~ $schema: {id, name, email?}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      // When only $schema exists, outputs as bare schema line
      expect(result).toContain('id, name, email?');
      expect(result).not.toContain('~ $schema:');
    });

    test('should serialize schema with nullable fields', () => {
      const io = `
~ $schema: {id, name, middleName*}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      // When only $schema exists, outputs as bare schema line
      expect(result).toContain('id, name, middleName*');
      expect(result).not.toContain('~ $schema:');
    });

    test('should serialize schema with optional and nullable fields', () => {
      const io = `
~ $schema: {id, name, nickname?*, email?}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      // When only $schema exists, outputs as bare schema line
      expect(result).toContain('id, name, nickname?*, email?');
      expect(result).not.toContain('~ $schema:');
    });
  });

  describe('Nested Schema Definitions', () => {
    test('should serialize nested schema definitions', () => {
      const io = `
~ $address: {street, city, state}, ~ $schema: {id, name, $address}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ $address: {street, city, state}');
      expect(result).toContain('~ $schema: {id, name, $address}');
    });

    test('should serialize deeply nested schemas', () => {
      const io = `
~ $geo: {lat, lon}, ~ $address: {street, city, $geo}, ~ $schema: {id, name, $address}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ $geo: {lat, lon}');
      expect(result).toContain('~ $address: {street, city, $geo}');
      expect(result).toContain('~ $schema: {id, name, $address}');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty schema definition', () => {
      const io = `
~ $empty: {}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ $empty: {}');
    });

    test('should handle special characters in metadata values', () => {
      const io = `
~ appName: "My App: v2.0", ~ description: "Test, with comma"
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ appName: "My App: v2.0"');
      expect(result).toContain('~ description: "Test, with comma"');
    });

    test('should serialize definitions with empty data section', () => {
      const io = `
~ appName: "API", ~ version: 1.0, ~ $schema: {id, name}
---
`;
      const doc = parse(io, null) as Document;
      const result = stringify(doc);

      expect(result).toContain('~ appName: "API"');
      expect(result).toContain('~ version: 1');
      expect(result).toContain('~ $schema: {id, name}');
    });
  });

  describe('Round-trip Serialization', () => {
    test('should preserve schema definitions through serialization', () => {
      const io = `
~ $address: {street, city}, ~ $schema: {name, email}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc);

      expect(serialized).toContain('~ $address: {street, city}');
      expect(serialized).toContain('~ $schema: {name, email}');
    });

    test('should preserve all definition types through serialization', () => {
      const io = `
~ appName: "Test", ~ @yes: T, ~ $schema: {id, name, active}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc);

      expect(serialized).toContain('~ appName: "Test"');
      expect(serialized).toContain('~ @yes: T');
      expect(serialized).toContain('~ $schema: {id, name, active}');
    });

    test('should preserve complex mixed definitions through serialization', () => {
      const io = `
~ version: 1.0, ~ pageSize: 10, ~ @default: "unknown", ~ $address: {street, city}, ~ $schema: {id, name, email}
---
`;
      const doc = parse(io, null) as Document;
      const serialized = stringify(doc);

      // Verify all definitions are serialized
      expect(serialized).toContain('~ version: 1');
      expect(serialized).toContain('~ pageSize: 10');
      expect(serialized).toContain('~ @default: "unknown"');
      expect(serialized).toContain('~ $address: {street, city}');
      expect(serialized).toContain('~ $schema: {id, name, email}');
    });
  });
});
