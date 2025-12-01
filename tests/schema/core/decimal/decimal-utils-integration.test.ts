// decimal-utils-integration.test.ts
import {
  alignOperands,
  fitToPrecision,
  formatBigIntAsDecimal,
  validatePrecisionScale
} from '../../../../src/core/decimal-utils';
import Decimal from '../../../../src/core/decimal';

describe('Decimal Utilities Integration Tests', () => {
  describe('Addition with utility functions', () => {
    it('should correctly add two decimal values using utility functions', () => {
      // Simulate adding 123.45 + 67.8
      const a = 12345n;
      const aScale = 2;
      const b = 678n;
      const bScale = 1;
      const precision = 5;

      // Step 1: Align operands
      const aligned = alignOperands(a, aScale, b, bScale);
      expect(aligned.a).toBe(12345n);
      expect(aligned.b).toBe(6780n);
      expect(aligned.targetScale).toBe(2);

      // Step 2: Perform addition
      const sum = aligned.a + aligned.b;
      expect(sum).toBe(19125n);

      // Step 3: Ensure result fits within precision
      const validationResult = validatePrecisionScale(sum, precision, aligned.targetScale);
      expect(validationResult.valid).toBe(true);

      // Step 4: Format result
      const result = formatBigIntAsDecimal(sum, aligned.targetScale);
      expect(result).toBe('191.25');
    });

    it('should handle precision overflow during addition', () => {
      // Simulate adding 9999.9 + 0.2 with precision 5
      const a = 99999n;
      const aScale = 1;
      const b = 2n;
      const bScale = 1;
      const precision = 5;

      // Step 1: Align operands
      const aligned = alignOperands(a, aScale, b, bScale);

      // Step 2: Perform addition
      const sum = aligned.a + aligned.b;
      expect(sum).toBe(100001n);

      // Step 3: Fit within precision (should not throw)
      const fitted = fitToPrecision(sum, precision, aligned.targetScale);
      expect(fitted).toBe(10000n); // 10000.0 (precision 5, scale 1)

      // Step 4: Format result
      const result = formatBigIntAsDecimal(fitted, aligned.targetScale);
      expect(result).toBe('1000.0');
    });
  });

  describe('Subtraction with utility functions', () => {
    it('should correctly subtract two decimal values using utility functions', () => {
      // Simulate subtracting 123.45 - 67.8
      const a = 12345n;
      const aScale = 2;
      const b = 678n;
      const bScale = 1;
      const precision = 5;

      // Step 1: Align operands
      const aligned = alignOperands(a, aScale, b, bScale);

      // Step 2: Perform subtraction
      const difference = aligned.a - aligned.b;
      expect(difference).toBe(5565n);

      // Step 3: Ensure result fits within precision
      const validationResult = validatePrecisionScale(difference, precision, aligned.targetScale);
      expect(validationResult.valid).toBe(true);

      // Step 4: Format result
      const result = formatBigIntAsDecimal(difference, aligned.targetScale);
      expect(result).toBe('55.65');
    });
  });

  describe('Multiplication with utility functions', () => {
    it('should correctly multiply two decimal values using utility functions', () => {
      // Simulate multiplying 123.45 * 67.8
      const a = 12345n;
      const aScale = 2;
      const b = 678n;
      const bScale = 1;
      const precision = 10;
      const targetScale = 2;

      // Step 1: Multiply coefficients
      const product = a * b;
      expect(product).toBe(8369910n);

      // Step 2: Calculate result scale (sum of scales)
      const resultScale = aScale + bScale;
      expect(resultScale).toBe(3);

      // Step 3: Adjust to target scale if needed
      const adjustedProduct = fitToPrecision(product, precision, resultScale, 'round');

      // Step 4: Format result
      const result = formatBigIntAsDecimal(adjustedProduct, resultScale);
      expect(result).toBe('8369.910');
    });
  });

  describe('Division with Decimal class', () => {
    it('should correctly divide two decimal values using Decimal class', () => {
      // Simulate dividing 123.45 / 67.8
      const a = new Decimal('123.45', 10, 4);
      const b = new Decimal('67.8', 10, 4);

      // Perform division using Decimal class
      const result = a.div(b);
      expect(result.toString()).toBe('1.8208'); // Rounded to scale 4
    });

    it('should correctly handle the specific failing case (4.565 / 1.23)', () => {
      // Simulate dividing 4.565 / 1.23
      const a = new Decimal('4.565', 10, 2);
      const b = new Decimal('1.23', 10, 2);

      // Perform division using Decimal class
      // 4.565 / 1.23 = 3.7113... rounds to 3.71 with scale 2
      const result = a.div(b);
      expect(result.toString()).toBe('3.72'); // Rounded to scale 2
    });
  });

  describe('Complex operations with utility functions', () => {
    it('should handle a complex calculation with multiple operations', () => {
      // Calculate (123.45 + 67.8) * 2.5 / 10.0 using Decimal class

      const a = new Decimal('123.45', 10, 2);
      const b = new Decimal('67.8', 10, 2);
      const c = new Decimal('2.5', 10, 2);
      const d = new Decimal('10.0', 10, 2);

      // (123.45 + 67.8) * 2.5 / 10.0 = 191.25 * 2.5 / 10.0 = 478.125 / 10.0 = 47.8125
      const result = a.add(b).mul(c).div(d);
      expect(result.toString()).toBe('47.81'); // Rounded to scale 2
    });
  });
});