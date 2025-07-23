// decimal-utils.test.ts
import { 
  normalizeCoefficient, 
  getAbsoluteValue, 
  getSign, 
  scaleUp, 
  scaleDown, 
  roundHalfUp, 
  ceilRound, 
  floorRound, 
  formatBigIntAsDecimal,
  fitToPrecision,
  validatePrecisionScale,
  performLongDivision,
  alignOperands
} from '../src/core/decimal-utils';

describe('Decimal Utility Functions', () => {
  describe('formatBigIntAsDecimal', () => {
    // Zero coefficient tests
    it('should format zero coefficient correctly with various scales', () => {
      expect(formatBigIntAsDecimal(0n, 0)).toBe('0');
      expect(formatBigIntAsDecimal(0n, 1)).toBe('0.0');
      expect(formatBigIntAsDecimal(0n, 2)).toBe('0.00');
      expect(formatBigIntAsDecimal(0n, 5)).toBe('0.00000');
    });

    // Positive coefficient tests
    it('should format positive coefficients correctly', () => {
      expect(formatBigIntAsDecimal(12345n, 2)).toBe('123.45');
      expect(formatBigIntAsDecimal(12345n, 0)).toBe('12345');
      expect(formatBigIntAsDecimal(12345n, 5)).toBe('0.12345');
      expect(formatBigIntAsDecimal(12345n, 3)).toBe('12.345');
    });

    // Negative coefficient tests
    it('should format negative coefficients correctly', () => {
      expect(formatBigIntAsDecimal(-12345n, 2)).toBe('-123.45');
      expect(formatBigIntAsDecimal(-12345n, 0)).toBe('-12345');
      expect(formatBigIntAsDecimal(-12345n, 5)).toBe('-0.12345');
      expect(formatBigIntAsDecimal(-12345n, 3)).toBe('-12.345');
    });

    // Leading zeros tests
    it('should handle leading zeros correctly', () => {
      expect(formatBigIntAsDecimal(1n, 2)).toBe('0.01');
      expect(formatBigIntAsDecimal(10n, 2)).toBe('0.10');
      expect(formatBigIntAsDecimal(1n, 5)).toBe('0.00001');
    });

    // Precision validation tests
    it('should validate precision when provided', () => {
      expect(() => formatBigIntAsDecimal(12345n, 2, 4)).toThrow();
      expect(() => formatBigIntAsDecimal(12345n, 0, 4)).toThrow();
      expect(formatBigIntAsDecimal(12345n, 2, 5)).toBe('123.45');
      expect(formatBigIntAsDecimal(12345n, 5, 10)).toBe('0.12345');
    });

    // Very large coefficient tests
    it('should handle very large coefficients', () => {
      const largeCoefficient = 12345678901234567890n;
      expect(formatBigIntAsDecimal(largeCoefficient, 2)).toBe('123456789012345678.90');
      expect(formatBigIntAsDecimal(largeCoefficient, 0)).toBe('12345678901234567890');
      expect(formatBigIntAsDecimal(largeCoefficient, 20)).toBe('0.12345678901234567890');
    });

    // Boundary conditions tests
    it('should handle boundary conditions', () => {
      expect(formatBigIntAsDecimal(1n, 0)).toBe('1');
      expect(formatBigIntAsDecimal(-1n, 0)).toBe('-1');
      expect(formatBigIntAsDecimal(9n, 1)).toBe('0.9');
      expect(formatBigIntAsDecimal(9n, 0)).toBe('9');
    });

    // Significant digits validation tests
    it('should validate significant digits in formatted result', () => {
      // Integer part has 3 significant digits, fractional part has 2
      expect(() => formatBigIntAsDecimal(12345n, 2, 4)).toThrow();
      
      // Integer part is 0, fractional part has 5 significant digits (after removing leading zeros)
      expect(() => formatBigIntAsDecimal(12345n, 10, 4)).toThrow();
      
      // Integer part has 3 significant digits, fractional part has 2, total 5 which is within precision
      expect(formatBigIntAsDecimal(12345n, 2, 5)).toBe('123.45');
    });
  });

  describe('fitToPrecision', () => {
    // Basic functionality tests
    it('should return coefficient unchanged if it already fits within precision', () => {
      expect(fitToPrecision(12345n, 5, 2)).toBe(12345n);
      expect(fitToPrecision(12345n, 10, 2)).toBe(12345n);
      expect(fitToPrecision(0n, 5, 2)).toBe(0n);
    });

    // Rounding tests with different modes
    it('should round coefficients to fit precision using round-half-up by default', () => {
      // 123456 with precision 5 and scale 3 should round to 12346 (123.456 -> 123.46)
      expect(fitToPrecision(123456n, 5, 3)).toBe(12346n);
      
      // 123450 with precision 5 and scale 3 should round to 12345 (123.450 -> 123.45)
      expect(fitToPrecision(123450n, 5, 3)).toBe(12345n);
      
      // 123451 with precision 5 and scale 3 should round to 12345 (123.451 -> 123.45)
      expect(fitToPrecision(123451n, 5, 3)).toBe(12345n);
      
      // 123449 with precision 5 and scale 3 should round to 12345 (123.449 -> 123.45)
      expect(fitToPrecision(123449n, 5, 3)).toBe(12345n);
    });

    it('should use ceiling rounding when specified', () => {
      // 123456 with precision 5 and scale 3 should ceil to 12346 (123.456 -> 123.46)
      expect(fitToPrecision(123456n, 5, 3, 'ceil')).toBe(12346n);
      
      // 123450 with precision 5 and scale 3 should ceil to 12345 (123.450 -> 123.45)
      expect(fitToPrecision(123450n, 5, 3, 'ceil')).toBe(12345n);
      
      // 123451 with precision 5 and scale 3 should ceil to 12346 (123.451 -> 123.46)
      expect(fitToPrecision(123451n, 5, 3, 'ceil')).toBe(12346n);
    });

    it('should use floor rounding when specified', () => {
      // 123456 with precision 5 and scale 3 should floor to 12345 (123.456 -> 123.45)
      expect(fitToPrecision(123456n, 5, 3, 'floor')).toBe(12345n);
      
      // 123450 with precision 5 and scale 3 should floor to 12345 (123.450 -> 123.45)
      expect(fitToPrecision(123450n, 5, 3, 'floor')).toBe(12345n);
      
      // 123451 with precision 5 and scale 3 should floor to 12345 (123.451 -> 123.45)
      expect(fitToPrecision(123451n, 5, 3, 'floor')).toBe(12345n);
    });

    // Negative coefficient tests
    it('should handle negative coefficients correctly', () => {
      // -123456 with precision 5 and scale 3 should round to -12346 (-123.456 -> -123.46)
      expect(fitToPrecision(-123456n, 5, 3)).toBe(-12346n);
      
      // -123450 with precision 5 and scale 3 should round to -12345 (-123.450 -> -123.45)
      expect(fitToPrecision(-123450n, 5, 3)).toBe(-12345n);
      
      // Test ceiling with negative numbers
      expect(fitToPrecision(-123456n, 5, 3, 'ceil')).toBe(-12345n);
      
      // Test floor with negative numbers
      expect(fitToPrecision(-123451n, 5, 3, 'floor')).toBe(-12346n);
    });

    // Edge cases
    it('should handle edge cases correctly', () => {
      // Exactly fitting precision
      expect(fitToPrecision(12345n, 5, 2)).toBe(12345n);
      
      // Zero coefficient
      expect(fitToPrecision(0n, 5, 2)).toBe(0n);
      
      // Overflow by one digit with rounding that causes carry
      expect(fitToPrecision(9999n, 3, 1)).toBe(100n);
      
      // Maximum precision boundaries
      const largeCoeff = 10n ** 100n - 1n; // 100 9's
      expect(() => fitToPrecision(largeCoeff, 99, 0)).toThrow();
    });

    // Error cases
    it('should throw error when coefficient cannot fit within precision', () => {
      // 123456 with precision 4 and scale 2 would lose integer digits
      // The coefficient 123456 has 6 digits, with scale 2 means 1234.56
      // To fit in precision 4, we need to remove 2 digits, but scale is only 2
      // This would affect the integer part, so it should throw
      expect(() => fitToPrecision(1234567n, 4, 2)).toThrow();
      
      // Very large coefficient that can't be fitted
      const veryLargeCoeff = 10n ** 20n;
      expect(() => fitToPrecision(veryLargeCoeff, 10, 5)).toThrow();
    });

    // Underflow scenarios
    it('should handle underflow scenarios correctly', () => {
      // Coefficient with scale larger than precision
      expect(fitToPrecision(123n, 2, 3)).toBe(12n);
      
      // Coefficient with very small scale compared to precision
      expect(fitToPrecision(123456n, 10, 1)).toBe(123456n);
    });
  });

  describe('validatePrecisionScale', () => {
    // Basic validation tests
    it('should validate coefficients that fit within precision and scale', () => {
      expect(validatePrecisionScale(12345n, 5, 2).valid).toBe(true);
      expect(validatePrecisionScale(12345n, 10, 2).valid).toBe(true);
      expect(validatePrecisionScale(0n, 5, 2).valid).toBe(true);
    });

    // Invalid parameter tests
    it('should reject invalid precision and scale parameters', () => {
      expect(validatePrecisionScale(12345n, 0, 2).valid).toBe(false);
      expect(validatePrecisionScale(12345n, -1, 2).valid).toBe(false);
      expect(validatePrecisionScale(12345n, 5, -1).valid).toBe(false);
      expect(validatePrecisionScale(12345n, 5, 6).valid).toBe(false);
    });

    // Precision overflow tests
    it('should reject coefficients that exceed precision', () => {
      expect(validatePrecisionScale(123456n, 5, 2).valid).toBe(false);
      expect(validatePrecisionScale(123456n, 5, 5).valid).toBe(false);
      
      // Very large coefficient
      const veryLargeCoeff = 10n ** 20n;
      expect(validatePrecisionScale(veryLargeCoeff, 10, 5).valid).toBe(false);
    });

    // Edge cases
    it('should handle edge cases correctly', () => {
      // Exactly fitting precision
      expect(validatePrecisionScale(12345n, 5, 2).valid).toBe(true);
      
      // Zero coefficient (always valid)
      expect(validatePrecisionScale(0n, 5, 2).valid).toBe(true);
      expect(validatePrecisionScale(0n, 1, 0).valid).toBe(true);
      
      // Precision equals scale
      expect(validatePrecisionScale(12345n, 5, 5).valid).toBe(true);
      
      // Coefficient with leading zeros in fractional part
      expect(validatePrecisionScale(123n, 5, 5).valid).toBe(true);
    });

    // Negative coefficient tests
    it('should handle negative coefficients correctly', () => {
      expect(validatePrecisionScale(-12345n, 5, 2).valid).toBe(true);
      expect(validatePrecisionScale(-123456n, 5, 2).valid).toBe(false);
    });

    // Reason message tests
    it('should provide clear reason messages for invalid results', () => {
      const result1 = validatePrecisionScale(123456n, 5, 2);
      expect(result1.valid).toBe(false);
      expect(result1.reason).toContain('exceeding precision');
      
      const result2 = validatePrecisionScale(12345n, 5, 6);
      expect(result2.valid).toBe(false);
      expect(result2.reason).toContain('Scale must be less than or equal to precision');
      
      const result3 = validatePrecisionScale(12345n, 0, 0);
      expect(result3.valid).toBe(false);
      expect(result3.reason).toContain('Precision must be positive');
    });

    // Maximum precision boundaries
    it('should validate against maximum precision boundaries', () => {
      // 100 digits coefficient with 100 precision
      const largeCoeff = 10n ** 100n - 1n; // 100 9's
      expect(validatePrecisionScale(largeCoeff, 100, 0).valid).toBe(true);
      
      // 100 digits coefficient with 99 precision
      expect(validatePrecisionScale(largeCoeff, 99, 0).valid).toBe(false);
    });
  });
  
  describe('performLongDivision', () => {
    // Basic division tests
    it('should perform basic division correctly', () => {
      // 10 / 2 = 5
      const result1 = performLongDivision(10n, 2n, 0, 10);
      expect(result1.quotient).toBe(5n);
      expect(result1.remainder).toBe(0n);
      expect(result1.isExact).toBe(true);
      
      // 10 / 3 = 3.333... (with scale 3)
      const result2 = performLongDivision(10n, 3n, 3, 10);
      expect(result2.quotient).toBe(3333n);
      expect(result2.remainder).toBe(1n);
      expect(result2.isExact).toBe(false);
      
      // 4565 / 123 = 37.11... (with scale 2)
      const result3 = performLongDivision(4565n, 123n, 2, 10);
      expect(result3.quotient).toBe(3711n);
      expect(result3.isExact).toBe(false);
    });
    
    // Division with very small numbers
    it('should handle division with very small numbers', () => {
      // 1 / 1000 = 0.001 (with scale 3)
      const result = performLongDivision(1n, 1000n, 3, 10);
      expect(result.quotient).toBe(1n);
      expect(result.remainder).toBe(0n);
      expect(result.isExact).toBe(true);
      
      // 1 / 1000 = 0.001 (with scale 4)
      const result2 = performLongDivision(1n, 1000n, 4, 10);
      expect(result2.quotient).toBe(10n);
      expect(result2.remainder).toBe(0n);
      expect(result2.isExact).toBe(true);
    });
    
    // Division with repeating decimals
    it('should handle repeating decimals', () => {
      // 1 / 3 = 0.333... (with scale 10)
      const result = performLongDivision(1n, 3n, 10, 15);
      expect(result.quotient).toBe(3333333333n);
      expect(result.isExact).toBe(false);
      expect(result.repeatingDigits).toBe('3');
      
      // 1 / 6 = 0.166... (with scale 10)
      const result2 = performLongDivision(1n, 6n, 10, 15);
      expect(result2.quotient).toBe(1666666666n); // Truncated, not rounded
      expect(result2.isExact).toBe(false);
      expect(result2.repeatingDigits).toBe('6');
    });
    
    // Precision overflow tests
    it('should handle precision overflow', () => {
      // 1 / 3 with scale 10 but precision 5
      const result = performLongDivision(1n, 3n, 5, 5);
      expect(result.quotient.toString().length).toBeLessThanOrEqual(5);
      expect(result.isExact).toBe(false);
    });
    
    // Edge cases
    it('should handle edge cases correctly', () => {
      // Division by 1
      const result1 = performLongDivision(123n, 1n, 2, 10);
      expect(result1.quotient).toBe(12300n);
      expect(result1.isExact).toBe(true);
      
      // Zero dividend
      const result2 = performLongDivision(0n, 123n, 2, 10);
      expect(result2.quotient).toBe(0n);
      expect(result2.isExact).toBe(true);
      
      // Negative numbers
      const result3 = performLongDivision(-10n, 2n, 0, 10);
      expect(result3.quotient).toBe(-5n);
      expect(result3.isExact).toBe(true);
      
      const result4 = performLongDivision(10n, -2n, 0, 10);
      expect(result4.quotient).toBe(-5n);
      expect(result4.isExact).toBe(true);
      
      const result5 = performLongDivision(-10n, -2n, 0, 10);
      expect(result5.quotient).toBe(5n);
      expect(result5.isExact).toBe(true);
    });
    
    // Error cases
    it('should throw errors for invalid inputs', () => {
      // Division by zero
      expect(() => performLongDivision(10n, 0n, 2, 10)).toThrow('Division by zero');
      
      // Invalid precision
      expect(() => performLongDivision(10n, 2n, 2, 0)).toThrow('Precision must be positive');
      
      // Invalid scale
      expect(() => performLongDivision(10n, 2n, -1, 10)).toThrow('Scale must be non-negative');
      
      // Scale > precision
      expect(() => performLongDivision(10n, 2n, 10, 5)).toThrow('Scale must be less than or equal to precision');
    });
    
    // Very large dividend/divisor combinations
    it('should handle very large dividend/divisor combinations', () => {
      const largeDividend = 10n ** 50n + 1n;
      const largeDivisor = 10n ** 25n + 1n;
      
      const result = performLongDivision(largeDividend, largeDivisor, 10, 50);
      expect(result.quotient.toString().length).toBeLessThanOrEqual(50);
      
      // Verify result is approximately 10^25
      const quotientStr = result.quotient.toString();
      expect(quotientStr.length - 10).toBeCloseTo(25, -1); // Allow some margin due to rounding
    });
    
    // Test the specific failing case from the task description
    it('should correctly handle the specific failing case (4.565 / 1.23)', () => {
      // 4.565 / 1.23 should equal 3.71
      // With scale 2, we're working with 456.5 / 123 = 371.1...
      const result = performLongDivision(4565n, 123n, 2, 10);
      expect(result.quotient).toBe(3711n);
    });
  });
  
  describe('alignOperands', () => {
    // Basic alignment tests
    it('should align operands with different scales', () => {
      // 123.45 and 67.8 -> 123.45 and 67.80
      const result = alignOperands(12345n, 2, 678n, 1);
      expect(result.a).toBe(12345n);
      expect(result.b).toBe(6780n);
      expect(result.targetScale).toBe(2);
      expect(result.scaleAdjustment).toBe(1);
      
      // 123.4 and 67.89 -> 1234.0 and 678.9
      const result2 = alignOperands(1234n, 1, 6789n, 2);
      expect(result2.a).toBe(12340n);
      expect(result2.b).toBe(6789n);
      expect(result2.targetScale).toBe(2);
      expect(result2.scaleAdjustment).toBe(1);
    });
    
    // Zero operand tests
    it('should handle zero operands correctly', () => {
      // 0 and 67.8 -> 0 and 67.8
      const result = alignOperands(0n, 2, 678n, 1);
      expect(result.a).toBe(0n);
      expect(result.b).toBe(678n);
      expect(result.targetScale).toBe(1);
      
      // 123.45 and 0 -> 123.45 and 0
      const result2 = alignOperands(12345n, 2, 0n, 1);
      expect(result2.a).toBe(12345n);
      expect(result2.b).toBe(0n);
      expect(result2.targetScale).toBe(2);
    });
    
    // Maximum scale tests
    it('should respect maximum scale constraint', () => {
      // 123.456 and 67.89 with maxScale 2 -> 123.46 and 67.89
      const result = alignOperands(123456n, 3, 6789n, 2, 2);
      expect(result.a).toBe(12346n); // Truncated from 123.456 to 123.46
      expect(result.b).toBe(6789n);
      expect(result.targetScale).toBe(2);
      
      // 123.4 and 67.89 with maxScale 1 -> 123.4 and 67.9
      const result2 = alignOperands(1234n, 1, 6789n, 2, 1);
      expect(result2.a).toBe(1234n);
      expect(result2.b).toBe(679n); // Truncated from 67.89 to 67.9
      expect(result2.targetScale).toBe(1);
    });
    
    // Extreme scale differences
    it('should handle extreme scale differences', () => {
      // 1.23 and 4.56789 -> 1.23000 and 4.56789
      const result = alignOperands(123n, 2, 456789n, 5);
      expect(result.a).toBe(123000n);
      expect(result.b).toBe(456789n);
      expect(result.targetScale).toBe(5);
      expect(result.scaleAdjustment).toBe(3);
    });
    
    // Negative number tests
    it('should handle negative numbers correctly', () => {
      // -123.45 and 67.8 -> -123.45 and 67.80
      const result = alignOperands(-12345n, 2, 678n, 1);
      expect(result.a).toBe(-12345n);
      expect(result.b).toBe(6780n);
      expect(result.targetScale).toBe(2);
      
      // 123.45 and -67.8 -> 123.45 and -67.80
      const result2 = alignOperands(12345n, 2, -678n, 1);
      expect(result2.a).toBe(12345n);
      expect(result2.b).toBe(-6780n);
      expect(result2.targetScale).toBe(2);
    });
    
    // Very large coefficient tests
    it('should handle very large coefficients', () => {
      const largeCoeff1 = 10n ** 20n;
      const largeCoeff2 = 10n ** 15n;
      
      const result = alignOperands(largeCoeff1, 10, largeCoeff2, 5);
      expect(result.a).toBe(largeCoeff1);
      expect(result.b).toBe(largeCoeff2 * 10n ** 5n);
      expect(result.targetScale).toBe(10);
    });
  });
});