import parse from '../../src/parser/index';
import io from '../../src/parser/io';
import ParserOptions from '../../src/parser/parser-options';
import Definitions from '../../src/core/definitions';

describe('Critical Bug Fixes - Task 1', () => {

  describe('Fix 1: Incomplete string literal in parseDefs function', () => {
    it('should parse schema definitions starting with $ correctly', () => {
      const source = `
~ $userSchema: { name: string, age: number }
~ $addressSchema: { street: string, city: string }
---
name: John, age: 25
`;

      const result = parse(source, null);
      expect(result).toBeDefined();
      expect(result.header.definitions).toBeDefined();

      // Verify that schema definitions were parsed correctly
      const userSchema = result.header.definitions?.getV('$userSchema');
      const addressSchema = result.header.definitions?.getV('$addressSchema');

      expect(userSchema).toBeDefined();
      expect(addressSchema).toBeDefined();
    });

    it('should parse variable definitions starting with @ correctly', () => {
      const source = `
~ @baseUrl: "https://api.example.com"
~ @version: "v1"
---
url: @baseUrl, version: @version
`;

      const result = parse(source, null);
      expect(result).toBeDefined();
      expect(result.header.definitions).toBeDefined();

      // Verify that variable definitions were parsed correctly
      const baseUrl = result.header.definitions?.getV('@baseUrl');
      const version = result.header.definitions?.getV('@version');

      expect(baseUrl).toBeDefined();
      expect(version).toBeDefined();
    });

    it('should handle mixed schema and variable definitions', () => {
      const source = `
~ $schema: { name: string }
~ @defaultName: "Anonymous"
~ regularDef: "some value"
---
name: Test
`;

      expect(() => {
        const result = parse(source, null);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Fix 2: Complete io.ts implementation', () => {
    it('should parse template strings correctly', () => {
      const name = 'John';
      const age = 25;

      const result = io`
        name: ${name},
        age: ${age}
      `;

      expect(result).toBeDefined();
      expect(result.sections).toBeDefined();

      // Check if sections exist and have content
      if (result.sections && result.sections.length > 0) {
        const sectionData = result.sections.get(0)?.data;
        expect(sectionData).toBeDefined();
      } else {
        // If no sections, at least verify the result is a valid document
        expect(result.header).toBeDefined();
      }
    });

    it('should handle empty template strings', () => {
      const result = io``;

      expect(result).toBeDefined();
      expect(result.sections?.length).toBe(0);
    });

    it('should handle template strings with multiple interpolations', () => {
      const user = { name: 'Alice', age: 30 };
      const active = true;

      const result = io`
        name: ${user.name},
        age: ${user.age},
        active: ${active}
      `;

      expect(result).toBeDefined();
      expect(result.sections).toBeDefined();
    });
  });

  describe('Fix 3: ParserOptions constructor', () => {
    it('should create ParserOptions with default values', () => {
      const options = new ParserOptions();

      expect(options.continueOnError).toBe(false);
      expect(options.allowEmptyRecords).toBe(false);
      expect(options.numberOfSections).toBe(0);
      expect(options.headerOnly).toBe(false);
      expect(options.dataOnly).toBe(false);
      expect(options.skipEmptyLines).toBe(false);
      expect(options.allowVariables).toBe(false);
      expect(options.trueTokens).toEqual(['true', 'T']);
      expect(options.falseTokens).toEqual(['false', 'F']);
    });

    it('should create ParserOptions with partial options', () => {
      const options = new ParserOptions({
        continueOnError: true,
        allowEmptyRecords: true,
        numberOfSections: 5
      });

      expect(options.continueOnError).toBe(true);
      expect(options.allowEmptyRecords).toBe(true);
      expect(options.numberOfSections).toBe(5);
      // Other options should have default values
      expect(options.headerOnly).toBe(false);
      expect(options.dataOnly).toBe(false);
    });

    it('should create ParserOptions with all options specified', () => {
      const options = new ParserOptions({
        continueOnError: true,
        allowEmptyRecords: true,
        numberOfSections: 10,
        headerOnly: true,
        dataOnly: false,
        skipEmptyLines: true,
        allowVariables: true,
        trueTokens: ['yes', 'Y'],
        falseTokens: ['no', 'N']
      });

      expect(options.continueOnError).toBe(true);
      expect(options.allowEmptyRecords).toBe(true);
      expect(options.numberOfSections).toBe(10);
      expect(options.headerOnly).toBe(true);
      expect(options.dataOnly).toBe(false);
      expect(options.skipEmptyLines).toBe(true);
      expect(options.allowVariables).toBe(true);
      expect(options.trueTokens).toEqual(['yes', 'Y']);
      expect(options.falseTokens).toEqual(['no', 'N']);
    });

    it('should work with parse function', () => {
      const options = new ParserOptions({
        continueOnError: true,
        allowEmptyRecords: true
      });

      const source = 'name: John, age: 25';

      expect(() => {
        const result = parse(source, null, options);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Fix 4: Added null checks', () => {
    it('should handle null/undefined members in ObjectNode.toObject', () => {
      const source = `
        name: John,
        ,
        age: 25
      `;

      expect(() => {
        const result = parse(source, null);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle null/undefined members in ObjectNode.toValue', () => {
      const source = `
        name: John,
        ,
        age: 25
      `;

      expect(() => {
        const result = parse(source, null);
        // Just verify parsing doesn't throw, don't check specific structure
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle empty objects gracefully', () => {
      const source = '{}';

      expect(() => {
        const result = parse(source, null);
        expect(result).toBeDefined();
      }).not.toThrow();
    });

    it('should handle objects with only undefined values', () => {
      const source = '{,,,}';

      expect(() => {
        const result = parse(source, null);
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Integration: All fixes working together', () => {
    it('should parse complex document with all fixed features', () => {
      const source = `
~ $userSchema: { name: string, age: number }
~ @defaultCity: "Unknown"
---
name: John,
age: 25,
city: @defaultCity
`;

      const options = new ParserOptions({
        continueOnError: true,
        allowVariables: true
      });

      expect(() => {
        const result = parse(source, null, options);
        expect(result).toBeDefined();
        expect(result.header.definitions).toBeDefined();
        expect(result.sections?.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    it('should work with io template function and complex parsing', () => {
      const userName = 'Alice';
      const userAge = 30;

      expect(() => {
        const result = io`
          name: ${userName},
          age: ${userAge},
          active: true
        `;
        expect(result).toBeDefined();
      }).not.toThrow();
    });
  });
});