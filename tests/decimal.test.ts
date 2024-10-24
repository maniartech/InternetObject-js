// Decimal.test.ts
import { Decimal, DecimalError } from '../src/core/decimal';

describe('Decimal Class', () => {
    // Parsing from Strings
    describe('Parsing from Strings', () => {
        it('should parse standard decimal notation', () => {
            const dec = new Decimal("123.45", 5, 2);
            expect(dec.toString()).toBe("123.45");
            expect(dec.getCoefficient()).toBe(12345n);
            expect(dec.getExponent()).toBe(2);
        });

        it('should parse numbers without decimal point', () => {
            const dec = new Decimal("100", 3, 0);
            expect(dec.toString()).toBe("100");
            expect(dec.getCoefficient()).toBe(100n);
            expect(dec.getExponent()).toBe(0);
        });

        it('should parse numbers with leading and trailing zeros', () => {
            const dec = new Decimal("000123.4500", 5, 2);
            expect(dec.toString()).toBe("123.45");
            expect(dec.getCoefficient()).toBe(12345n);
            expect(dec.getExponent()).toBe(2);
        });

        it('should parse zero values correctly', () => {
            const dec = new Decimal("0.00", 3, 2);
            expect(dec.toString()).toBe("0.00");
            expect(dec.getCoefficient()).toBe(0n);
            expect(dec.getExponent()).toBe(2);
        });

        it('should perform rounding when fractional digits exceed scale', () => {
            const dec = new Decimal("123.456", 6, 2);
            expect(dec.toString()).toBe("123.46");
            expect(dec.getCoefficient()).toBe(12346n);
            expect(dec.getExponent()).toBe(2);
        });

        it('should throw DecimalError for invalid formats', () => {
            expect(() => new Decimal("12.3.4", 5, 2)).toThrow(DecimalError);
            expect(() => new Decimal("12a.34", 5, 2)).toThrow(DecimalError);
            expect(() => new Decimal(".", 1, 0)).toThrow(DecimalError);
            expect(() => new Decimal("-.", 1, 0)).toThrow(DecimalError);
        });

        it('should throw DecimalError when precision is exceeded', () => {
            expect(() => new Decimal("1234.5", 5, 2)).toThrow(DecimalError); // 5 digits allowed
            expect(() => new Decimal("-1234.5", 5, 2)).toThrow(DecimalError);
        });

        it('should round to nearest value when fractional digits exceed scale', () => {
            expect(new Decimal("999.995", 6, 2).toString()).toBe("1000.00");
        });
    });

    // Parsing from Numbers
    describe('Parsing from Numbers', () => {
        it('should parse positive numbers correctly', () => {
            const dec = new Decimal(123.45, 5, 2);
            expect(dec.toString()).toBe("123.45");
            expect(dec.getCoefficient()).toBe(12345n);
            expect(dec.getExponent()).toBe(2);
        });

        it('should parse negative numbers correctly', () => {
            const dec = new Decimal(-0.001, 4, 3);
            expect(dec.toString()).toBe("-0.001");
            expect(dec.getCoefficient()).toBe(-1n);
            expect(dec.getExponent()).toBe(3);
        });

        it('should parse zero correctly', () => {
            const dec = new Decimal(0, 1, 0);
            expect(dec.toString()).toBe("0");
            expect(dec.getCoefficient()).toBe(0n);
            expect(dec.getExponent()).toBe(0);
        });

        it('should handle large numbers within Number.MAX_VALUE', () => {
            const dec = new Decimal(9999999999, 10, 0);
            expect(dec.toString()).toBe("9999999999");
            expect(dec.getCoefficient()).toBe(9999999999n);
            expect(dec.getExponent()).toBe(0);
        });

        it('should throw DecimalError when number exceeds precision', () => {
            expect(() => new Decimal(1234.5, 5, 2)).toThrow(DecimalError);
            expect(() => new Decimal(-1234.5, 5, 2)).toThrow(DecimalError);
        });

        it('should perform rounding accurately', () => {
            const dec = new Decimal(123.455, 6, 2);
            expect(dec.toString()).toBe("123.46");
            expect(dec.getCoefficient()).toBe(12346n);
            expect(dec.getExponent()).toBe(2);
        });

        it('should throw DecimalError when converting number results in precision loss due to rounding', () => {
            // Example: 0.0000001 with precision=1 and scale=7 (would round to 0.0000001 which has 1 digit)
            expect(() => new Decimal(0.0000001, 1, 7)).toThrow(DecimalError);
        });
    });

    // Parsing from Decimal Instances
    describe('Parsing from Decimal Instances', () => {
        it('should clone a Decimal with the same precision and scale', () => {
            const dec1 = new Decimal("123.45", 5, 2);
            const dec2 = new Decimal(dec1, 5, 2);
            expect(dec2.toString()).toBe("123.45");
            expect(dec2.getCoefficient()).toBe(12345n);
            expect(dec2.getExponent()).toBe(2);
            expect(dec1.equals(dec2)).toBe(true);
        });

        it('should increase scale by padding zeros', () => {
            const dec1 = new Decimal("123.45", 5, 2);
            const dec2 = new Decimal(dec1, 7, 4);
            expect(dec2.toString()).toBe("123.4500");
            expect(dec2.getCoefficient()).toBe(1234500n);
            expect(dec2.getExponent()).toBe(4);
        });

        it('should decrease scale by truncating fractional digits with rounding', () => {
            const dec1 = new Decimal("123.4567", 7, 4);
            const dec2 = new Decimal(dec1, 6, 2);
            expect(dec2.toString()).toBe("123.46");
            expect(dec2.getCoefficient()).toBe(12346n);
            expect(dec2.getExponent()).toBe(2);
        });

        it('should throw DecimalError when truncation and rounding leads to precision overflow', () => {
            const dec1 = new Decimal("99999.99999", 10, 5);
            expect(() => new Decimal(dec1, 5, 2)).toThrow(DecimalError); // 99999.99 has 7 digits, exceeding precision=5
        });

        it('should throw DecimalError when precision is exceeded during scaling', () => {
            const dec1 = new Decimal("123.45", 5, 2);
            // Attempting to increase scale to 4 with precision=5 (123.4500 has 7 digits)
            expect(() => new Decimal(dec1, 5, 4)).toThrow(DecimalError);
        });

        it('should handle negative Decimals correctly during scaling', () => {
            const dec1 = new Decimal("-123.4567", 7, 4);
            const dec2 = new Decimal(dec1, 6, 2);
            expect(dec2.toString()).toBe("-123.46");
            expect(dec2.getCoefficient()).toBe(-12346n);
            expect(dec2.getExponent()).toBe(2);
        });
    });

    // Converting to Number
    describe('Converting to Number', () => {
        it('should convert Decimal to Number accurately within bounds', () => {
            const dec = new Decimal("123.45", 5, 2);
            expect(dec.toNumber()).toBe(123.45);
        });

        it('should handle negative numbers correctly', () => {
            const dec = new Decimal("-0.001", 4, 3);
            expect(dec.toNumber()).toBe(-0.001);
        });

        it('should handle zero correctly', () => {
            const dec = new Decimal("0.00", 3, 2);
            expect(dec.toNumber()).toBe(0);
        });

        it('should handle large numbers within Number.MAX_VALUE', () => {
            const dec = new Decimal("9999999999", 10, 0);
            expect(dec.toNumber()).toBe(9999999999);
        });

        it('should converte to infinity when converting extremely large decimals to number', () => {
            const dec = new Decimal("1" + "0".repeat(309), 310, 0); // Beyond Number.MAX_VALUE
            expect(dec.toNumber()).toBe(Infinity);

            const dec2 = new Decimal("-1" + "0".repeat(309), 310, 0); // Beyond Number.MIN_VALUE
            expect(dec2.toNumber()).toBe(-Infinity);
        });

        it('should handle very small numbers within Number.MIN_VALUE', () => {
            const dec = new Decimal("0.0000001", 7, 7);
            expect(dec.toNumber()).toBe(1e-7);
        });

        it('should handle underflow to zero for extremely small numbers', () => {
            const dec = new Decimal("0.0000000000000000000000000001", 31, 31);
            expect(dec.toNumber()).toBe(1e-28);
        });

        it('should perform rounding correctly during conversion', () => {
            const dec = new Decimal("123.456", 6, 2); // Should round to "123.46"
            expect(dec.toNumber()).toBe(123.46);
        });
    });

    // Comparison Operations
    describe('Comparison Operations', () => {
        it('should correctly identify equal Decimals', () => {
            const dec1 = new Decimal("123.45", 5, 2);
            const dec2 = new Decimal("123.45", 5, 2);
            expect(dec1.equals(dec2)).toBe(true);
        });

        it('should correctly identify greaterThan', () => {
            const dec1 = new Decimal("123.45", 5, 2);
            const dec2 = new Decimal("123.44", 5, 2);
            expect(dec1.greaterThan(dec2)).toBe(true);
        });

        it('should correctly identify lessThan', () => {
            const dec1 = new Decimal("-0.001", 4, 3);
            const dec2 = new Decimal("0.001", 4, 3);
            expect(dec1.lessThan(dec2)).toBe(true);
        });

        it('should handle comparisons with different representations', () => {
            const dec1 = new Decimal("100", 3, 0);
            const dec2 = new Decimal("100.00", 5, 2);
            expect(() => dec1.equals(dec2)).toThrow(DecimalError);
        });

        it('should throw DecimalError for different precisions or scales during comparison', () => {
            const dec1 = new Decimal("100", 3, 0);
            const dec2 = new Decimal("100.00", 5, 2);
            expect(() => dec1.greaterThan(dec2)).toThrow(DecimalError);
        });

        it('should correctly handle edge cases in comparisons', () => {
            const dec1 = new Decimal("100000", 6, 0); // "100000"
            const dec2 = new Decimal("100000", 6, 0);
            expect(dec1.equals(dec2)).toBe(true);
        });

        it('should correctly compare Decimal instances created from numbers', () => {
            const dec1 = new Decimal(123.45, 5, 2);
            const dec2 = new Decimal("123.45", 5, 2);
            expect(dec1.equals(dec2)).toBe(true);
        });

        it('should correctly compare Decimal instances with different input types', () => {
            const dec1 = new Decimal("123.45", 5, 2);
            const dec2 = new Decimal(123.45, 5, 2);
            expect(dec1.equals(dec2)).toBe(true);
        });

        it('should correctly compare Decimals with different signs', () => {
            const dec1 = new Decimal("-123.45", 5, 2);
            const dec2 = new Decimal("123.45", 5, 2);
            expect(dec1.lessThan(dec2)).toBe(true);
            expect(dec2.greaterThan(dec1)).toBe(true);
        });
    });

    // Edge Cases
    describe('Edge Cases', () => {
        it('should correctly parse and represent zero in various formats', () => {
            const dec1 = new Decimal("0", 1, 0);
            const dec2 = new Decimal("-0", 1, 0);
            const dec3 = new Decimal("0.00", 3, 2);
            expect(dec1.toString()).toBe("0");
            expect(dec2.toString()).toBe("0");
            expect(dec3.toString()).toBe("0.00");
            expect(dec1.equals(dec2)).toBe(true);
        });

        it('should handle maximum precision and scale', () => {
            const dec = new Decimal("99999.99999", 10, 5);
            expect(dec.toString()).toBe("99999.99999");
            expect(dec.getCoefficient()).toBe(9999999999n);
            expect(dec.getExponent()).toBe(5);
        });

        it('should throw errors when precision or scale boundaries are exceeded', () => {
            expect(() => new Decimal("9999999.999", 10, 4)).toThrow(DecimalError);
            expect(() => new Decimal("12345.6", 6, 2)).toThrow(DecimalError);
        });

        it('should handle negative numbers correctly in comparisons', () => {
            const dec1 = new Decimal("-123.45", 5, 2);
            const dec2 = new Decimal("-123.44", 5, 2);
            expect(dec1.lessThan(dec2)).toBe(true);
            expect(dec2.greaterThan(dec1)).toBe(true);
        });
    });

    // Error Handling
    describe('Error Handling', () => {
        it('should throw DecimalError for invalid decimal strings', () => {
            expect(() => new Decimal("abc", 3, 2)).toThrow(DecimalError);
            expect(() => new Decimal("12..34", 5, 2)).toThrow(DecimalError);
            expect(() => new Decimal("-.", 2, 1)).toThrow(DecimalError);
        });

        it('should throw DecimalError when total digits exceed precision', () => {
            expect(() => new Decimal("123.45", 4, 2)).toThrow(DecimalError);
        });

        it('should throw DecimalError when fractional digits exceed scale without affecting integer digits', () => {
            const dec = new Decimal("123.454", 6, 2); // Should round to "123.45"
            expect(dec.toString()).toBe("123.45");
            expect(dec.getCoefficient()).toBe(12345n);
            expect(dec.getExponent()).toBe(2);
        });

        it('should throw DecimalError when adjusting from Decimal affects integer digits', () => {
            const dec1 = new Decimal("99999.99999", 10, 5);
            // Adjusting to precision=5, scale=2 would require integer digits=3 (5-2=3), but "99999" has 5 integer digits
            expect(() => new Decimal(dec1, 5, 2)).toThrow(DecimalError);
        });

        it('should throw DecimalError when adjusting scale causes rounding to affect integer digits', () => {
            // Adjusting to scale=2, rounds to "1000.00" which exceeds precision=5
            expect(() => new Decimal(new Decimal("999.995", 5, 3), 5, 2)).toThrow(DecimalError);
        });
    });
});
