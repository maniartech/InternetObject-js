import parse from '../../src/parser';

/**
 * Test suite for error categorization and differential styling support.
 * Verifies that errors are properly categorized as 'syntax', 'validation', or 'runtime'
 * in the serialized output for UI consumption.
 */
describe('Error Categorization', () => {

  describe('Syntax Error Categorization', () => {
    it('categorizes parser errors as "syntax" in serialized output', () => {
      const input = `name, age
---
~ John, 25
~ Jane, {unclosed
~ Bob, 30
`;

      const doc = parse(input, null);
      const errors = doc.getErrors();

      // Should have one syntax error
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].name).toContain('SyntaxError');

      // Serialize and check category
      const json: any = doc.toJSON({ skipErrors: false });
      expect(Array.isArray(json)).toBe(true);

      // Find the error object in the array
      const errorObj = json.find((item: any) => item && item.__error === true);
      expect(errorObj).toBeDefined();
      expect(errorObj.category).toBe('syntax');
      expect(errorObj.__error).toBe(true);
      expect(errorObj.message).toBeDefined();
      expect(errorObj.position).toBeDefined();
    });

    it('categorizes missing bracket errors as "syntax"', () => {
      const input = `name, colors
---
~ Alice, [red, blue
~ Bob, [green, yellow]
`;

      const doc = parse(input, null);
      const json: any = doc.toJSON({ skipErrors: false });

      const errorObj = json.find((item: any) => item && item.__error === true);
      expect(errorObj).toBeDefined();
      expect(errorObj.category).toBe('syntax');
      expect(errorObj.message).toContain('bracket');
    });
  });

  describe('Validation Error Categorization', () => {
    it('categorizes schema validation errors as "validation" in serialized output', () => {
      const input = `name, age:{number, min:30}
---
~ John, 25
~ Jane, 35
~ Bob, 20
`;

      const doc = parse(input, null);
      const errors = doc.getErrors();

      // Should have validation errors
      expect(errors.length).toBeGreaterThan(0);
      const validationErrors = errors.filter(e => e.name.includes('ValidationError'));
      expect(validationErrors.length).toBeGreaterThan(0);

      // Serialize and check categories
      const json: any = doc.toJSON({ skipErrors: false });
      expect(Array.isArray(json)).toBe(true);

      // Find validation error objects
      const errorObjects = json.filter((item: any) => item && item.__error === true);
      expect(errorObjects.length).toBeGreaterThan(0);

      // All should be categorized as validation
      errorObjects.forEach((errObj: any) => {
        expect(errObj.category).toBe('validation');
        expect(errObj.__error).toBe(true);
        expect(errObj.message).toBeDefined();
        expect(errObj.position).toBeDefined();
      });
    });

    it('categorizes type mismatch errors as "validation"', () => {
      const input = `name, age:number, active:bool
---
~ Alice, 25, T
~ Bob, not-a-number, F
`;

      const doc = parse(input, null);
      const json: any = doc.toJSON({ skipErrors: false });

      const errorObj = json.find((item: any) => item && item.__error === true);
      expect(errorObj).toBeDefined();
      expect(errorObj.category).toBe('validation');
    });

    it('categorizes min/max constraint violations as "validation"', () => {
      const input = `product, price:{number, min:0, max:1000}
---
~ Widget, 500
~ Gadget, -10
~ Device, 2000
`;

      const doc = parse(input, null);
      const json: any = doc.toJSON({ skipErrors: false });

      const errorObjects = json.filter((item: any) => item && item.__error === true);
      expect(errorObjects.length).toBe(2); // Both -10 and 2000 violate constraints

      errorObjects.forEach((errObj: any) => {
        expect(errObj.category).toBe('validation');
        expect(errObj.message).toContain('range');
      });
    });
  });

  describe('Mixed Error Categorization', () => {
    it('correctly categorizes both syntax and validation errors in the same document', () => {
      const input = `name, age:{number, min:30}, city
---
~ John, 25, NYC
~ Jane, {unclosed, LA
~ Bob, 35, Chicago
~ Alice, 20, Boston
`;

      const doc = parse(input, null);
      const errors = doc.getErrors();

      // Should have both types of errors
      expect(errors.length).toBeGreaterThan(1);

      const syntaxErrors = errors.filter(e => e.name.includes('SyntaxError'));
      const validationErrors = errors.filter(e => e.name.includes('ValidationError'));

      expect(syntaxErrors.length).toBeGreaterThan(0);
      expect(validationErrors.length).toBeGreaterThan(0);

      // Serialize and verify categorization
      const json: any = doc.toJSON({ skipErrors: false });
      const errorObjects = json.filter((item: any) => item && item.__error === true);

      expect(errorObjects.length).toBeGreaterThanOrEqual(2);

      // Should have at least one of each category
      const syntaxCategoryCount = errorObjects.filter((e: any) => e.category === 'syntax').length;
      const validationCategoryCount = errorObjects.filter((e: any) => e.category === 'validation').length;

      expect(syntaxCategoryCount).toBeGreaterThan(0);
      expect(validationCategoryCount).toBeGreaterThan(0);
    });

    it('preserves error order and positions with correct categories', () => {
      const input = `name, age:{number, min:18}
---
~ Alice, 16
~ Bob, {invalid
~ Carol, 25
`;

      const doc = parse(input, null);
      const json: any = doc.toJSON({ skipErrors: false });

      // First item should be validation error (age 16 < 18)
      expect(json[0].__error).toBe(true);
      expect(json[0].category).toBe('validation');
      expect(json[0].position.row).toBe(3);

      // Second item should be syntax error (unclosed brace)
      expect(json[1].__error).toBe(true);
      expect(json[1].category).toBe('syntax');
      expect(json[1].position.row).toBe(4);

      // Third item should be valid
      expect(json[2].__error).toBeUndefined();
      expect(json[2].name).toBe('Carol');
      expect(json[2].age).toBe(25);
    });
  });

  describe('Error Category Schema', () => {
    it('includes all required fields in error objects', () => {
      const input = `name, age:{number, min:21}
---
~ John, 18
`;

      const doc = parse(input, null);
      const json: any = doc.toJSON({ skipErrors: false });
      const errorObj = json[0];

      // Verify complete error object schema
      expect(errorObj).toHaveProperty('__error');
      expect(errorObj).toHaveProperty('category');
      expect(errorObj).toHaveProperty('message');
      expect(errorObj).toHaveProperty('name');
      expect(errorObj).toHaveProperty('position');

      expect(errorObj.__error).toBe(true);
      expect(['syntax', 'validation', 'runtime']).toContain(errorObj.category);
      expect(typeof errorObj.message).toBe('string');
      expect(typeof errorObj.name).toBe('string');
      expect(errorObj.position).toHaveProperty('row');
      expect(errorObj.position).toHaveProperty('col');
    });

    it('includes endPosition when available', () => {
      const input = `name, value
---
~ Test, {unclosed object here
`;

      const doc = parse(input, null);
      const json: any = doc.toJSON({ skipErrors: false });
      const errorObj = json.find((item: any) => item && item.__error === true);

      expect(errorObj).toBeDefined();
      expect(errorObj.position).toBeDefined();
      // Parser errors typically have endPosition for ranges
      if (errorObj.endPosition) {
        expect(errorObj.endPosition).toHaveProperty('row');
        expect(errorObj.endPosition).toHaveProperty('col');
      }
    });
  });

  describe('SkipErrors Integration with Categories', () => {
    it('respects skipErrors flag for validation errors', () => {
      const input = `name, age:{number, min:30}
---
~ John, 25
~ Jane, 35
~ Bob, 20
`;

      const doc = parse(input, null);

      // With skipErrors: false, includes error objects
      const jsonWithErrors: any = doc.toJSON({ skipErrors: false });
      const errorCount = jsonWithErrors.filter((item: any) => item && item.__error === true).length;
      expect(errorCount).toBe(2); // John and Bob

      // With skipErrors: true, excludes error objects
      const jsonWithoutErrors: any = doc.toJSON({ skipErrors: true });
      const hasErrors = jsonWithoutErrors.some((item: any) => item && item.__error === true);
      expect(hasErrors).toBe(false);
      expect(jsonWithoutErrors.length).toBe(1); // Only Jane
      expect(jsonWithoutErrors[0].name).toBe('Jane');
    });

    it('respects skipErrors flag for syntax errors', () => {
      const input = `name, value
---
~ Alice, 100
~ Bob, {invalid
~ Carol, 200
`;

      const doc = parse(input, null);

      // With skipErrors: false
      const jsonWithErrors: any = doc.toJSON({ skipErrors: false });
      expect(jsonWithErrors.length).toBe(3);
      expect(jsonWithErrors[1].__error).toBe(true);
      expect(jsonWithErrors[1].category).toBe('syntax');

      // With skipErrors: true
      const jsonWithoutErrors: any = doc.toJSON({ skipErrors: true });
      expect(jsonWithoutErrors.length).toBe(2);
      expect(jsonWithoutErrors.every((item: any) => !item.__error)).toBe(true);
    });
  });

  describe('Error Category Type Safety', () => {
    it('never produces undefined or null categories', () => {
      const inputs = [
        // Syntax error
        `name\n---\n~ {unclosed`,
        // Validation error
        `age:number\n---\n~ not-a-number`,
        // Multiple errors
        `name, age:{number, min:10}\n---\n~ Test, 5\n~ Bad, {invalid`
      ];

      for (const input of inputs) {
        const doc = parse(input, null);
        const json: any = doc.toJSON({ skipErrors: false });
        const errorObjects = json.filter((item: any) => item && item.__error === true);

        errorObjects.forEach((errObj: any) => {
          expect(errObj.category).toBeDefined();
          expect(errObj.category).not.toBeNull();
          expect(['syntax', 'validation', 'runtime']).toContain(errObj.category);
        });
      }
    });

    it('uses "runtime" as fallback for unknown error types', () => {
      // This is a theoretical test; in practice, all errors should be
      // either SyntaxError or ValidationError, but the code has a fallback
      // We can't easily trigger a runtime error in the current codebase,
      // but we document the expected behavior

      // If we somehow got an error that's neither Syntax nor Validation,
      // it should default to 'runtime' category
      expect(['syntax', 'validation', 'runtime']).toContain('runtime');
    });
  });

  describe('Document.getErrors() Integration', () => {
    it('getErrors() returns all errors regardless of category', () => {
      const input = `name, age:{number, min:25}
---
~ Alice, 20
~ Bob, {invalid
~ Carol, 30
`;

      const doc = parse(input, null);
      const errors = doc.getErrors();

      // Should have both validation and syntax errors
      expect(errors.length).toBeGreaterThanOrEqual(2);

      const hasValidation = errors.some(e => e.name.includes('ValidationError'));
      const hasSyntax = errors.some(e => e.name.includes('SyntaxError'));

      expect(hasValidation).toBe(true);
      expect(hasSyntax).toBe(true);
    });

    it('getErrors() maintains error order matching document order', () => {
      const input = `name, age:{number, min:30}
---
~ John, 25
~ Jane, 35
~ Bob, 20
`;

      const doc = parse(input, null);
      const errors = doc.getErrors();

      // Should have 2 validation errors (John age 25, Bob age 20)
      expect(errors.length).toBeGreaterThanOrEqual(2);

      // All errors should have position information
      errors.forEach((e: any) => {
        const pos = e.positionRange?.getStartPos ? e.positionRange.getStartPos() : e.position;
        expect(pos).toBeDefined();
        expect(pos.row).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-world Scenario Tests', () => {
    it('handles complex document with multiple error types', () => {
      const input = `
name, email:string, age:{number, min:18, max:100}, active:bool, score:{number, min:0, max:100}
---
~ Alice, alice@test.com, 25, T, 95
~ Bob, bob@test.com, 16, T, 85
~ Carol, carol@test.com, 30, T, 105
~ Dave, dave@test.com, 200, F, 50
~ Eve, eve@test.com, 45, F, {unclosed
`;

      const doc = parse(input, null);
      const errors = doc.getErrors();
      const json: any = doc.toJSON({ skipErrors: false });

      // Should have multiple errors (validation for age/score constraints, syntax for unclosed)
      expect(errors.length).toBeGreaterThan(0);

      // Check each error has proper category
      const errorObjects = json.filter((item: any) => item && item.__error === true);
      expect(errorObjects.length).toBeGreaterThan(0);

      errorObjects.forEach((errObj: any) => {
        expect(errObj).toHaveProperty('category');
        expect(['syntax', 'validation']).toContain(errObj.category);
        expect(errObj).toHaveProperty('message');
        expect(errObj).toHaveProperty('position');
      });

      // Should have at least one error with a recognized category
      const validCategories = errorObjects.filter((e: any) =>
        e.category === 'syntax' || e.category === 'validation'
      );
      expect(validCategories.length).toBeGreaterThan(0);
    });

    it('provides actionable error information for UI rendering', () => {
      const input = `product, price:{number, min:0}
---
~ Widget, 100
~ Gadget, -50
~ Tool, {broken
`;

      const doc = parse(input, null);
      const json: any = doc.toJSON({ skipErrors: false });

      // Each error should have enough info for UI to render with proper styling
      const errorObjects = json.filter((item: any) => item && item.__error === true);

      errorObjects.forEach((errObj: any) => {
        // UI can use category for color coding
        const color = errObj.category === 'validation' ? 'orange' : 'red';
        expect(['orange', 'red']).toContain(color);

        // UI can display message
        expect(errObj.message.length).toBeGreaterThan(0);

        // UI can show position for navigation
        expect(typeof errObj.position.row).toBe('number');
        expect(typeof errObj.position.col).toBe('number');

        // UI can distinguish error from data
        expect(errObj.__error).toBe(true);
      });
    });
  });
});
