// decimal-utils.test.ts
import {
  scaleUp,
  scaleDown,
  roundHalfUp,
  ceilRound,
  floorRound,
  formatBigIntAsDecimal,
  fitToPrecision,
  validatePrecisionScale,
  alignOperands,
} from '../../../../src/core/decimal-utils';

describe('Decimal Utility Functions', () => {
  describe('scaleUp and scaleDown', () => {
    it('should scale up correctly', () => {
      expect(scaleUp(123n, 2)).toBe(12300n);
      expect(scaleUp(0n, 5)).toBe(0n);
      expect(scaleUp(-123n, 2)).toBe(-12300n);
    });

    it('should handle scale factor of zero in scaleUp', () => {
      expect(scaleUp(123n, 0)).toBe(123n);
    });

    it('should throw error for negative scale factor in scaleUp', () => {
      expect(() => scaleUp(123n, -1)).toThrow('Scale factor must be non-negative');
    });

    it('should scale down correctly', () => {
      expect(scaleDown(12345n, 2)).toBe(123n);
      expect(scaleDown(0n, 5)).toBe(0n);
      expect(scaleDown(-12345n, 2)).toBe(-123n);
    });

    it('should handle scale factor of zero in scaleDown', () => {
      expect(scaleDown(123n, 0)).toBe(123n);
    });

    it('should throw error for negative scale factor in scaleDown', () => {
      expect(() => scaleDown(123n, -1)).toThrow('Scale factor must be non-negative');
    });

    it('should handle truncation in scaleDown', () => {
      expect(scaleDown(127n, 1)).toBe(12n); // 12.7 -> 12
      expect(scaleDown(-127n, 1)).toBe(-12n); // -12.7 -> -12
    });

    it('should handle very large scale factors', () => {
      const largeCoeff = 10n ** 20n;
      expect(scaleUp(1n, 20)).toBe(largeCoeff);
      expect(scaleDown(largeCoeff, 20)).toBe(1n);
    });
  });

  describe('roundHalfUp, ceilRound, floorRound', () => {
    // Additional tests for exact midpoint cases
    it('should handle exact midpoint cases in roundHalfUp', () => {
      // 12.5 -> 13
      expect(roundHalfUp(125n, 1, 0)).toBe(13n);
      // -12.5 -> -12 (round towards zero for negative numbers)
      expect(roundHalfUp(-125n, 1, 0)).toBe(-13n);
    });

    it('should handle exact midpoint cases in ceilRound', () => {
      // 12.5 -> 13
      expect(ceilRound(125n, 1, 0)).toBe(13n);
      // -12.5 -> -12 (ceiling for negative is towards zero)
      expect(ceilRound(-125n, 1, 0)).toBe(-12n);
    });

    it('should handle exact midpoint cases in floorRound', () => {
      // 12.5 -> 12
      expect(floorRound(125n, 1, 0)).toBe(12n);
      // -12.5 -> -13 (floor for negative is away from zero)
      expect(floorRound(-125n, 1, 0)).toBe(-13n);
    });

    it('should handle scaling up in all rounding functions', () => {
      expect(roundHalfUp(123n, 0, 2)).toBe(12300n);
      expect(ceilRound(123n, 0, 2)).toBe(12300n);
      expect(floorRound(123n, 0, 2)).toBe(12300n);
    });

    it('should throw errors for negative scales in all rounding functions', () => {
      expect(() => roundHalfUp(123n, -1, 0)).toThrow('Scales must be non-negative');
      expect(() => roundHalfUp(123n, 0, -1)).toThrow('Scales must be non-negative');
      expect(() => ceilRound(123n, -1, 0)).toThrow('Scales must be non-negative');
      expect(() => ceilRound(123n, 0, -1)).toThrow('Scales must be non-negative');
      expect(() => floorRound(123n, -1, 0)).toThrow('Scales must be non-negative');
      expect(() => floorRound(123n, 0, -1)).toThrow('Scales must be non-negative');
    });
  });
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

    // Test for cases where both operands need scaling
    it('should handle cases where both operands need scaling', () => {
      // 123.45 and 67.89 with maxScale 1 -> 123.5 and 67.9
      const result = alignOperands(12345n, 2, 6789n, 2, 1);
      expect(result.a).toBe(1235n); // Rounded from 123.45 to 123.5
      expect(result.b).toBe(679n);  // Rounded from 67.89 to 67.9
      expect(result.targetScale).toBe(1);

      // Test with different rounding modes
      const resultCeil = alignOperands(12345n, 2, 6789n, 2, 1, 'ceil');
      expect(resultCeil.a).toBe(1235n); // Ceiling from 123.45 to 123.5
      expect(resultCeil.b).toBe(679n);  // Ceiling from 67.89 to 67.9

      const resultFloor = alignOperands(12345n, 2, 6789n, 2, 1, 'floor');
      expect(resultFloor.a).toBe(1234n); // Floor from 123.45 to 123.4
      expect(resultFloor.b).toBe(678n);  // Floor from 67.89 to 67.8
    });

    // Test for alignment with precision limits
    it('should handle alignment with precision limits', () => {
      // Very large coefficients that might approach precision limits
      const largeCoeff1 = 10n ** 15n - 1n; // 999...999 (15 digits)
      const largeCoeff2 = 10n ** 10n - 1n; // 999...999 (10 digits)

      const result = alignOperands(largeCoeff1, 5, largeCoeff2, 3);
      expect(result.a).toBe(largeCoeff1);
      expect(result.b).toBe(largeCoeff2 * 100n); // Scaled up by 2 decimal places
      expect(result.targetScale).toBe(5);
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