import { ProcessingContext } from '../../../src/schema/processing/processing-context';

describe('ProcessingContext', () => {
  describe('Basic Operations', () => {
    test('should start with no errors', () => {
      const context = new ProcessingContext();

      expect(context.hasErrors()).toBe(false);
      expect(context.getErrors()).toEqual([]);
    });

    test('should add and retrieve single error', () => {
      const context = new ProcessingContext();
      const error = new Error('Test error');

      context.addError(error);

      expect(context.hasErrors()).toBe(true);
      expect(context.getErrors()).toHaveLength(1);
      expect(context.getErrors()[0]).toBe(error);
    });

    test('should add and retrieve multiple errors', () => {
      const context = new ProcessingContext();
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      const error3 = new Error('Error 3');

      context.addError(error1);
      context.addError(error2);
      context.addError(error3);

      expect(context.hasErrors()).toBe(true);
      expect(context.getErrors()).toHaveLength(3);
      expect(context.getErrors()).toEqual([error1, error2, error3]);
    });

    test('should preserve error order', () => {
      const context = new ProcessingContext();

      for (let i = 0; i < 10; i++) {
        context.addError(new Error(`Error ${i}`));
      }

      const errors = context.getErrors();
      for (let i = 0; i < 10; i++) {
        expect(errors[i].message).toBe(`Error ${i}`);
      }
    });
  });

  describe('Error Types', () => {
    test('should handle TypeError', () => {
      const context = new ProcessingContext();
      const error = new TypeError('Type error');

      context.addError(error);

      expect(context.getErrors()[0]).toBeInstanceOf(TypeError);
    });

    test('should handle RangeError', () => {
      const context = new ProcessingContext();
      const error = new RangeError('Range error');

      context.addError(error);

      expect(context.getErrors()[0]).toBeInstanceOf(RangeError);
    });

    test('should handle SyntaxError', () => {
      const context = new ProcessingContext();
      const error = new SyntaxError('Syntax error');

      context.addError(error);

      expect(context.getErrors()[0]).toBeInstanceOf(SyntaxError);
    });

    test('should handle custom error classes', () => {
      class CustomError extends Error {
        constructor(public code: string, message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const context = new ProcessingContext();
      const error = new CustomError('E001', 'Custom error message');

      context.addError(error);

      const retrieved = context.getErrors()[0] as CustomError;
      expect(retrieved).toBeInstanceOf(CustomError);
      expect(retrieved.code).toBe('E001');
      expect(retrieved.message).toBe('Custom error message');
    });
  });

  describe('hasErrors', () => {
    test('should return false when no errors', () => {
      const context = new ProcessingContext();

      expect(context.hasErrors()).toBe(false);
    });

    test('should return true after adding one error', () => {
      const context = new ProcessingContext();

      context.addError(new Error('test'));

      expect(context.hasErrors()).toBe(true);
    });

    test('should return true after adding multiple errors', () => {
      const context = new ProcessingContext();

      context.addError(new Error('error 1'));
      context.addError(new Error('error 2'));

      expect(context.hasErrors()).toBe(true);
    });
  });

  describe('getErrors', () => {
    test('should return empty array when no errors', () => {
      const context = new ProcessingContext();

      const errors = context.getErrors();

      expect(Array.isArray(errors)).toBe(true);
      expect(errors).toHaveLength(0);
    });

    test('should return all added errors', () => {
      const context = new ProcessingContext();
      const error1 = new Error('error 1');
      const error2 = new Error('error 2');

      context.addError(error1);
      context.addError(error2);

      const errors = context.getErrors();

      expect(errors).toContain(error1);
      expect(errors).toContain(error2);
    });

    test('should return same array reference on multiple calls', () => {
      const context = new ProcessingContext();
      context.addError(new Error('test'));

      const errors1 = context.getErrors();
      const errors2 = context.getErrors();

      expect(errors1).toBe(errors2);
    });
  });

  describe('Multiple Contexts', () => {
    test('should maintain independent error collections', () => {
      const context1 = new ProcessingContext();
      const context2 = new ProcessingContext();

      context1.addError(new Error('Error from context 1'));
      context2.addError(new Error('Error from context 2'));

      expect(context1.getErrors()).toHaveLength(1);
      expect(context2.getErrors()).toHaveLength(1);
      expect(context1.getErrors()[0].message).toBe('Error from context 1');
      expect(context2.getErrors()[0].message).toBe('Error from context 2');
    });
  });

  describe('Edge Cases', () => {
    test('should handle adding same error instance multiple times', () => {
      const context = new ProcessingContext();
      const error = new Error('Duplicate error');

      context.addError(error);
      context.addError(error);
      context.addError(error);

      expect(context.getErrors()).toHaveLength(3);
      expect(context.getErrors().every(e => e === error)).toBe(true);
    });

    test('should handle errors with special characters in message', () => {
      const context = new ProcessingContext();
      const error = new Error('Error with special chars: <>&"\'');

      context.addError(error);

      expect(context.getErrors()[0].message).toBe('Error with special chars: <>&"\'');
    });

    test('should handle errors with empty message', () => {
      const context = new ProcessingContext();
      const error = new Error('');

      context.addError(error);

      expect(context.getErrors()[0].message).toBe('');
    });

    test('should handle unicode in error messages', () => {
      const context = new ProcessingContext();
      const error = new Error('エラーメッセージ 🚫');

      context.addError(error);

      expect(context.getErrors()[0].message).toBe('エラーメッセージ 🚫');
    });
  });

  describe('Performance', () => {
    test('should handle large number of errors efficiently', () => {
      const context = new ProcessingContext();

      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        context.addError(new Error(`Error ${i}`));
      }

      const endTime = performance.now();

      expect(context.getErrors()).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(200); // Should complete quickly
    });

    test('should have fast hasErrors check', () => {
      const context = new ProcessingContext();

      for (let i = 0; i < 1000; i++) {
        context.addError(new Error(`Error ${i}`));
      }

      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        context.hasErrors();
      }

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});
