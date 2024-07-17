import { Decimal } from '../src/core/decimal';

describe('Decimal', () => {
    describe('constructor', () => {
        it('should create a Decimal from integer inputs', () => {
            const d = new Decimal(314, -2);
            expect(d.toString()).toBe('3.14');
        });

        it('should throw an error for non-integer exponent', () => {
            expect(() => new Decimal(1, 1.5)).toThrow('Exponent must be an integer.');
        });
    });

    describe('parse', () => {
        it('should parse integer strings', () => {
            expect(Decimal.parse('123').toString()).toBe('123');
        });

        it('should parse decimal strings', () => {
            expect(Decimal.parse('3.14').toString()).toBe('3.14');
        });

        it('should parse negative numbers', () => {
            expect(Decimal.parse('-76.54').toString()).toBe('-76.54');
        });

        it('should throw an error for invalid input', () => {
            expect(() => Decimal.parse('not a number')).toThrow('Invalid decimal string format.');
        });
    });

    describe('toString', () => {
        it('should correctly represent small numbers', () => {
            expect(new Decimal(37, -5).toString()).toBe('0.00037');
        });

        it('should correctly represent large numbers', () => {
            expect(new Decimal(5, 6).toString()).toBe('5000000');
        });

        it('should handle negative numbers', () => {
            expect(new Decimal(-76, 0).toString()).toBe('-76');
        });
    });

    describe('arithmetic operations', () => {
        it('should add correctly', () => {
            const a = Decimal.parse('3.14');
            const b = Decimal.parse('2.86');
            expect(a.add(b).toString()).toBe('6');
        });

        it('should subtract correctly', () => {
            const a = Decimal.parse('5.5');
            const b = Decimal.parse('2.7');
            expect(a.subtract(b).toString()).toBe('2.8');
        });

        it('should multiply correctly', () => {
            const a = Decimal.parse('3.14');
            const b = Decimal.parse('2');
            expect(a.multiply(b).toString()).toBe('6.28');
        });

        it('should divide correctly', () => {
            const a = Decimal.parse('10');
            const b = Decimal.parse('3');
            expect(a.divide(b).toString()).toBe('3.3333333333333333');
        });

        it('should throw an error when dividing by zero', () => {
            const a = Decimal.parse('10');
            const b = Decimal.parse('0');
            expect(() => a.divide(b)).toThrow('Division by zero is not allowed.');
        });
    });

    describe('division', () => {
      it('should divide correctly for simple cases', () => {
          expect(Decimal.parse('10').divide(Decimal.parse('2')).toString()).toBe('5');
          expect(Decimal.parse('1').divide(Decimal.parse('3')).toString()).toBe('0.333333333333333333333333333333');
      });

      it('should handle division that results in repeating decimals', () => {
          expect(Decimal.parse('1').divide(Decimal.parse('7')).toString()).toBe('0.142857142857142857142857142857');
      });

      it('should handle division with different exponents', () => {
          const a = new Decimal(1, 2);  // 100
          const b = new Decimal(2, 0);  // 2
          expect(a.divide(b).toString()).toBe('50');
      });

      it('should throw an error when dividing by zero', () => {
          expect(() => Decimal.parse('10').divide(Decimal.parse('0'))).toThrow('Division by zero is not allowed.');
      });

      it('should handle division of large numbers', () => {
          const a = new Decimal(BigInt('1' + '0'.repeat(100)), 0);
          const b = new Decimal(BigInt('3' + '0'.repeat(50)), 0);
          expect(a.divide(b).toString()).toBe('33333333333333333333.333333333333333333333333333333');
      });

      it('should handle division with custom precision', () => {
          const a = Decimal.parse('1');
          const b = Decimal.parse('3');
          expect(a.divide(b, 5).toString()).toBe('0.333333333333333333333333333333');
      });

      it('should handle division of decimal numbers', () => {
          expect(Decimal.parse('0.1').divide(Decimal.parse('0.3')).toString()).toBe('0.333333333333333333333333333333');
      });
  });

  it('should parse and represent numbers with high precision', () => {
      expect(Decimal.parse('1.23456789012345678901234567891').toString()).toBe('1.23456789012345678901234567891');
  });


    describe('edge cases', () => {
        it('should handle very large numbers', () => {
            const large = new Decimal(1, 1000000);
            expect(large.toString()).toBe('1' + '0'.repeat(1000000));
        });

        it('should handle very small numbers', () => {
            const small = new Decimal(1, -1000000);
            expect(small.toString()).toBe('0.' + '0'.repeat(999999) + '1');
        });

        it('should handle numbers with many decimal places', () => {
            expect(Decimal.parse('1.23456789012345678901234567890').toString())
                .toBe('1.23456789012345678901234567890');
        });

        it('should normalize numbers', () => {
            expect(new Decimal(1000, -3).toString()).toBe('1');
        });

        it('should handle zero correctly', () => {
            expect(new Decimal(0, 1000).toString()).toBe('0');
            expect(new Decimal(0, -1000).toString()).toBe('0');
        });
    });
});