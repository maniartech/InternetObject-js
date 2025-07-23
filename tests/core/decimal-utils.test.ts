/**
 * Test suite for decimal utility functions
 * 
 * Comprehensive tests covering edge cases including leading zeros, trailing zeros,
 * sign handling, empty coefficients, and very large coefficient scenarios.
 */

import { 
  normalizeCoefficient, 
  getAbsoluteValue, 
  getSign,
  scaleUp,
  scaleDown,
  type NormalizedCoefficient 
} from '../../src/core/decimal-utils';

describe('Decimal Utility Functions', () => {
  
  describe('normalizeCoefficient', () => {
    
    test('should handle zero coefficient', () => {
      const result = normalizeCoefficient(0n);
      expect(result.coefficient).toBe(0n);
      expect(result.isZero).toBe(true);
    });

    test('should handle positive coefficient', () => {
      const result = normalizeCoefficient(123n);
      expect(result.coefficient).toBe(123n);
      expect(result.isZero).toBe(false);
    });

    test('should handle negative coefficient', () => {
      const result = normalizeCoefficient(-456n);
      expect(result.coefficient).toBe(-456n);
      expect(result.isZero).toBe(false);
    });

    test('should handle very large positive coefficient', () => {
      // Create a coefficient with hundreds of digits
      const largeCoeff = BigInt('1' + '0'.repeat(200) + '123456789');
      const result = normalizeCoefficient(largeCoeff);
      expect(result.coefficient).toBe(largeCoeff);
      expect(result.isZero).toBe(false);
    });

    test('should handle very large negative coefficient', () => {
      // Create a negative coefficient with hundreds of digits
      const largeCoeff = BigInt('-9' + '8'.repeat(300) + '123456789');
      const result = normalizeCoefficient(largeCoeff);
      expect(result.coefficient).toBe(largeCoeff);
      expect(result.isZero).toBe(false);
    });

    test('should handle coefficient 100,000+ times larger than Number.MAX_SAFE_INTEGER', () => {
      // Number.MAX_SAFE_INTEGER is 9007199254740991 (about 9e15)
      // Create a number 100,000+ times larger (about 9e20)
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
      const veryLargeCoeff = maxSafeInt * 100000n + 12345n;
      const result = normalizeCoefficient(veryLargeCoeff);
      expect(result.coefficient).toBe(veryLargeCoeff);
      expect(result.isZero).toBe(false);
    });

    test('should handle single digit coefficients', () => {
      for (let i = 1; i <= 9; i++) {
        const result = normalizeCoefficient(BigInt(i));
        expect(result.coefficient).toBe(BigInt(i));
        expect(result.isZero).toBe(false);
      }
    });

    test('should handle boundary values', () => {
      // Test 1 and -1
      const positiveOne = normalizeCoefficient(1n);
      expect(positiveOne.coefficient).toBe(1n);
      expect(positiveOne.isZero).toBe(false);

      const negativeOne = normalizeCoefficient(-1n);
      expect(negativeOne.coefficient).toBe(-1n);
      expect(negativeOne.isZero).toBe(false);
    });

    test('should maintain coefficient integrity for complex numbers', () => {
      const complexCoeff = BigInt('123456789012345678901234567890');
      const result = normalizeCoefficient(complexCoeff);
      expect(result.coefficient.toString()).toBe('123456789012345678901234567890');
      expect(result.isZero).toBe(false);
    });
  });

  describe('getAbsoluteValue', () => {
    
    test('should return absolute value of positive coefficient', () => {
      expect(getAbsoluteValue(123n)).toBe(123n);
      expect(getAbsoluteValue(1n)).toBe(1n);
    });

    test('should return absolute value of negative coefficient', () => {
      expect(getAbsoluteValue(-123n)).toBe(123n);
      expect(getAbsoluteValue(-1n)).toBe(1n);
    });

    test('should return zero for zero coefficient', () => {
      expect(getAbsoluteValue(0n)).toBe(0n);
    });

    test('should handle very large positive coefficients', () => {
      const largeCoeff = BigInt('9' + '8'.repeat(100) + '123456789');
      expect(getAbsoluteValue(largeCoeff)).toBe(largeCoeff);
    });

    test('should handle very large negative coefficients', () => {
      const largeNegCoeff = BigInt('-9' + '8'.repeat(100) + '123456789');
      const expectedAbs = BigInt('9' + '8'.repeat(100) + '123456789');
      expect(getAbsoluteValue(largeNegCoeff)).toBe(expectedAbs);
    });

    test('should handle coefficients 100,000+ times larger than Number.MAX_SAFE_INTEGER', () => {
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
      const veryLargeCoeff = maxSafeInt * 100000n + 12345n;
      const veryLargeNegCoeff = -veryLargeCoeff;
      
      expect(getAbsoluteValue(veryLargeCoeff)).toBe(veryLargeCoeff);
      expect(getAbsoluteValue(veryLargeNegCoeff)).toBe(veryLargeCoeff);
    });

    test('should handle boundary cases', () => {
      // Test with maximum and minimum single digit values
      expect(getAbsoluteValue(9n)).toBe(9n);
      expect(getAbsoluteValue(-9n)).toBe(9n);
    });

    test('should preserve coefficient precision for hundreds of digits', () => {
      const hundredsOfDigits = BigInt('1' + '2'.repeat(200) + '3' + '4'.repeat(200));
      const negativeHundreds = -hundredsOfDigits;
      
      expect(getAbsoluteValue(hundredsOfDigits)).toBe(hundredsOfDigits);
      expect(getAbsoluteValue(negativeHundreds)).toBe(hundredsOfDigits);
      
      // Verify the string representation maintains all digits
      expect(getAbsoluteValue(negativeHundreds).toString().length).toBe(402);
    });
  });

  describe('getSign', () => {
    
    test('should return 1 for positive coefficients', () => {
      expect(getSign(1n)).toBe(1);
      expect(getSign(123n)).toBe(1);
      expect(getSign(999999n)).toBe(1);
    });

    test('should return -1 for negative coefficients', () => {
      expect(getSign(-1n)).toBe(-1);
      expect(getSign(-123n)).toBe(-1);
      expect(getSign(-999999n)).toBe(-1);
    });

    test('should return 0 for zero coefficient', () => {
      expect(getSign(0n)).toBe(0);
    });

    test('should handle very large positive coefficients', () => {
      const largeCoeff = BigInt('1' + '0'.repeat(300));
      expect(getSign(largeCoeff)).toBe(1);
    });

    test('should handle very large negative coefficients', () => {
      const largeNegCoeff = BigInt('-1' + '0'.repeat(300));
      expect(getSign(largeNegCoeff)).toBe(-1);
    });

    test('should handle coefficients 100,000+ times larger than Number.MAX_SAFE_INTEGER', () => {
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
      const veryLargeCoeff = maxSafeInt * 100000n + 12345n;
      const veryLargeNegCoeff = -veryLargeCoeff;
      
      expect(getSign(veryLargeCoeff)).toBe(1);
      expect(getSign(veryLargeNegCoeff)).toBe(-1);
    });

    test('should handle boundary single digit values', () => {
      // Test all single digits
      for (let i = 1; i <= 9; i++) {
        expect(getSign(BigInt(i))).toBe(1);
        expect(getSign(BigInt(-i))).toBe(-1);
      }
    });

    test('should handle coefficients with hundreds of digits', () => {
      // Create coefficients with exactly 500 digits
      const positiveHuge = BigInt('1' + '2'.repeat(499));
      const negativeHuge = -positiveHuge;
      
      expect(getSign(positiveHuge)).toBe(1);
      expect(getSign(negativeHuge)).toBe(-1);
      
      // Verify we're actually dealing with hundreds of digits
      expect(positiveHuge.toString().length).toBe(500);
    });

    test('should maintain consistency with absolute value function', () => {
      const testValues = [
        123n,
        -456n,
        0n,
        BigInt('9'.repeat(100)),
        -BigInt('8'.repeat(100))
      ];

      testValues.forEach(value => {
        const sign = getSign(value);
        const abs = getAbsoluteValue(value);
        
        if (sign === 0) {
          expect(abs).toBe(0n);
        } else if (sign === 1) {
          expect(value).toBe(abs);
        } else if (sign === -1) {
          expect(value).toBe(-abs);
        }
      });
    });
  });

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
      
      // Both operations should preserve sign
      expect(getSign(scaleUp(positiveCoeff, 10))).toBe(1);
      expect(getSign(scaleUp(negativeCoeff, 10))).toBe(-1);
      expect(getSign(scaleDown(positiveCoeff, 2))).toBe(1);
      expect(getSign(scaleDown(negativeCoeff, 2))).toBe(-1);
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

  describe('Edge Cases and Integration', () => {
    
    test('should handle empty coefficient scenarios gracefully', () => {
      // Test with the smallest possible BigInt values
      const result = normalizeCoefficient(0n);
      expect(result.isZero).toBe(true);
      expect(getAbsoluteValue(result.coefficient)).toBe(0n);
      expect(getSign(result.coefficient)).toBe(0);
    });

    test('should handle trailing zeros in coefficient representation', () => {
      // BigInt automatically handles trailing zeros, but test the concept
      const coeff1 = BigInt('1000');
      const coeff2 = BigInt('1000000');
      
      expect(normalizeCoefficient(coeff1).coefficient).toBe(1000n);
      expect(normalizeCoefficient(coeff2).coefficient).toBe(1000000n);
      expect(getAbsoluteValue(coeff1)).toBe(1000n);
      expect(getSign(coeff1)).toBe(1);
    });

    test('should handle maximum precision scenarios', () => {
      // Test with coefficients at JavaScript's BigInt limits
      const maxPrecisionCoeff = BigInt('9'.repeat(1000)); // 1000 digits
      const result = normalizeCoefficient(maxPrecisionCoeff);
      
      expect(result.coefficient).toBe(maxPrecisionCoeff);
      expect(result.isZero).toBe(false);
      expect(getAbsoluteValue(maxPrecisionCoeff)).toBe(maxPrecisionCoeff);
      expect(getSign(maxPrecisionCoeff)).toBe(1);
    });

    test('should maintain performance with very large coefficients', () => {
      // Performance test with extremely large numbers
      const extremelyLarge = BigInt('1' + '0'.repeat(10000)); // 10,001 digits
      
      const startTime = Date.now();
      
      const normalized = normalizeCoefficient(extremelyLarge);
      const absolute = getAbsoluteValue(extremelyLarge);
      const sign = getSign(extremelyLarge);
      
      const endTime = Date.now();
      
      // Operations should complete quickly (under 100ms for this size)
      expect(endTime - startTime).toBeLessThan(100);
      
      expect(normalized.coefficient).toBe(extremelyLarge);
      expect(absolute).toBe(extremelyLarge);
      expect(sign).toBe(1);
    });
  });
});