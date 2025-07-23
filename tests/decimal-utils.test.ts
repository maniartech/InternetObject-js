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
  validatePrecisionScale
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
});