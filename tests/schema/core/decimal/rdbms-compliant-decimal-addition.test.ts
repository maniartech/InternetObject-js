import Decimal from '../../../../src/core/decimal';

describe('RDBMS Compliant Decimal Addition', () => {

    describe('Scale Compliance (max(scale1, scale2))', () => {
        test('different scales - result uses maximum scale', () => {
            const a = new Decimal('123.45', 5, 2);  // scale 2
            const b = new Decimal('67.8', 4, 1);    // scale 1
            const result = a.add(b);

            expect(result.getScale()).toBe(2); // max(2, 1) = 2
            expect(result.toString()).toBe('191.25'); // 67.8 becomes 67.80
        });

        test('reverse order - same result scale', () => {
            const a = new Decimal('67.8', 4, 1);    // scale 1
            const b = new Decimal('123.45', 5, 2);  // scale 2
            const result = a.add(b);

            expect(result.getScale()).toBe(2); // max(1, 2) = 2
            expect(result.toString()).toBe('191.25'); // 67.8 becomes 67.80
        });

        test('same scales - preserve scale', () => {
            const a = new Decimal('123.45', 5, 2);
            const b = new Decimal('67.89', 5, 2);
            const result = a.add(b);

            expect(result.getScale()).toBe(2); // max(2, 2) = 2
            expect(result.toString()).toBe('191.34');
        });

        test('zero scale with fractional scale', () => {
            const a = new Decimal('123', 3, 0);     // integer
            const b = new Decimal('45.67', 4, 2);   // fractional
            const result = a.add(b);

            expect(result.getScale()).toBe(2); // max(0, 2) = 2
            expect(result.toString()).toBe('168.67'); // 123 becomes 123.00
        });

        test('high scale difference', () => {
            const a = new Decimal('1.2', 2, 1);       // scale 1
            const b = new Decimal('3.45678', 6, 5);   // scale 5
            const result = a.add(b);

            expect(result.getScale()).toBe(5); // max(1, 5) = 5
            expect(result.toString()).toBe('4.65678'); // 1.2 becomes 1.20000
        });
    });

    describe('Precision Compliance (RDBMS Formula)', () => {
        test('basic precision calculation', () => {
            const a = new Decimal('123.45', 5, 2);  // 3 integer digits, 2 fractional
            const b = new Decimal('67.8', 4, 1);    // 2 integer digits, 1 fractional
            const result = a.add(b);

            // Expected: max(3, 2) + max(2, 1) + 1 = 3 + 2 + 1 = 6
            expect(result.getPrecision()).toBe(6);
            expect(result.toString()).toBe('191.25');
        });

        test('carry case - precision accommodates overflow', () => {
            const a = new Decimal('999.99', 5, 2);  // 3 integer digits, 2 fractional
            const b = new Decimal('0.01', 3, 2);    // 1 integer digit, 2 fractional
            const result = a.add(b);

            // Expected: max(3, 1) + 2 + 1 = 6, result is 1000.00 (6 digits total)
            expect(result.getPrecision()).toBe(6);
            expect(result.toString()).toBe('1000.00');
        });

        test('large precision calculation', () => {
            const a = new Decimal('123456.789', 9, 3);   // 6 integer, 3 fractional
            const b = new Decimal('987.65', 5, 2);       // 3 integer, 2 fractional
            const result = a.add(b);

            // Expected: max(6, 3) + max(3, 2) + 1 = 6 + 3 + 1 = 10
            expect(result.getPrecision()).toBe(10);
            expect(result.getScale()).toBe(3); // max(3, 2) = 3
            expect(result.toString()).toBe('124444.439'); // 987.65 becomes 987.650
        });
    });

    describe('Real-world RDBMS Examples', () => {
        test('SQL Server: DECIMAL(10,4) + DECIMAL(8,2)', () => {
            const a = new Decimal('123456.7890', 10, 4);
            const b = new Decimal('987.65', 8, 2);
            const result = a.add(b);

            expect(result.getScale()).toBe(4); // max(4, 2) = 4
            expect(result.toString()).toBe('124444.4390'); // 987.65 becomes 987.6500
            // Precision: max(6, 6) + 4 + 1 = 11
            expect(result.getPrecision()).toBe(11);
        });

        test('PostgreSQL: NUMERIC(12,6) + NUMERIC(8,3)', () => {
            const a = new Decimal('123456.789012', 12, 6);
            const b = new Decimal('98765.432', 8, 3);
            const result = a.add(b);

            expect(result.getScale()).toBe(6); // max(6, 3) = 6
            expect(result.toString()).toBe('222222.221012'); // 98765.432 becomes 98765.432000
            // Precision: max(6, 5) + 6 + 1 = 13
            expect(result.getPrecision()).toBe(13);
        });

        test('Oracle: NUMBER(15,8) + NUMBER(10,3)', () => {
            const a = new Decimal('1234567.12345678', 15, 8);
            const b = new Decimal('9876543.210', 10, 3);
            const result = a.add(b);

            expect(result.getScale()).toBe(8); // max(8, 3) = 8
            expect(result.toString()).toBe('11111110.33345678'); // 9876543.210 becomes 9876543.21000000
            // Precision: max(7, 7) + 8 + 1 = 16
            expect(result.getPrecision()).toBe(16);
        });
    });

    describe('Edge Cases and Large Numbers', () => {
        test('very large numbers', () => {
            const a = new Decimal('999999999999999999999999999999.99', 32, 2);
            const b = new Decimal('1.01', 3, 2);
            const result = a.add(b);

            expect(result.getScale()).toBe(2); // max(2, 2) = 2
            expect(result.toString()).toBe('1000000000000000000000000000001.00');
            // Precision should accommodate the result
            expect(result.getPrecision()).toBeGreaterThanOrEqual(32);
        });

        test('asymmetric precision operands', () => {
            const a = new Decimal('1.23', 3, 2);           // small precision
            const b = new Decimal('9876543210.987654', 16, 6); // large precision
            const result = a.add(b);

            expect(result.getScale()).toBe(6); // max(2, 6) = 6
            expect(result.toString()).toBe('9876543212.217654'); // 1.23 becomes 1.230000
            // Precision: max(1, 10) + 6 + 1 = 17
            expect(result.getPrecision()).toBe(17);
        });

        test('maximum scale scenarios', () => {
            const a = new Decimal('0.123456789012345678901234567890', 30, 30);
            const b = new Decimal('0.987654321098765432109876543210', 30, 30);
            const result = a.add(b);

            expect(result.getScale()).toBe(30); // max(30, 30) = 30
            expect(result.toString()).toBe('1.111111110111111111011111111100');
            // Precision: max(0, 0) + 30 + 1 = 31
            expect(result.getPrecision()).toBe(31);
        });

        test('zero operands', () => {
            const a = new Decimal('0.00', 3, 2);
            const b = new Decimal('0.000', 4, 3);
            const result = a.add(b);

            expect(result.getScale()).toBe(3); // max(2, 3) = 3
            expect(result.toString()).toBe('0.000');
            // Precision: max(1, 1) + 3 + 1 = 5
            expect(result.getPrecision()).toBe(5);
        });

        test('negative numbers', () => {
            const a = new Decimal('-123.45', 5, 2);
            const b = new Decimal('67.890', 5, 3);
            const result = a.add(b);

            expect(result.getScale()).toBe(3); // max(2, 3) = 3
            expect(result.toString()).toBe('-55.560'); // -123.45 becomes -123.450
            // Precision: max(3, 2) + 3 + 1 = 7
            expect(result.getPrecision()).toBe(7);
        });
    });

    describe('Precision Overflow Handling', () => {
        test('should handle reasonable precision expansion', () => {
            // Test with numbers that result in precision expansion but within system limits
            const a = new Decimal('999999999999999999999999999999999999999', 39, 0);
            const b = new Decimal('1', 1, 0);

            // Result will be 40 digits, which should be accommodated (within 100 digit limit)
            expect(() => a.add(b)).not.toThrow();
            const result = a.add(b);
            expect(result.toString()).toBe('1000000000000000000000000000000000000000');
            expect(result.getPrecision()).toBe(40); // Expanded to accommodate result
        });

        test('should handle very large results without artificial limits', () => {
            // Test with very large numbers that would exceed traditional RDBMS limits
            // but should work fine with BigInt-based implementation
            const a = new Decimal('9'.repeat(100), 100, 0);
            const b = new Decimal('1', 100, 0);

            // Should work fine - no artificial precision limits for serialization format
            expect(() => a.add(b)).not.toThrow();
            const result = a.add(b);
            expect(result.toString()).toBe('1' + '0'.repeat(100));
            expect(result.getPrecision()).toBe(101); // Expanded to accommodate result
        });
    });

    describe('Bidirectional Consistency', () => {
        test('a + b should equal b + a in scale and precision', () => {
            const a = new Decimal('123.456', 6, 3);
            const b = new Decimal('78.9', 4, 1);

            const result1 = a.add(b);
            const result2 = b.add(a);

            expect(result1.getScale()).toBe(result2.getScale());
            expect(result1.getPrecision()).toBe(result2.getPrecision());
            expect(result1.toString()).toBe(result2.toString());
        });

        test('complex bidirectional test', () => {
            const a = new Decimal('9876543.21', 10, 2);
            const b = new Decimal('1234.56789', 9, 5);

            const result1 = a.add(b);
            const result2 = b.add(a);

            expect(result1.getScale()).toBe(5); // max(2, 5) = 5
            expect(result2.getScale()).toBe(5); // max(5, 2) = 5
            expect(result1.toString()).toBe(result2.toString());
            expect(result1.getPrecision()).toBe(result2.getPrecision());
        });
    });
});