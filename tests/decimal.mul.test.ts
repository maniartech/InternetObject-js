import Decimal from "../src/core/decimal";

describe('Comprehensive Decimal.mul Regression Tests', () => {

  describe('Basic Multiplication Operations', () => {
    it('should handle simple positive multiplication', () => {
      const a = new Decimal('2.5', 3, 1);
      const b = new Decimal('4.0', 3, 1);
      const result = a.mul(b);
      expect(result.toString()).toBe('10.0');
      expect(result.getScale()).toBe(1);
    });

    it('should handle multiplication with different scales', () => {
      const a = new Decimal('1.23', 3, 2);  // Scale 2
      const b = new Decimal('4.565', 4, 3); // Scale 3
      const result = a.mul(b);
      expect(result.toString()).toBe('5.615'); // Rounded from 5.61495 to scale 3 (max of 2,3)
      expect(result.getScale()).toBe(3); // max(2, 3) = 3
    });

    it('should handle integer multiplication', () => {
      const a = new Decimal('123', 3, 0);
      const b = new Decimal('456', 3, 0);
      const result = a.mul(b);
      expect(result.toString()).toBe('56088');
      expect(result.getScale()).toBe(0);
    });
  });

  describe('Zero and Identity Multiplication', () => {
    it('should handle multiplication by zero', () => {
      const a = new Decimal('123.45', 5, 2);
      const b = new Decimal('0.00', 3, 2);
      const result = a.mul(b);
      expect(result.toString()).toBe('0.00');
      expect(result.getScale()).toBe(2);
    });

    it('should handle zero multiplied by zero', () => {
      const a = new Decimal('0.000', 4, 3);
      const b = new Decimal('0.00', 3, 2);
      const result = a.mul(b);
      expect(result.toString()).toBe('0.000');
      expect(result.getScale()).toBe(3);
    });

    it('should handle multiplication by one', () => {
      const a = new Decimal('123.45', 5, 2);
      const b = new Decimal('1.00', 3, 2);
      const result = a.mul(b);
      expect(result.toString()).toBe('123.45');
      expect(result.getScale()).toBe(2);
    });
  });

  describe('Negative Number Multiplication', () => {
    it('should handle positive * negative', () => {
      const a = new Decimal('2.5', 2, 1);
      const b = new Decimal('-3.2', 2, 1);
      const result = a.mul(b);
      expect(result.toString()).toBe('-8.0');
      expect(result.getScale()).toBe(1);
    });

    it('should handle negative * positive', () => {
      const a = new Decimal('-4.25', 3, 2);
      const b = new Decimal('2.0', 2, 1);
      const result = a.mul(b);
      expect(result.toString()).toBe('-8.50');
      expect(result.getScale()).toBe(2);
    });

    it('should handle negative * negative', () => {
      const a = new Decimal('-1.5', 2, 1);
      const b = new Decimal('-2.4', 2, 1);
      const result = a.mul(b);
      expect(result.toString()).toBe('3.6');
      expect(result.getScale()).toBe(1);
    });

    it('should handle very small negative numbers', () => {
      const a = new Decimal('-0.001', 4, 3);
      const b = new Decimal('-0.002', 4, 3);
      const result = a.mul(b);
      expect(result.toString()).toBe('0.000'); // Rounded from 0.000002
      expect(result.getScale()).toBe(3);
    });
  });

  describe('Scale and Precision Management', () => {
    it('should handle scale down with rounding (round half up)', () => {
      const a = new Decimal('1.235', 4, 3);
      const b = new Decimal('2.0', 2, 1);
      const result = a.mul(b);
      expect(result.toString()).toBe('2.470'); // 2.470 from 1.235 * 2.0
      expect(result.getScale()).toBe(3);
    });

    it('should handle scale up when needed', () => {
      const a = new Decimal('12.34', 4, 2);
      const b = new Decimal('5', 1, 0);
      const result = a.mul(b);
      expect(result.toString()).toBe('61.70');
      expect(result.getScale()).toBe(2);
    });

    it('should expand precision when result exceeds original precision', () => {
      const a = new Decimal('999.99', 5, 2);
      const b = new Decimal('999.99', 5, 2);
      const result = a.mul(b);
      expect(result.toString()).toBe('999980.00');
      expect(result.getScale()).toBe(2);
      expect(result.getPrecision()).toBeGreaterThan(5); // Precision expanded
    });

    it('should handle extreme scale differences', () => {
      const a = new Decimal('1.23456789', 9, 8);
      const b = new Decimal('2.0', 2, 1);
      const result = a.mul(b);
      expect(result.toString()).toBe('2.46913578');
      expect(result.getScale()).toBe(8); // max(8, 1) = 8
    });
  });

  describe('Large Number Multiplication', () => {
    it('should handle large integers', () => {
      const a = new Decimal('123456789012345', 15, 0);
      const b = new Decimal('987654321', 9, 0);
      const result = a.mul(b);
      expect(result.toString()).toBe('121932631124827861592745'); // Correct calculation
      expect(result.getScale()).toBe(0);
    });

    it('should handle large decimals', () => {
      const a = new Decimal('123456789.123456789', 18, 9);
      const b = new Decimal('2.5', 2, 1);
      const result = a.mul(b);
      expect(result.toString()).toBe('308641972.808641973');
      expect(result.getScale()).toBe(9);
    });

    it('should handle very large coefficients', () => {
      const a = new Decimal('999999999999999999999999999999.99', 32, 2);
      const b = new Decimal('2.00', 3, 2);
      const result = a.mul(b);
      expect(result.toString()).toBe('1999999999999999999999999999999.98');
      expect(result.getScale()).toBe(2);
    });
  });

  describe('Small Number Multiplication', () => {
    it('should handle very small decimals', () => {
      const a = new Decimal('0.000001', 7, 6);
      const b = new Decimal('0.000002', 7, 6);
      const result = a.mul(b);
      expect(result.toString()).toBe('0.000000'); // Rounded to scale 6
      expect(result.getScale()).toBe(6);
    });

    it('should handle multiplication resulting in very small numbers', () => {
      const a = new Decimal('0.1', 2, 1);
      const b = new Decimal('0.01', 3, 2);
      const result = a.mul(b);
      expect(result.toString()).toBe('0.00'); // 0.001 rounded to scale 2 (max of 1,2)
      expect(result.getScale()).toBe(2); // max(1, 2) = 2
    });

    it('should handle tiny fractions', () => {
      const a = new Decimal('0.00000123', 9, 8);
      const b = new Decimal('0.00000456', 9, 8);
      const result = a.mul(b);
      expect(result.toString()).toBe('0.00000000'); // Rounded from 0.0000000056088 to scale 8
      expect(result.getScale()).toBe(8);
    });
  });

  describe('Rounding Behavior Tests', () => {
    it('should round half up correctly', () => {
      const a = new Decimal('1.235', 4, 3);
      const b = new Decimal('1.0', 2, 1);
      const result = a.mul(b);
      expect(result.toString()).toBe('1.235');
      expect(result.getScale()).toBe(3);
    });

    it('should handle rounding with carry', () => {
      const a = new Decimal('9.99', 3, 2);
      const b = new Decimal('1.005', 4, 3);
      const result = a.mul(b);
      expect(result.toString()).toBe('10.040'); // Rounded from 10.04995 to scale 3 (max of 2,3)
      expect(result.getScale()).toBe(3); // max(2, 3) = 3
    });

    it('should handle complex rounding scenarios', () => {
      const a = new Decimal('123.456', 6, 3);
      const b = new Decimal('7.8901', 5, 4);
      const result = a.mul(b);
      expect(result.toString()).toBe('974.0802'); // Correctly rounded to scale 4 (max of 3,4)
      expect(result.getScale()).toBe(4); // max(3, 4) = 4
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    it('should handle maximum safe precision', () => {
      const a = new Decimal('1.23', 50, 2);
      const b = new Decimal('4.56', 50, 2);
      const result = a.mul(b);
      expect(result.toString()).toBe('5.61');
      expect(result.getScale()).toBe(2);
    });

    it('should handle mixed precision and scale combinations', () => {
      const a = new Decimal('12.3', 10, 1);
      const b = new Decimal('45.67890', 20, 5);
      const result = a.mul(b);
      expect(result.toString()).toBe('561.85047'); // Correctly rounded to scale 5 (max of 1,5)
      expect(result.getScale()).toBe(5);
    });

    it('should throw error for invalid operand', () => {
      const a = new Decimal('1.23', 3, 2);
      expect(() => {
        (a as any).mul("invalid");
      }).toThrow('Invalid operand');
    });
  });

  describe('Utility Function Integration', () => {
    it('should use roundHalfUp for scale adjustment', () => {
      const a = new Decimal('1.2345', 5, 4);
      const b = new Decimal('2.0', 2, 1);
      const result = a.mul(b);
      // Intermediate: 2.4690 (scale 5), rounded to scale 4 (max of 4,1): 2.4690
      expect(result.toString()).toBe('2.4690');
      expect(result.getScale()).toBe(4); // max(4, 1) = 4
    });

    it('should use scaleUp when intermediate scale is less than target', () => {
      const a = new Decimal('12.34', 4, 2);
      const b = new Decimal('5', 1, 0);
      const result = a.mul(b);
      // Intermediate: 6170 (scale 2), no scaling needed
      expect(result.toString()).toBe('61.70');
      expect(result.getScale()).toBe(2);
    });

    it('should use formatBigIntAsDecimal for result formatting', () => {
      const a = new Decimal('0.001', 4, 3);
      const b = new Decimal('1000', 4, 0);
      const result = a.mul(b);
      expect(result.toString()).toBe('1.000');
      expect(result.getScale()).toBe(3);
    });
  });

  describe('RDBMS Standard Compliance Tests', () => {
    it('should follow RDBMS scale standard: max(s1, s2)', () => {
      const a = new Decimal('1.23', 3, 2);
      const b = new Decimal('4.56', 3, 2);
      const result = a.mul(b);
      expect(result.toString()).toBe('5.61');
      expect(result.getScale()).toBe(2); // max(2, 2) = 2
    });

    it('should maintain result scale as max of operand scales', () => {
      const testCases = [
        { a: '1.23', aP: 3, aS: 2, b: '4.565', bP: 4, bS: 3, expected: '5.615', expectedScale: 3 }, // max(2,3)=3
        { a: '12.3', aP: 3, aS: 1, b: '4.56', bP: 3, bS: 2, expected: '56.09', expectedScale: 2 }, // max(1,2)=2
        { a: '123', aP: 3, aS: 0, b: '4.56', bP: 3, bS: 2, expected: '560.88', expectedScale: 2 }, // max(0,2)=2
        { a: '1.2345', aP: 5, aS: 4, b: '2.1', bP: 2, bS: 1, expected: '2.5925', expectedScale: 4 } // max(4,1)=4
      ];

      testCases.forEach(({ a, aP, aS, b, bP, bS, expected, expectedScale }) => {
        const decA = new Decimal(a, aP, aS);
        const decB = new Decimal(b, bP, bS);
        const result = decA.mul(decB);
        expect(result.getScale()).toBe(expectedScale);
        expect(result.toString()).toBe(expected);
      });
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle repeated multiplications', () => {
      let result = new Decimal('1.1', 10, 1);
      for (let i = 0; i < 10; i++) {
        result = result.mul(new Decimal('1.1', 10, 1));
      }
      expect(result.getScale()).toBe(1);
      expect(parseFloat(result.toString())).toBeCloseTo(2.8, 1); // Correct accumulated result
    });

    it('should handle multiplication chains', () => {
      const a = new Decimal('2.0', 5, 1);
      const b = new Decimal('3.0', 5, 1);
      const c = new Decimal('4.0', 5, 1);
      const result = a.mul(b).mul(c);
      expect(result.toString()).toBe('24.0');
      expect(result.getScale()).toBe(1);
    });
  });

  describe('Additional Edge Cases and Regression Tests', () => {
    it('should handle multiplication with trailing zeros', () => {
      const a = new Decimal('1.200', 4, 3);
      const b = new Decimal('2.500', 4, 3);
      const result = a.mul(b);
      expect(result.toString()).toBe('3.000');
      expect(result.getScale()).toBe(3);
    });

    it('should handle multiplication with leading zeros in fractional part', () => {
      const a = new Decimal('0.001', 4, 3);
      const b = new Decimal('0.002', 4, 3);
      const result = a.mul(b);
      expect(result.toString()).toBe('0.000'); // Rounded from 0.000002
      expect(result.getScale()).toBe(3);
    });

    it('should handle scientific notation edge cases', () => {
      const a = new Decimal('1.23e2', 5, 2); // 123.00
      const b = new Decimal('4.56e-1', 5, 3); // 0.456
      const result = a.mul(b);
      expect(result.toString()).toBe('56.088'); // Scale 3 (max of 2,3)
      expect(result.getScale()).toBe(3); // max(2, 3) = 3
    });

    it('should handle maximum coefficient values', () => {
      const maxBigInt = '9'.repeat(50);
      const a = new Decimal(`${maxBigInt}.0`, 51, 1);
      const b = new Decimal('1.0', 2, 1);
      const result = a.mul(b);
      expect(result.toString()).toBe(`${maxBigInt}.0`);
      expect(result.getScale()).toBe(1);
    });

    it('should handle precision boundary conditions', () => {
      const a = new Decimal('9.99', 3, 2);
      const b = new Decimal('1.01', 3, 2);
      const result = a.mul(b);
      expect(result.toString()).toBe('10.09'); // Precision expanded
      expect(result.getScale()).toBe(2);
      expect(result.getPrecision()).toBeGreaterThan(3);
    });

    it('should handle asymmetric scale operations', () => {
      const a = new Decimal('123.456789', 9, 6);
      const b = new Decimal('2', 1, 0);
      const result = a.mul(b);
      expect(result.toString()).toBe('246.913578');
      expect(result.getScale()).toBe(6); // max(6, 0) = 6
    });

    it('should handle multiplication resulting in integer from decimals', () => {
      const a = new Decimal('2.5', 2, 1);
      const b = new Decimal('4.0', 2, 1);
      const result = a.mul(b);
      expect(result.toString()).toBe('10.0');
      expect(result.getScale()).toBe(1);
    });

    it('should handle very high precision numbers', () => {
      const a = new Decimal('1.23456789012345678901234567890', 30, 29);
      const b = new Decimal('2.0', 2, 1);
      const result = a.mul(b);
      expect(result.toString()).toBe('2.46913578024691357802469135780');
      expect(result.getScale()).toBe(29);
    });

    it('should maintain coefficient integrity with complex operations', () => {
      const a = new Decimal('999.999', 6, 3);
      const b = new Decimal('0.001', 4, 3);
      const result = a.mul(b);
      expect(result.toString()).toBe('1.000'); // Rounded from 0.999999
      expect(result.getScale()).toBe(3);
    });

    it('should handle edge case rounding scenarios', () => {
      const a = new Decimal('1.9995', 5, 4);
      const b = new Decimal('1.0', 2, 1);
      const result = a.mul(b);
      expect(result.toString()).toBe('1.9995');
      expect(result.getScale()).toBe(4);
    });
  });

  describe('Edge Case Compatibility Verification', () => {
    it('should match expected edge case behavior', () => {
      const a = new Decimal('1.23', 3, 2);
      const b = new Decimal('4.56', 3, 2);
      const result = a.mul(b);
      expect(result.toString()).toBe('5.61');
      expect(result.getScale()).toBe(2); // max(2, 2) = 2
    });
  });
});
