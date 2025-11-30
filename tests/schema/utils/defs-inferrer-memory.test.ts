/**
 * Memory and stress tests for defs-inferrer
 */
import { inferDefs } from '../../../src/schema/utils/defs-inferrer';
import { stringify, loadObject, loadDoc, parse } from '../../../src';

describe('Defs Inferrer - Memory and Stress Tests', () => {
  describe('Deep Nesting', () => {
    function createDeepNested(depth: number): any {
      let obj: any = { value: 'leaf' };
      for (let i = 0; i < depth; i++) {
        obj = { nested: obj };
      }
      return obj;
    }

    it('should handle depth of 10', () => {
      const data = createDeepNested(10);
      const result = inferDefs(data);
      expect(result.rootSchema).toBeDefined();
    });

    it('should handle depth of 50', () => {
      const data = createDeepNested(50);
      const result = inferDefs(data);
      expect(result.rootSchema).toBeDefined();
    });

    it('should handle depth of 100', () => {
      const data = createDeepNested(100);
      const result = inferDefs(data);
      expect(result.rootSchema).toBeDefined();
    });

    it('should handle depth of 200', () => {
      const data = createDeepNested(200);
      const result = inferDefs(data);
      expect(result.rootSchema).toBeDefined();
    });

    it('should not leak memory across multiple inferences', () => {
      // Run multiple times to check for memory leaks
      for (let i = 0; i < 10; i++) {
        const data = createDeepNested(50);
        const result = inferDefs(data);
        expect(result.rootSchema).toBeDefined();
      }
      // If we get here without running out of memory, the test passes
      expect(true).toBe(true);
    });
  });

  describe('Special Characters in Strings', () => {
    it('should handle strings with @ and $ (convention chars, not special)', () => {
      const data = {
        mention: '@username',
        email: 'user@company.com',
        variable: '$price',
        schema: '$mySchema'
      };

      const doc = loadDoc(data, undefined, { inferDefs: true });
      const output = stringify(doc);

      // @ and $ are conventions, not reserved - allowed unquoted
      expect(output).toContain('@username');
      expect(output).toContain('user@company.com');
      expect(output).toContain('$price');
      expect(output).toContain('$mySchema');
    });

    it('should handle strings starting with ~ (escaped with backslash)', () => {
      const data = {
        path: '~/home/user',
        tilde: '~value'
      };

      const doc = loadDoc(data, undefined, { inferDefs: true });
      const output = stringify(doc);

      // ~ is the definition marker, must be escaped
      expect(output).toContain('\\~');
    });

    it('should handle strings with commas (quoted)', () => {
      const data = {
        csv: 'a,b,c',
        sentence: 'Hello, world!'
      };

      const doc = loadDoc(data, undefined, { inferDefs: true });
      const output = stringify(doc);

      expect(output).toContain('"a,b,c"');
      expect(output).toContain('"Hello, world!"');
    });

    it('should handle strings with brackets and colons (quoted or escaped)', () => {
      const data = {
        array: '[1,2,3]',
        object: '{key: value}',
        time: '10:30'
      };

      const doc = loadDoc(data, undefined, { inferDefs: true });
      const output = stringify(doc);

      // [ is quoted, { and : are escaped
      expect(output).toContain('"[1,2,3]"');
      expect(output).toContain('\\{');
      expect(output).toContain('\\:');
    });

    it('should handle strings with @ and $ characters in stringify', () => {
      // @ and $ are convention characters (used for variables/schema refs)
      // When stringifying, they output as-is (unquoted)
      const data = {
        items: [
          { tag: '@mention', price: '$100' },
          { tag: '@other', price: '$200' }
        ]
      };

      const doc = loadDoc(data, undefined, { inferDefs: true });
      const output = stringify(doc, undefined, undefined, { includeHeader: true });

      // Stringify correctly outputs @ and $ unquoted
      expect(output).toContain('@mention');
      expect(output).toContain('$100');
      expect(output).toContain('@other');
      expect(output).toContain('$200');

      // Verify the output structure
      expect(output).toContain('$item');
      expect(output).toContain('$schema');
    });
  });

  describe('Mixed null/undefined in Arrays', () => {
    it('should handle array with null elements', () => {
      const data = {
        values: [1, null, 3, null, 5]
      };

      const result = inferDefs(data);
      expect(result.rootSchema).toBeDefined();

      // Should infer as generic array since it has mixed types (number and null)
      const valuesMember = result.rootSchema.get('values');
      expect(valuesMember?.type).toBe('array');
    });

    it('should handle array of objects with some null elements', () => {
      const data = {
        items: [
          { name: 'Alice' },
          null,
          { name: 'Bob' }
        ]
      };

      const result = inferDefs(data);
      expect(result.rootSchema).toBeDefined();

      // Should still create $item schema from non-null objects
      expect(result.definitions.get('$item')).toBeDefined();
    });

    it('should handle undefined in arrays', () => {
      const data = {
        sparse: [1, undefined, 3]
      };

      const result = inferDefs(data);
      expect(result.rootSchema).toBeDefined();
    });

    it('should handle all-null array', () => {
      const data = {
        nulls: [null, null, null]
      };

      const result = inferDefs(data);
      expect(result.rootSchema).toBeDefined();

      const nullsMember = result.rootSchema.get('nulls');
      expect(nullsMember?.type).toBe('array');
    });
  });

  describe('Large Arrays', () => {
    it('should handle array with 1000 objects', () => {
      const items = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        active: i % 2 === 0
      }));

      const data = { items };
      const result = inferDefs(data);

      expect(result.rootSchema).toBeDefined();
      expect(result.definitions.get('$item')).toBeDefined();
    });

    it('should handle array with varying optional fields across 100 objects', () => {
      const items = Array.from({ length: 100 }, (_, i) => {
        const item: any = { id: i, name: `Item ${i}` };
        if (i % 3 === 0) item.extra = 'has extra';
        if (i % 5 === 0) item.special = true;
        if (i % 7 === 0) item.count = i;
        return item;
      });

      const data = { items };
      const result = inferDefs(data);

      expect(result.rootSchema).toBeDefined();

      // extra, special, count should all be optional
      const itemSchema = result.definitions.get('$item');
      expect(itemSchema).toBeDefined();

      const extraMember = itemSchema?.get('extra');
      const specialMember = itemSchema?.get('special');
      const countMember = itemSchema?.get('count');

      expect(extraMember?.optional).toBe(true);
      expect(specialMember?.optional).toBe(true);
      expect(countMember?.optional).toBe(true);
    });
  });
});
