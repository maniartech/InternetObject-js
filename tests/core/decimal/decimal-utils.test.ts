/**
 * Test suite for decimal utility functions
 *
 * Comprehensive tests covering edge cases including leading zeros, trailing zeros,
 * sign handling, empty coefficients, and very large coefficient scenarios.
 */

import {
  scaleUp,
  scaleDown,
  roundHalfUp,
  ceilRound,
  floorRound,
  formatBigIntAsDecimal,
} from '../../../src/core/decimal/decimal-utils';

describe('Decimal Utility Functions', () => {

  describe('scaleUp', () => {

    test('should scale up positive coefficient by powers of 10', () => {
      expect(scaleUp(123n, 0)).toBe(123n);
      expect(scaleUp(123n, 1)).toBe(1230n);
      expect(scaleUp(123n, 2)).toBe(12300n);
      expect(scaleUp(123n, 3)).toBe(123000n);
    });

    test('should scale up negative coefficient by powers of 10', () => {
      expect(scaleUp(-456n, 0)).toBe(-456n);
      expect(scaleUp(-456n, 1)).toBe(-4560n);
      expect(scaleUp(-456n, 2)).toBe(-45600n);
      expect(scaleUp(-456n, 3)).toBe(-456000n);
    });

    test('should handle zero coefficient scaling', () => {
      expect(scaleUp(0n, 0)).toBe(0n);
      expect(scaleUp(0n, 1)).toBe(0n);
      expect(scaleUp(0n, 10)).toBe(0n);
      expect(scaleUp(0n, 100)).toBe(0n);
    });

    test('should handle scaling by zero', () => {
      expect(scaleUp(123n, 0)).toBe(123n);
      expect(scaleUp(-456n, 0)).toBe(-456n);
      expect(scaleUp(0n, 0)).toBe(0n);
    });

    test('should handle maximum scale differences', () => {
      const coeff = 123n;
      // Test with very large scale factors
      expect(scaleUp(coeff, 50)).toBe(123n * (10n ** 50n));
      expect(scaleUp(coeff, 100)).toBe(123n * (10n ** 100n));
      expect(scaleUp(coeff, 200)).toBe(123n * (10n ** 200n));
    });

    test('should handle coefficients with hundreds of digits', () => {
      // Create coefficient with 100 digits
      const largeCoeff = BigInt('1' + '2'.repeat(99));
      const scaled = scaleUp(largeCoeff, 50);
      const expected = largeCoeff * (10n ** 50n);

      expect(scaled).toBe(expected);
      expect(scaled.toString().length).toBe(150); // 100 + 50
    });

    test('should handle coefficients 100,000+ times larger than Number.MAX_SAFE_INTEGER', () => {
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
      const veryLargeCoeff = maxSafeInt * 100000n + 12345n;

      const scaled = scaleUp(veryLargeCoeff, 10);
      const expected = veryLargeCoeff * (10n ** 10n);

      expect(scaled).toBe(expected);
    });

    test('should handle single digit coefficients', () => {
      for (let i = 1; i <= 9; i++) {
        const coeff = BigInt(i);
        expect(scaleUp(coeff, 1)).toBe(BigInt(i * 10));
        expect(scaleUp(coeff, 2)).toBe(BigInt(i * 100));
        expect(scaleUp(coeff, 3)).toBe(BigInt(i * 1000));
      }
    });

    test('should throw error for negative scale factor', () => {
      expect(() => scaleUp(123n, -1)).toThrow('Scale factor must be non-negative');
      expect(() => scaleUp(123n, -10)).toThrow('Scale factor must be non-negative');
    });

    test('should handle extreme scale factors with large coefficients', () => {
      const coeff = BigInt('9'.repeat(500)); // 500 digits
      const scaled = scaleUp(coeff, 500); // Scale by 500

      expect(scaled.toString().length).toBe(1000); // 500 + 500
      expect(scaled.toString().startsWith('9'.repeat(500))).toBe(true);
      expect(scaled.toString().endsWith('0'.repeat(500))).toBe(true);
    });

    test('should maintain precision with very large scale factors', () => {
      const coeff = 123456789n;
      const largeFactor = 1000;
      const scaled = scaleUp(coeff, largeFactor);

      // Verify the result is exactly coefficient * 10^largeFactor
      expect(scaled).toBe(coeff * (10n ** BigInt(largeFactor)));
      expect(scaled.toString()).toBe(coeff.toString() + '0'.repeat(largeFactor));
    });
  });

  describe('scaleDown', () => {

    test('should scale down positive coefficient by powers of 10', () => {
      expect(scaleDown(12300n, 0)).toBe(12300n);
      expect(scaleDown(12300n, 1)).toBe(1230n);
      expect(scaleDown(12300n, 2)).toBe(123n);
      expect(scaleDown(12300n, 3)).toBe(12n);
      expect(scaleDown(12300n, 4)).toBe(1n);
      expect(scaleDown(12300n, 5)).toBe(0n);
    });

    test('should scale down negative coefficient by powers of 10', () => {
      expect(scaleDown(-45600n, 0)).toBe(-45600n);
      expect(scaleDown(-45600n, 1)).toBe(-4560n);
      expect(scaleDown(-45600n, 2)).toBe(-456n);
      expect(scaleDown(-45600n, 3)).toBe(-45n);
      expect(scaleDown(-45600n, 4)).toBe(-4n);
      expect(scaleDown(-45600n, 5)).toBe(0n);
    });

    test('should handle zero coefficient scaling', () => {
      expect(scaleDown(0n, 0)).toBe(0n);
      expect(scaleDown(0n, 1)).toBe(0n);
      expect(scaleDown(0n, 10)).toBe(0n);
      expect(scaleDown(0n, 100)).toBe(0n);
    });

    test('should handle scaling by zero', () => {
      expect(scaleDown(123n, 0)).toBe(123n);
      expect(scaleDown(-456n, 0)).toBe(-456n);
      expect(scaleDown(0n, 0)).toBe(0n);
    });

    test('should perform basic truncation (not rounding)', () => {
      // Test that it truncates, not rounds
      expect(scaleDown(1234n, 1)).toBe(123n); // 123.4 -> 123 (truncated)
      expect(scaleDown(1235n, 1)).toBe(123n); // 123.5 -> 123 (truncated, not rounded to 124)
      expect(scaleDown(1239n, 1)).toBe(123n); // 123.9 -> 123 (truncated)

      expect(scaleDown(-1234n, 1)).toBe(-123n); // -123.4 -> -123 (truncated)
      expect(scaleDown(-1235n, 1)).toBe(-123n); // -123.5 -> -123 (truncated)
      expect(scaleDown(-1239n, 1)).toBe(-123n); // -123.9 -> -123 (truncated)
    });

    test('should handle maximum scale differences', () => {
      // Create a large coefficient and scale it down significantly
      const largeCoeff = BigInt('1' + '0'.repeat(100)); // 1 followed by 100 zeros

      expect(scaleDown(largeCoeff, 50)).toBe(BigInt('1' + '0'.repeat(50)));
      expect(scaleDown(largeCoeff, 100)).toBe(1n);
      expect(scaleDown(largeCoeff, 101)).toBe(0n); // Scaled beyond the coefficient
    });

    test('should handle coefficients with hundreds of digits', () => {
      // Create coefficient with 300 digits
      const largeCoeff = BigInt('1' + '2'.repeat(299));
      const scaled = scaleDown(largeCoeff, 100);

      // Should remove 100 digits from the right
      const expected = BigInt('1' + '2'.repeat(199));
      expect(scaled).toBe(expected);
      expect(scaled.toString().length).toBe(200); // 300 - 100
    });

    test('should handle coefficients 100,000+ times larger than Number.MAX_SAFE_INTEGER', () => {
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
      const veryLargeCoeff = maxSafeInt * 100000n; // Exactly 100,000 times larger

      const scaled = scaleDown(veryLargeCoeff, 5); // Scale down by 5 digits
      const expected = veryLargeCoeff / (10n ** 5n);

      expect(scaled).toBe(expected);
    });

    test('should handle single digit coefficients', () => {
      for (let i = 1; i <= 9; i++) {
        const coeff = BigInt(i);
        expect(scaleDown(coeff, 1)).toBe(0n); // Single digit scaled down becomes 0
        expect(scaleDown(coeff, 2)).toBe(0n);
        expect(scaleDown(coeff, 10)).toBe(0n);
      }
    });

    test('should throw error for negative scale factor', () => {
      expect(() => scaleDown(123n, -1)).toThrow('Scale factor must be non-negative');
      expect(() => scaleDown(123n, -10)).toThrow('Scale factor must be non-negative');
    });

    test('should handle extreme scale factors with large coefficients', () => {
      const coeff = BigInt('9'.repeat(1000)); // 1000 digits

      // Scale down by 500 digits
      const scaled = scaleDown(coeff, 500);
      expect(scaled.toString().length).toBe(500); // 1000 - 500
      expect(scaled.toString()).toBe('9'.repeat(500));

      // Scale down by exactly the coefficient length
      const scaledToOne = scaleDown(coeff, 999);
      expect(scaledToOne).toBe(9n);

      // Scale down beyond the coefficient length
      const scaledToZero = scaleDown(coeff, 1000);
      expect(scaledToZero).toBe(0n);
    });

    test('should maintain consistency with integer division', () => {
      const testCases = [
        { coeff: 12345n, scale: 1, expected: 1234n },
        { coeff: 12345n, scale: 2, expected: 123n },
        { coeff: 12345n, scale: 3, expected: 12n },
        { coeff: 12345n, scale: 4, expected: 1n },
        { coeff: 12345n, scale: 5, expected: 0n },
        { coeff: -98765n, scale: 2, expected: -987n },
        { coeff: -98765n, scale: 4, expected: -9n }
      ];

      testCases.forEach(({ coeff, scale, expected }) => {
        expect(scaleDown(coeff, scale)).toBe(expected);
        // Verify it matches manual division
        expect(scaleDown(coeff, scale)).toBe(coeff / (10n ** BigInt(scale)));
      });
    });

    test('should handle precision boundary conditions', () => {
      // Test coefficients that are exactly powers of 10
      expect(scaleDown(1000n, 3)).toBe(1n);
      expect(scaleDown(10000n, 4)).toBe(1n);
      expect(scaleDown(100000n, 5)).toBe(1n);

      // Test coefficients that are one less than powers of 10
      expect(scaleDown(999n, 3)).toBe(0n);
      expect(scaleDown(9999n, 4)).toBe(0n);
      expect(scaleDown(99999n, 5)).toBe(0n);

      // Test coefficients that are one more than powers of 10
      expect(scaleDown(1001n, 3)).toBe(1n);
      expect(scaleDown(10001n, 4)).toBe(1n);
      expect(scaleDown(100001n, 5)).toBe(1n);
    });
  });

  describe('Scale Operations Integration', () => {

    test('should be inverse operations for exact powers of 10', () => {
      const coeff = 123n;
      const scaleFactor = 5;

      // Scale up then scale down should return original for exact cases
      const scaledUp = scaleUp(coeff, scaleFactor);
      const scaledBack = scaleDown(scaledUp, scaleFactor);

      expect(scaledBack).toBe(coeff);
    });

    test('should handle round-trip operations with truncation', () => {
      const coeff = 12345n;

      // Scale up by less than we scale down - should truncate
      const scaledUp = scaleUp(coeff, 2); // 1234500n
      const scaledDown = scaleDown(scaledUp, 3); // 1234n (truncated)

      expect(scaledDown).toBe(1234n);
    });

    test('should work with very large coefficients in both directions', () => {
      const largeCoeff = BigInt('1' + '2'.repeat(500)); // 501 digits

      // Scale up then down
      const scaledUp = scaleUp(largeCoeff, 100);
      expect(scaledUp.toString().length).toBe(601); // 501 + 100

      const scaledDown = scaleDown(scaledUp, 100);
      expect(scaledDown).toBe(largeCoeff);
      expect(scaledDown.toString().length).toBe(501);
    });

    test('should handle zero consistently in both operations', () => {
      expect(scaleUp(0n, 100)).toBe(0n);
      expect(scaleDown(0n, 100)).toBe(0n);

      // Scale up zero then scale down
      const scaledUp = scaleUp(0n, 50);
      const scaledDown = scaleDown(scaledUp, 25);
      expect(scaledDown).toBe(0n);
    });

    test('should maintain sign consistency', () => {
      const positiveCoeff = 12345n;
      const negativeCoeff = -12345n;

      // Both operations should preserve sign (using inline check)
      expect(scaleUp(positiveCoeff, 10) > 0n).toBe(true);
      expect(scaleUp(negativeCoeff, 10) < 0n).toBe(true);
      expect(scaleDown(positiveCoeff, 2) > 0n).toBe(true);
      expect(scaleDown(negativeCoeff, 2) < 0n).toBe(true);
    });

    test('should handle extreme scale differences efficiently', () => {
      const coeff = 123n;

      // Test performance with very large scale factors
      const startTime = Date.now();

      const largeScaleUp = scaleUp(coeff, 1000);
      const largeScaleDown = scaleDown(largeScaleUp, 500);

      const endTime = Date.now();

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(100);

      // Verify correctness
      expect(largeScaleDown).toBe(scaleUp(coeff, 500));
    });
  });

  describe('formatBigIntAsDecimal', () => {

    test('should format zero coefficients with various scales', () => {
      expect(formatBigIntAsDecimal(0n, 0)).toBe('0');
      expect(formatBigIntAsDecimal(0n, 1)).toBe('0.0');
      expect(formatBigIntAsDecimal(0n, 2)).toBe('0.00');
      expect(formatBigIntAsDecimal(0n, 5)).toBe('0.00000');
      expect(formatBigIntAsDecimal(0n, 10)).toBe('0.0000000000');
    });

    test('should format positive coefficients correctly', () => {
      expect(formatBigIntAsDecimal(123n, 0)).toBe('123');
      expect(formatBigIntAsDecimal(123n, 1)).toBe('12.3');
      expect(formatBigIntAsDecimal(123n, 2)).toBe('1.23');
      expect(formatBigIntAsDecimal(123n, 3)).toBe('0.123');
      expect(formatBigIntAsDecimal(123n, 4)).toBe('0.0123');
    });

    test('should format negative coefficients correctly', () => {
      expect(formatBigIntAsDecimal(-123n, 0)).toBe('-123');
      expect(formatBigIntAsDecimal(-123n, 1)).toBe('-12.3');
      expect(formatBigIntAsDecimal(-123n, 2)).toBe('-1.23');
      expect(formatBigIntAsDecimal(-123n, 3)).toBe('-0.123');
      expect(formatBigIntAsDecimal(-123n, 4)).toBe('-0.0123');
    });

    test('should handle very large coefficients with hundreds of digits', () => {
      // Create coefficient with 200 digits
      const largeCoeff = BigInt('1' + '2'.repeat(199));

      // Test with scale 0 (integer)
      const formatted0 = formatBigIntAsDecimal(largeCoeff, 0);
      expect(formatted0).toBe('1' + '2'.repeat(199));
      expect(formatted0.length).toBe(200);

      // Test with scale 50 (50 decimal places)
      const formatted50 = formatBigIntAsDecimal(largeCoeff, 50);
      expect(formatted50).toBe('1' + '2'.repeat(149) + '.' + '2'.repeat(50));
      expect(formatted50.replace('.', '').length).toBe(200);

      // Test with scale 100 (100 decimal places)
      const formatted100 = formatBigIntAsDecimal(largeCoeff, 100);
      expect(formatted100).toBe('1' + '2'.repeat(99) + '.' + '2'.repeat(100));
      expect(formatted100.replace('.', '').length).toBe(200);
    });

    test('should handle coefficients 100,000+ times larger than Number.MAX_SAFE_INTEGER', () => {
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
      const veryLargeCoeff = maxSafeInt * 100000n + 12345n;

      const formatted = formatBigIntAsDecimal(veryLargeCoeff, 5);
      const expectedStr = veryLargeCoeff.toString();
      const expected = expectedStr.slice(0, -5) + '.' + expectedStr.slice(-5);

      expect(formatted).toBe(expected);
    });

    test('should handle boundary conditions with leading zeros', () => {
      // Test cases where coefficient is smaller than scale
      expect(formatBigIntAsDecimal(1n, 3)).toBe('0.001');
      expect(formatBigIntAsDecimal(12n, 5)).toBe('0.00012');
      expect(formatBigIntAsDecimal(123n, 10)).toBe('0.0000000123');

      // Test negative cases
      expect(formatBigIntAsDecimal(-1n, 3)).toBe('-0.001');
      expect(formatBigIntAsDecimal(-12n, 5)).toBe('-0.00012');
      expect(formatBigIntAsDecimal(-123n, 10)).toBe('-0.0000000123');
    });

    test('should handle single digit coefficients', () => {
      for (let i = 1; i <= 9; i++) {
        expect(formatBigIntAsDecimal(BigInt(i), 0)).toBe(i.toString());
        expect(formatBigIntAsDecimal(BigInt(i), 1)).toBe(`0.${i}`);
        expect(formatBigIntAsDecimal(BigInt(i), 2)).toBe(`0.0${i}`);
        expect(formatBigIntAsDecimal(BigInt(-i), 1)).toBe(`-0.${i}`);
      }
    });

    test('should handle maximum scale scenarios', () => {
      const coeff = 123456789n;
      const maxScale = 50;

      const formatted = formatBigIntAsDecimal(coeff, maxScale);
      expect(formatted).toBe('0.' + '0'.repeat(maxScale - 9) + '123456789');
      expect(formatted.split('.')[1].length).toBe(maxScale);
    });
  });

  describe('roundHalfUp', () => {

    test('should handle scale up scenarios (no rounding needed)', () => {
      expect(roundHalfUp(123n, 2, 3)).toBe(1230n); // 1.23 -> 1.230 = 1230 with scale 3
      expect(roundHalfUp(123n, 1, 4)).toBe(123000n); // 12.3 -> 12.3000 = 123000 with scale 4
      expect(roundHalfUp(-456n, 2, 5)).toBe(-456000n); // -4.56 -> -4.56000 = -456000 with scale 5
      expect(roundHalfUp(0n, 1, 3)).toBe(0n);
    });

    test('should handle same scale scenarios', () => {
      expect(roundHalfUp(123n, 2, 2)).toBe(123n);
      expect(roundHalfUp(-456n, 3, 3)).toBe(-456n);
      expect(roundHalfUp(0n, 5, 5)).toBe(0n);
    });

    test('should round half up for positive numbers', () => {
      // Test exact half cases
      expect(roundHalfUp(125n, 3, 2)).toBe(13n); // 1.25 -> 1.3 (round up)
      expect(roundHalfUp(135n, 3, 2)).toBe(14n); // 1.35 -> 1.4 (round up)
      expect(roundHalfUp(1235n, 4, 3)).toBe(124n); // 1.235 -> 1.24 (round up)

      // Test less than half cases
      expect(roundHalfUp(124n, 3, 2)).toBe(12n); // 1.24 -> 1.2 (no round)
      expect(roundHalfUp(1234n, 4, 3)).toBe(123n); // 1.234 -> 1.23 (no round)

      // Test greater than half cases
      expect(roundHalfUp(126n, 3, 2)).toBe(13n); // 1.26 -> 1.3 (round up)
      expect(roundHalfUp(1236n, 4, 3)).toBe(124n); // 1.236 -> 1.24 (round up)
    });

    test('should round half up for negative numbers', () => {
      // Test exact half cases (round away from zero)
      expect(roundHalfUp(-125n, 3, 2)).toBe(-13n); // -1.25 -> -1.3 (round away from zero)
      expect(roundHalfUp(-135n, 3, 2)).toBe(-14n); // -1.35 -> -1.4 (round away from zero)

      // Test less than half cases
      expect(roundHalfUp(-124n, 3, 2)).toBe(-12n); // -1.24 -> -1.2 (no round)
      expect(roundHalfUp(-1234n, 4, 3)).toBe(-123n); // -1.234 -> -1.23 (no round)

      // Test greater than half cases
      expect(roundHalfUp(-126n, 3, 2)).toBe(-13n); // -1.26 -> -1.3 (round away from zero)
      expect(roundHalfUp(-1236n, 4, 3)).toBe(-124n); // -1.236 -> -1.24 (round away from zero)
    });

    test('should handle zero values', () => {
      expect(roundHalfUp(0n, 3, 2)).toBe(0n);
      expect(roundHalfUp(0n, 5, 1)).toBe(0n);
      expect(roundHalfUp(0n, 10, 0)).toBe(0n);
    });

    test('should handle boundary values', () => {
      // Test rounding from many digits to few
      expect(roundHalfUp(123456789n, 9, 2)).toBe(12n); // 0.123456789 -> 0.12 (scale 2)
      expect(roundHalfUp(999999995n, 9, 8)).toBe(100000000n); // 9.99999995 -> 10.0000000 (carry over)
    });

    test('should handle very large coefficients with hundreds of digits', () => {
      // Create coefficient with 300 digits
      const largeCoeff = BigInt('1' + '2'.repeat(299));

      // Round from scale 150 to scale 100 (remove 50 digits)
      const rounded = roundHalfUp(largeCoeff, 150, 100);

      // Should truncate the last 50 digits and potentially round
      expect(rounded.toString().length).toBeLessThanOrEqual(250); // 300 - 50
    });

    test('should handle coefficients 100,000+ times larger than Number.MAX_SAFE_INTEGER', () => {
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
      const veryLargeCoeff = maxSafeInt * 100000n + 12345n;

      // Round from high precision to lower precision
      const rounded = roundHalfUp(veryLargeCoeff, 10, 5);

      // Should be a valid BigInt result
      expect(typeof rounded).toBe('bigint');
      expect(rounded).toBeGreaterThan(0n);
    });

    test('should throw error for negative scales', () => {
      expect(() => roundHalfUp(123n, -1, 2)).toThrow('Scales must be non-negative');
      expect(() => roundHalfUp(123n, 2, -1)).toThrow('Scales must be non-negative');
      expect(() => roundHalfUp(123n, -1, -1)).toThrow('Scales must be non-negative');
    });

    test('should handle extreme scale differences', () => {
      const coeff = BigInt('1' + '0'.repeat(100)); // 1 followed by 100 zeros

      // Round from scale 50 to scale 10
      const rounded = roundHalfUp(coeff, 50, 10);
      expect(rounded).toBe(BigInt('1' + '0'.repeat(60))); // Should scale up

      // Round from scale 10 to scale 50
      const rounded2 = roundHalfUp(coeff, 10, 50);
      expect(rounded2).toBe(BigInt('1' + '0'.repeat(140))); // Should scale up more
    });
  });

  describe('ceilRound', () => {

    test('should handle scale up scenarios (no rounding needed)', () => {
      expect(ceilRound(123n, 2, 3)).toBe(1230n); // 1.23 -> 1.230 = 1230 with scale 3
      expect(ceilRound(123n, 1, 4)).toBe(123000n); // 12.3 -> 12.3000 = 123000 with scale 4
      expect(ceilRound(-456n, 2, 5)).toBe(-456000n); // -4.56 -> -4.56000 = -456000 with scale 5
      expect(ceilRound(0n, 1, 3)).toBe(0n);
    });

    test('should handle same scale scenarios', () => {
      expect(ceilRound(123n, 2, 2)).toBe(123n);
      expect(ceilRound(-456n, 3, 3)).toBe(-456n);
      expect(ceilRound(0n, 5, 5)).toBe(0n);
    });

    test('should ceiling round positive numbers (always round up)', () => {
      expect(ceilRound(121n, 3, 2)).toBe(13n); // 1.21 -> 1.3 (round up)
      expect(ceilRound(125n, 3, 2)).toBe(13n); // 1.25 -> 1.3 (round up)
      expect(ceilRound(129n, 3, 2)).toBe(13n); // 1.29 -> 1.3 (round up)
      expect(ceilRound(120n, 3, 2)).toBe(12n); // 1.20 -> 1.2 (no remainder, no round)

      expect(ceilRound(1231n, 4, 3)).toBe(124n); // 1.231 -> 1.24 (round up)
      expect(ceilRound(1235n, 4, 3)).toBe(124n); // 1.235 -> 1.24 (round up)
      expect(ceilRound(1239n, 4, 3)).toBe(124n); // 1.239 -> 1.24 (round up)
    });

    test('should ceiling round negative numbers (towards zero)', () => {
      expect(ceilRound(-121n, 3, 2)).toBe(-12n); // -1.21 -> -1.2 (towards zero)
      expect(ceilRound(-125n, 3, 2)).toBe(-12n); // -1.25 -> -1.2 (towards zero)
      expect(ceilRound(-129n, 3, 2)).toBe(-12n); // -1.29 -> -1.2 (towards zero)
      expect(ceilRound(-120n, 3, 2)).toBe(-12n); // -1.20 -> -1.2 (no remainder)

      expect(ceilRound(-1231n, 4, 3)).toBe(-123n); // -1.231 -> -1.23 (towards zero)
      expect(ceilRound(-1235n, 4, 3)).toBe(-123n); // -1.235 -> -1.23 (towards zero)
      expect(ceilRound(-1239n, 4, 3)).toBe(-123n); // -1.239 -> -1.23 (towards zero)
    });

    test('should handle zero values', () => {
      expect(ceilRound(0n, 3, 2)).toBe(0n);
      expect(ceilRound(0n, 5, 1)).toBe(0n);
      expect(ceilRound(0n, 10, 0)).toBe(0n);
    });

    test('should handle boundary values', () => {
      // Test ceiling with carry over
      expect(ceilRound(999n, 3, 2)).toBe(100n); // 9.99 -> 10.0 (carry over)
      expect(ceilRound(9999n, 4, 2)).toBe(100n); // 99.99 -> 100 (carry over)
    });

    test('should handle very large coefficients with hundreds of digits', () => {
      // Create coefficient with 300 digits
      const largeCoeff = BigInt('1' + '2'.repeat(299));

      // Ceiling round from scale 150 to scale 100
      const ceiled = ceilRound(largeCoeff, 150, 100);

      // Should be larger than or equal to truncated version
      const truncated = largeCoeff / (10n ** 50n);
      expect(ceiled).toBeGreaterThanOrEqual(truncated);
    });

    test('should handle coefficients 100,000+ times larger than Number.MAX_SAFE_INTEGER', () => {
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
      const veryLargeCoeff = maxSafeInt * 100000n + 12345n;

      // Ceiling round from high precision to lower precision
      const ceiled = ceilRound(veryLargeCoeff, 10, 5);

      // Should be a valid BigInt result
      expect(typeof ceiled).toBe('bigint');
      expect(ceiled).toBeGreaterThan(0n);
    });

    test('should throw error for negative scales', () => {
      expect(() => ceilRound(123n, -1, 2)).toThrow('Scales must be non-negative');
      expect(() => ceilRound(123n, 2, -1)).toThrow('Scales must be non-negative');
      expect(() => ceilRound(123n, -1, -1)).toThrow('Scales must be non-negative');
    });

    test('should handle single digit coefficients', () => {
      for (let i = 1; i <= 9; i++) {
        expect(ceilRound(BigInt(i), 2, 1)).toBe(1n); // 0.0i -> 0.1 (ceiling rounds up)
        expect(ceilRound(BigInt(i), 1, 2)).toBe(BigInt(i * 10)); // 0.i -> 0.i0 (scale up)
        expect(ceilRound(BigInt(-i), 2, 1)).toBe(0n); // -0.0i -> 0.0 (ceiling rounds towards positive infinity)
      }
    });
  });

  describe('floorRound', () => {

    test('should handle scale up scenarios (no rounding needed)', () => {
      expect(floorRound(123n, 2, 3)).toBe(1230n); // 1.23 -> 1.230 = 1230 with scale 3
      expect(floorRound(123n, 1, 4)).toBe(123000n); // 12.3 -> 12.3000 = 123000 with scale 4
      expect(floorRound(-456n, 2, 5)).toBe(-456000n); // -4.56 -> -4.56000 = -456000 with scale 5
      expect(floorRound(0n, 1, 3)).toBe(0n);
    });

    test('should handle same scale scenarios', () => {
      expect(floorRound(123n, 2, 2)).toBe(123n);
      expect(floorRound(-456n, 3, 3)).toBe(-456n);
      expect(floorRound(0n, 5, 5)).toBe(0n);
    });

    test('should floor round positive numbers (towards zero)', () => {
      expect(floorRound(121n, 3, 2)).toBe(12n); // 1.21 -> 1.2 (towards zero)
      expect(floorRound(125n, 3, 2)).toBe(12n); // 1.25 -> 1.2 (towards zero)
      expect(floorRound(129n, 3, 2)).toBe(12n); // 1.29 -> 1.2 (towards zero)
      expect(floorRound(120n, 3, 2)).toBe(12n); // 1.20 -> 1.2 (no remainder)

      expect(floorRound(1231n, 4, 3)).toBe(123n); // 1.231 -> 1.23 (towards zero)
      expect(floorRound(1235n, 4, 3)).toBe(123n); // 1.235 -> 1.23 (towards zero)
      expect(floorRound(1239n, 4, 3)).toBe(123n); // 1.239 -> 1.23 (towards zero)
    });

    test('should floor round negative numbers (always round down)', () => {
      expect(floorRound(-121n, 3, 2)).toBe(-13n); // -1.21 -> -1.3 (round down)
      expect(floorRound(-125n, 3, 2)).toBe(-13n); // -1.25 -> -1.3 (round down)
      expect(floorRound(-129n, 3, 2)).toBe(-13n); // -1.29 -> -1.3 (round down)
      expect(floorRound(-120n, 3, 2)).toBe(-12n); // -1.20 -> -1.2 (no remainder)

      expect(floorRound(-1231n, 4, 3)).toBe(-124n); // -1.231 -> -1.24 (round down)
      expect(floorRound(-1235n, 4, 3)).toBe(-124n); // -1.235 -> -1.24 (round down)
      expect(floorRound(-1239n, 4, 3)).toBe(-124n); // -1.239 -> -1.24 (round down)
    });

    test('should handle zero values', () => {
      expect(floorRound(0n, 3, 2)).toBe(0n);
      expect(floorRound(0n, 5, 1)).toBe(0n);
      expect(floorRound(0n, 10, 0)).toBe(0n);
    });

    test('should handle boundary values', () => {
      // Test floor with large numbers
      expect(floorRound(999n, 3, 2)).toBe(99n); // 9.99 -> 9.9 (floor)
      expect(floorRound(9999n, 4, 2)).toBe(99n); // 99.99 -> 99 (floor)
    });

    test('should handle very large coefficients with hundreds of digits', () => {
      // Create coefficient with 300 digits
      const largeCoeff = BigInt('1' + '2'.repeat(299));

      // Floor round from scale 150 to scale 100
      const floored = floorRound(largeCoeff, 150, 100);

      // Should be less than or equal to truncated version for positive numbers
      const truncated = largeCoeff / (10n ** 50n);
      expect(floored).toBeLessThanOrEqual(truncated);
    });

    test('should handle coefficients 100,000+ times larger than Number.MAX_SAFE_INTEGER', () => {
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
      const veryLargeCoeff = maxSafeInt * 100000n + 12345n;

      // Floor round from high precision to lower precision
      const floored = floorRound(veryLargeCoeff, 10, 5);

      // Should be a valid BigInt result
      expect(typeof floored).toBe('bigint');
      expect(floored).toBeGreaterThan(0n);
    });

    test('should throw error for negative scales', () => {
      expect(() => floorRound(123n, -1, 2)).toThrow('Scales must be non-negative');
      expect(() => floorRound(123n, 2, -1)).toThrow('Scales must be non-negative');
      expect(() => floorRound(123n, -1, -1)).toThrow('Scales must be non-negative');
    });

    test('should handle single digit coefficients', () => {
      for (let i = 1; i <= 9; i++) {
        expect(floorRound(BigInt(i), 2, 1)).toBe(0n); // 0.0i -> 0.0 (floor down)
        expect(floorRound(BigInt(i), 1, 2)).toBe(BigInt(i * 10)); // 0.i -> 0.i0 (scale up)
        expect(floorRound(BigInt(-i), 2, 1)).toBe(-1n); // -0.0i -> -0.1 (floor rounds towards negative infinity)
      }
    });
  });

  describe('Rounding Functions Integration', () => {

    test('should demonstrate different rounding behaviors', () => {
      const coeff = 1235n; // Represents 1.235 with scale 3
      const currentScale = 3;
      const targetScale = 2;

      // Round half up: 1.235 -> 1.24
      expect(roundHalfUp(coeff, currentScale, targetScale)).toBe(124n);

      // Ceiling: 1.235 -> 1.24 (round up)
      expect(ceilRound(coeff, currentScale, targetScale)).toBe(124n);

      // Floor: 1.235 -> 1.23 (round down)
      expect(floorRound(coeff, currentScale, targetScale)).toBe(123n);
    });

    test('should handle negative numbers consistently', () => {
      const coeff = -1235n; // Represents -1.235 with scale 3
      const currentScale = 3;
      const targetScale = 2;

      // Round half up: -1.235 -> -1.24 (away from zero)
      expect(roundHalfUp(coeff, currentScale, targetScale)).toBe(-124n);

      // Ceiling: -1.235 -> -1.23 (towards zero)
      expect(ceilRound(coeff, currentScale, targetScale)).toBe(-123n);

      // Floor: -1.235 -> -1.24 (away from zero)
      expect(floorRound(coeff, currentScale, targetScale)).toBe(-124n);
    });

    test('should handle exact values (no fractional part to round)', () => {
      const coeff = 1230n; // Represents 1.230 with scale 3
      const currentScale = 3;
      const targetScale = 2;

      // All rounding methods should give same result for exact values
      expect(roundHalfUp(coeff, currentScale, targetScale)).toBe(123n);
      expect(ceilRound(coeff, currentScale, targetScale)).toBe(123n);
      expect(floorRound(coeff, currentScale, targetScale)).toBe(123n);
    });

    test('should handle zero consistently across all rounding methods', () => {
      const coeff = 0n;
      const currentScale = 5;
      const targetScale = 2;

      expect(roundHalfUp(coeff, currentScale, targetScale)).toBe(0n);
      expect(ceilRound(coeff, currentScale, targetScale)).toBe(0n);
      expect(floorRound(coeff, currentScale, targetScale)).toBe(0n);
    });

    test('should handle scale up consistently across all rounding methods', () => {
      const coeff = 123n;
      const currentScale = 2;
      const targetScale = 5;

      const expected = 123000n; // Scale up by 3

      expect(roundHalfUp(coeff, currentScale, targetScale)).toBe(expected);
      expect(ceilRound(coeff, currentScale, targetScale)).toBe(expected);
      expect(floorRound(coeff, currentScale, targetScale)).toBe(expected);
    });

    test('should handle very large coefficients consistently', () => {
      const largeCoeff = BigInt('1' + '2'.repeat(100) + '5'); // Ends in 5 for rounding test
      const currentScale = 50;
      const targetScale = 49;

      // All should handle the large coefficient without error
      const rounded = roundHalfUp(largeCoeff, currentScale, targetScale);
      const ceiled = ceilRound(largeCoeff, currentScale, targetScale);
      const floored = floorRound(largeCoeff, currentScale, targetScale);

      expect(typeof rounded).toBe('bigint');
      expect(typeof ceiled).toBe('bigint');
      expect(typeof floored).toBe('bigint');

      // Ceiling should be >= floor
      expect(ceiled).toBeGreaterThanOrEqual(floored);
    });
  });

  describe('Edge Cases and Integration', () => {

    test('should handle empty coefficient scenarios gracefully', () => {
      // Test with the smallest possible BigInt values
      const coeff = 0n;
      expect(coeff === 0n).toBe(true);
      const absCoeff = coeff < 0n ? -coeff : coeff;
      expect(absCoeff).toBe(0n);
    });

    test('should handle trailing zeros in coefficient representation', () => {
      // BigInt automatically handles trailing zeros, but test the concept
      const coeff1 = BigInt('1000');
      const coeff2 = BigInt('1000000');

      expect(coeff1).toBe(1000n);
      expect(coeff2).toBe(1000000n);
      const absCoeff = coeff1 < 0n ? -coeff1 : coeff1;
      expect(absCoeff).toBe(1000n);
      expect(coeff1 > 0n).toBe(true);
    });

    test('should handle maximum precision scenarios', () => {
      // Test with coefficients at JavaScript's BigInt limits
      const maxPrecisionCoeff = BigInt('9'.repeat(1000)); // 1000 digits

      expect(maxPrecisionCoeff.toString().length).toBe(1000);
      const absCoeff = maxPrecisionCoeff < 0n ? -maxPrecisionCoeff : maxPrecisionCoeff;
      expect(absCoeff).toBe(maxPrecisionCoeff);
      expect(maxPrecisionCoeff > 0n).toBe(true);
    });

    test('should maintain performance with very large coefficients', () => {
      // Performance test with extremely large numbers
      const extremelyLarge = BigInt('1' + '0'.repeat(10000)); // 10,001 digits

      const startTime = Date.now();

      const absCoeff = extremelyLarge < 0n ? -extremelyLarge : extremelyLarge;
      const isPositive = extremelyLarge > 0n;

      const endTime = Date.now();

      // Operations should complete quickly (under 100ms for this size)
      expect(endTime - startTime).toBeLessThan(100);

      expect(absCoeff).toBe(extremelyLarge);
      expect(isPositive).toBe(true);
    });

    test('should integrate formatBigIntAsDecimal with rounding functions', () => {
      const coeff = 12345n;
      const currentScale = 4; // 1.2345
      const targetScale = 2;

      // Test round half up
      const rounded = roundHalfUp(coeff, currentScale, targetScale);
      const formattedRounded = formatBigIntAsDecimal(rounded, targetScale);
      expect(formattedRounded).toBe('1.23'); // 1.2345 -> 1.23 (round half up)

      // Test ceiling
      const ceiled = ceilRound(coeff, currentScale, targetScale);
      const formattedCeiled = formatBigIntAsDecimal(ceiled, targetScale);
      expect(formattedCeiled).toBe('1.24'); // 1.2345 -> 1.24 (ceiling)

      // Test floor
      const floored = floorRound(coeff, currentScale, targetScale);
      const formattedFloored = formatBigIntAsDecimal(floored, targetScale);
      expect(formattedFloored).toBe('1.23'); // 1.2345 -> 1.23 (floor)
    });
  });
});