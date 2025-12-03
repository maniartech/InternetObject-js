import IOHeader from '../../src/core/header';
import IODefinitions from '../../src/core/definitions';
import Schema from '../../src/schema/schema';

describe('IOHeader', () => {
  describe('Basic Properties', () => {
    it('should store and return schema and definitions', () => {
      const header = new IOHeader();
      expect(header.schema).toBeNull();
      expect(header.definitions).toBeInstanceOf(IODefinitions);
    });

    it('should allow setting schema directly', () => {
      const header = new IOHeader();
      const mockSchema = { type: 'object' } as any;
      header.schema = mockSchema;
      expect(header.schema).toBe(mockSchema);
    });

    it('should return defaultSchema when schema is not set', () => {
      const header = new IOHeader();
      const defaultSchema = new Schema('defaultSchemaName');
      header.definitions.set('$schema', defaultSchema);
      // schema getter should return defaultSchema from definitions
      expect(header.schema).toBe(defaultSchema);
    });

    it('should prioritize explicit schema over defaultSchema', () => {
      const header = new IOHeader();
      header.definitions.set('$schema', 'defaultSchemaName');
      const explicitSchema = { type: 'array' } as any;
      header.schema = explicitSchema;
      expect(header.schema).toBe(explicitSchema);
    });
  });

  describe('Merge Operations', () => {
    it('should merge definitions from another header', () => {
      const header1 = new IOHeader();
      const header2 = new IOHeader();
      header2.definitions.set('key', 'value');
      header1.merge(header2);
      expect(header1.definitions.get('key')).toBe('value');
      expect(header1.definitions.get('invalid-key')).toBeUndefined();
    });

    it('should merge definitions without override by default', () => {
      const header1 = new IOHeader();
      header1.definitions.set('a', 1);
      const header2 = new IOHeader();
      header2.definitions.set('a', 2);
      header2.definitions.set('b', 3);
      header1.merge(header2);
      expect(header1.definitions.get('a')).toBe(1); // not overridden
      expect(header1.definitions.get('b')).toBe(3);
    });

    it('should merge definitions with override when specified', () => {
      const header1 = new IOHeader();
      header1.definitions.set('a', 1);
      const header2 = new IOHeader();
      header2.definitions.set('a', 2);
      header1.merge(header2, true);
      expect(header1.definitions.get('a')).toBe(2); // overridden
    });

    it('should merge schema with override when specified', () => {
      const header1 = new IOHeader();
      const schema1 = { type: 'object' } as any;
      header1.schema = schema1;
      const header2 = new IOHeader();
      const schema2 = { type: 'array' } as any;
      header2.schema = schema2;
      header1.merge(header2, true);
      expect(header1.schema).toBe(schema2);
    });

    it('should not merge schema without override', () => {
      const header1 = new IOHeader();
      const schema1 = { type: 'object' } as any;
      header1.schema = schema1;
      const header2 = new IOHeader();
      const schema2 = { type: 'array' } as any;
      header2.schema = schema2;
      header1.merge(header2, false);
      expect(header1.schema).toBe(schema1);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const header = new IOHeader();
      header.definitions.set('key', 'value');
      expect(header.toJSON()).toEqual({ key: 'value' });
    });

    it('should return null when no regular definitions (only schema/variables)', () => {
      const header = new IOHeader();
      expect(header.toJSON()).toBeNull();

      // Even with schema definitions, toJSON returns null (schemas are excluded)
      header.definitions.set('$schema', 'someSchema');
      expect(header.toJSON()).toBeNull();
    });

    it('should serialize complex definitions', () => {
      const header = new IOHeader();
      header.definitions.set('config', { nested: { deep: true } });
      header.definitions.set('items', [1, 2, 3]);
      expect(header.toJSON()).toEqual({
        config: { nested: { deep: true } },
        items: [1, 2, 3]
      });
    });
  });
});
