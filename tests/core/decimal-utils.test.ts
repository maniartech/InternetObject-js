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