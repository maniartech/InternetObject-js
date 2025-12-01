import Decimal from '../src/core/decimal/decimal';

describe('Extreme Precision Decimal Tests', () => {

    describe('Very High Precision Fractional Numbers', () => {
        test('should handle extreme precision decimal addition', () => {
            // Test with your extreme precision number
            const highPrecisionStr = '0.94859023485891237458907238904572390873589273498573875834758237458237457862347572394785827345872334857238457238475823745823745928349582394582394859238459238459823495823945829348582374582734587234857238475823745823774582374587234857234857234523452345234523452345728374582374587234857238475823745823478956223784652783645726345762374562734658237458972348572834752374589237458237458723485723847523874582374582734587238457238475823745827345872345872348572345';

            // Add a simple decimal
            const simpleDecimal = '0.1';

            const a = new Decimal(highPrecisionStr, 501, 500);
            const b = new Decimal(simpleDecimal, 2, 1);

            const result = a.add(b);

            console.log('a precision:', a.getPrecision(), 'scale:', a.getScale());
            console.log('b precision:', b.getPrecision(), 'scale:', b.getScale());
            console.log('result precision:', result.getPrecision(), 'scale:', result.getScale());
            console.log('result starts with:', result.toString().substring(0, 50));

            // Should preserve the high precision scale
            expect(result.getScale()).toBe(500); // max(500, 1) = 500
            expect(result.getPrecision()).toBeGreaterThanOrEqual(501);

            // Should start with 1.048590... (0.948... + 0.1)
            expect(result.toString()).toMatch(/^1\.048590/);
        });

        test('should handle addition of two extreme precision numbers', () => {
            // Two high precision numbers
            const num1 = '0.' + '1'.repeat(300); // 0.111...111 (300 ones)
            const num2 = '0.' + '2'.repeat(300); // 0.222...222 (300 twos)

            const a = new Decimal(num1, 301, 300);
            const b = new Decimal(num2, 301, 300);

            const result = a.add(b);

            // Should be 0.333...333 (300 threes)
            const expected = '0.' + '3'.repeat(300);
            expect(result.toString()).toBe(expected);
            expect(result.getScale()).toBe(300);
            expect(result.getPrecision()).toBe(302); // Precision expands as needed
        });
    });
});