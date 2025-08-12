import Decimal from '../../../../src/core/decimal';

describe('Decimal Addition - Precision and Scale Behavior', () => {
    test('Addition uses RDBMS precision/scale (scale=max, precision accommodates carry)', () => {
        // First operand: precision 6, scale 2
        const a = new Decimal('1.25', 6, 2);

        // Second operand: precision 5, scale 1
        const b = new Decimal('2350.7', 5, 1);

        const result = a.add(b);

        // Result: scale = max(2,1) = 2; precision = max(intDigits) + scale + 1 = 4 + 2 + 1 = 7
        expect(result.getScale()).toBe(2);
        expect(result.getPrecision()).toBe(7);
        expect(result.toString()).toBe('2351.95');
    });

    test('Reverse order yields same RDBMS precision/scale and value', () => {
        const a = new Decimal('2350.7', 5, 1);
        const b = new Decimal('1.25', 6, 2);
        const result = a.add(b);
        expect(result.getScale()).toBe(2);
        expect(result.getPrecision()).toBe(7);
        expect(result.toString()).toBe('2351.95');
    });

    test('Same precision/scale operands (result precision may expand for carry)', () => {
        const a = new Decimal('1.25', 6, 2);
        const b = new Decimal('2350.70', 6, 2);
        const result = a.add(b);

        expect(result.getScale()).toBe(2);
        expect(result.getPrecision()).toBeGreaterThanOrEqual(6);
        expect(result.toString()).toBe('2351.95');
    });
});