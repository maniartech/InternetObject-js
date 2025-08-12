import Decimal from '../src/core/decimal';

describe('RDBMS-Compliant Decimal Addition', () => {

    test('Addition should work in any order with consistent results', () => {
        // Test case: 1.25 + 2350.7
        const a1 = new Decimal('1.25', 4, 2);    // DECIMAL(4,2)
        const b1 = new Decimal('2350.7', 5, 1);  // DECIMAL(5,1)
        const result1 = a1.add(b1);

        // Reverse order: 2350.7 + 1.25
        const a2 = new Decimal('2350.7', 5, 1);  // DECIMAL(5,1)
        const b2 = new Decimal('1.25', 4, 2);    // DECIMAL(4,2)
        const result2 = a2.add(b2);

        console.log('Forward order result:', {
            value: result1.toString(),
            precision: result1.getPrecision(),
            scale: result1.getScale()
        });

        console.log('Reverse order result:', {
            value: result2.toString(),
            precision: result2.getPrecision(),
            scale: result2.getScale()
        });

        // Both should have the same value, precision, and scale
        expect(result1.toString()).toBe(result2.toString());
        expect(result1.getPrecision()).toBe(result2.getPrecision());
        expect(result1.getScale()).toBe(result2.getScale());

        // Result should be 2351.95 with scale 2 (max of 2 and 1)
        expect(result1.toString()).toBe('2351.95');
        expect(result1.getScale()).toBe(2); // max(2, 1) = 2
    });

    test('RDBMS precision calculation for addition', () => {
        // DECIMAL(6,2) + DECIMAL(4,1) should result in appropriate precision
        const a = new Decimal('1234.56', 6, 2);  // 4 integer digits, 2 fractional
        const b = new Decimal('789.1', 4, 1);    // 3 integer digits, 1 fractional
        const result = a.add(b);

        console.log('Addition result:', {
            value: result.toString(),
            precision: result.getPrecision(),
            scale: result.getScale()
        });

        // Expected: max(4, 3) + max(2, 1) + 1 = 4 + 2 + 1 = 7 precision
        // Scale should be max(2, 1) = 2
        expect(result.toString()).toBe('2023.66');
        expect(result.getScale()).toBe(2);
        expect(result.getPrecision()).toBe(7); // Should accommodate the result
    });

    test('Addition with same scales', () => {
        const a = new Decimal('123.45', 5, 2);
        const b = new Decimal('678.90', 5, 2);
        const result = a.add(b);

        // Same scales, so result scale = 2
        // Precision should accommodate the sum
        expect(result.toString()).toBe('802.35');
        expect(result.getScale()).toBe(2);
    });

    test('Addition with very different scales', () => {
        const a = new Decimal('1000', 4, 0);      // DECIMAL(4,0)
        const b = new Decimal('0.123', 3, 3);     // DECIMAL(3,3)
        const result = a.add(b);

        // Result scale should be max(0, 3) = 3
        expect(result.toString()).toBe('1000.123');
        expect(result.getScale()).toBe(3);

        // Test reverse order
        const result2 = b.add(a);
        expect(result2.toString()).toBe('1000.123');
        expect(result2.getScale()).toBe(3);
        expect(result2.getPrecision()).toBe(result.getPrecision());
    });

    test('Addition with potential carry', () => {
        const a = new Decimal('999.99', 5, 2);
        const b = new Decimal('0.01', 3, 2);
        const result = a.add(b);

        // Result should be 1000.00, which needs more integer digits
        expect(result.toString()).toBe('1000.00');
        expect(result.getScale()).toBe(2);
        // Precision should accommodate the carry
        expect(result.getPrecision()).toBeGreaterThanOrEqual(6);
    });
});