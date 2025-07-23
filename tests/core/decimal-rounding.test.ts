/**
 * Test suite for Decimal class rounding methods
 * 
 * Comprehensive tests covering round, ceil, and floor methods with various edge cases
 * including positive, negative, zero, boundary values, and coefficients with hundreds of digits.
 */

import Decimal, { DecimalError } from '../../src/core/decimal';

describe('Decimal Rounding Methods', () => {

    describe('round method', () => {

        test('should round half up for positive numbers', () => {
            // Test exact half cases
            expect(new Decimal('1.25', 3, 2).round(3, 1).toString()).toBe('1.3');
            expect(new Decimal('1.35', 3, 2).round(3, 1).toString()).toBe('1.4');
            expect(new Decimal('1.5', 2, 1).round(2, 0).toString()).toBe('2');

            // Test less than half cases
            expect(new Decimal('1.24', 3, 2).round(3, 1).toString()).toBe('1.2');
            expect(new Decimal('1.34', 3, 2).round(3, 1).toString()).toBe('1.3');
            expect(new Decimal('1.4', 2, 1).round(2, 0).toString()).toBe('1');

            // Test greater than half cases
            expect(new Decimal('1.26', 3, 2).round(3, 1).toString()).toBe('1.3');
            expect(new Decimal('1.36', 3, 2).round(3, 1).toString()).toBe('1.4');
            expect(new Decimal('1.6', 2, 1).round(2, 0).toString()).toBe('2');
        });

        test('should round half up for negative numbers', () => {
            // Test exact half cases
            expect(new Decimal('-1.25', 3, 2).round(3, 1).toString()).toBe('-1.3');
            expect(new Decimal('-1.35', 3, 2).round(3, 1).toString()).toBe('-1.4');
            expect(new Decimal('-1.5', 2, 1).round(2, 0).toString()).toBe('-2');

            // Test less than half cases
            expect(new Decimal('-1.24', 3, 2).round(3, 1).toString()).toBe('-1.2');
            expect(new Decimal('-1.34', 3, 2).round(3, 1).toString()).toBe('-1.3');
            expect(new Decimal('-1.4', 2, 1).round(2, 0).toString()).toBe('-1');

            // Test greater than half cases
            expect(new Decimal('-1.26', 3, 2).round(3, 1).toString()).toBe('-1.3');
            expect(new Decimal('-1.36', 3, 2).round(3, 1).toString()).toBe('-1.4');
            expect(new Decimal('-1.6', 2, 1).round(2, 0).toString()).toBe('-2');
        });

        test('should handle zero values', () => {
            expect(new Decimal('0', 1, 0).round(1, 0).toString()).toBe('0');
            expect(new Decimal('0.0', 2, 1).round(2, 1).toString()).toBe('0.0');
            expect(new Decimal('0.00', 3, 2).round(3, 2).toString()).toBe('0.00');
            expect(new Decimal('0.00', 3, 2).round(3, 1).toString()).toBe('0.0');
            expect(new Decimal('0.00', 3, 2).round(3, 0).toString()).toBe('0');
        });

        test('should handle scale increase (no rounding needed)', () => {
            expect(new Decimal('123.45', 5, 2).round(6, 3).toString()).toBe('123.450');
            expect(new Decimal('123.45', 5, 2).round(7, 4).toString()).toBe('123.4500');
            expect(new Decimal('-123.45', 5, 2).round(6, 3).toString()).toBe('-123.450');
            expect(new Decimal('-123.45', 5, 2).round(7, 4).toString()).toBe('-123.4500');
        });

        test('should handle scale decrease with rounding', () => {
            expect(new Decimal('123.456', 6, 3).round(6, 2).toString()).toBe('123.46');
            expect(new Decimal('123.454', 6, 3).round(6, 2).toString()).toBe('123.45');
            expect(new Decimal('123.456', 6, 3).round(6, 1).toString()).toBe('123.5');
            expect(new Decimal('123.456', 6, 3).round(6, 0).toString()).toBe('123');

            expect(new Decimal('-123.456', 6, 3).round(6, 2).toString()).toBe('-123.46');
            expect(new Decimal('-123.454', 6, 3).round(6, 2).toString()).toBe('-123.45');
            expect(new Decimal('-123.456', 6, 3).round(6, 1).toString()).toBe('-123.5');
            expect(new Decimal('-123.456', 6, 3).round(6, 0).toString()).toBe('-123');
        });

        test('should handle boundary values', () => {
            // Rounding that causes carry over
            expect(new Decimal('9.99', 3, 2).round(3, 1).toString()).toBe('10.0');
            expect(new Decimal('0.999', 4, 3).round(4, 2).toString()).toBe('1.00');
            expect(new Decimal('999.9', 4, 1).round(4, 0).toString()).toBe('1000');

            // Negative boundary values
            expect(new Decimal('-9.99', 3, 2).round(3, 1).toString()).toBe('-10.0');
            expect(new Decimal('-0.999', 4, 3).round(4, 2).toString()).toBe('-1.00');
            expect(new Decimal('-999.9', 4, 1).round(4, 0).toString()).toBe('-1000');
        });

        test('should handle very large numbers', () => {
            // Create a very large number
            const largeNumber = '1' + '2'.repeat(100) + '.' + '3'.repeat(50);
            const decimal = new Decimal(largeNumber, 151, 50);

            // Round to fewer decimal places
            const rounded = decimal.round(151, 10);
            expect(rounded.toString()).toBe('1' + '2'.repeat(100) + '.' + '3'.repeat(10));

            // Round to integer
            const roundedInt = decimal.round(151, 0);
            expect(roundedInt.toString()).toBe('1' + '2'.repeat(100));
        });

        test('should throw error for invalid precision and scale', () => {
            const decimal = new Decimal('123.45', 5, 2);

            // Scale > precision
            expect(() => decimal.round(2, 3)).toThrow(DecimalError);

            // Negative precision
            expect(() => decimal.round(-1, 0)).toThrow(DecimalError);

            // Negative scale
            expect(() => decimal.round(5, -1)).toThrow(DecimalError);
        });
    });

    describe('ceil method', () => {

        test('should ceiling round positive numbers (always round up)', () => {
            // Any positive remainder should round up
            expect(new Decimal('1.21', 3, 2).ceil(3, 1).toString()).toBe('1.3');
            expect(new Decimal('1.25', 3, 2).ceil(3, 1).toString()).toBe('1.3');
            expect(new Decimal('1.29', 3, 2).ceil(3, 1).toString()).toBe('1.3');

            // No remainder, no rounding
            expect(new Decimal('1.20', 3, 2).ceil(3, 1).toString()).toBe('1.2');
            expect(new Decimal('1.30', 3, 2).ceil(3, 1).toString()).toBe('1.3');
            expect(new Decimal('1.40', 3, 2).ceil(3, 1).toString()).toBe('1.4');

            // Integer values
            expect(new Decimal('1.00', 3, 2).ceil(3, 0).toString()).toBe('1');
            expect(new Decimal('2.00', 3, 2).ceil(3, 0).toString()).toBe('2');
        });

        test('should ceiling round negative numbers (towards zero)', () => {
            // Negative numbers with remainder should round towards zero
            expect(new Decimal('-1.21', 3, 2).ceil(3, 1).toString()).toBe('-1.2');
            expect(new Decimal('-1.25', 3, 2).ceil(3, 1).toString()).toBe('-1.2');
            expect(new Decimal('-1.29', 3, 2).ceil(3, 1).toString()).toBe('-1.2');

            // No remainder, no rounding
            expect(new Decimal('-1.20', 3, 2).ceil(3, 1).toString()).toBe('-1.2');
            expect(new Decimal('-1.30', 3, 2).ceil(3, 1).toString()).toBe('-1.3');
            expect(new Decimal('-1.40', 3, 2).ceil(3, 1).toString()).toBe('-1.4');

            // Integer values
            expect(new Decimal('-1.00', 3, 2).ceil(3, 0).toString()).toBe('-1');
            expect(new Decimal('-2.00', 3, 2).ceil(3, 0).toString()).toBe('-2');
        });

        test('should handle zero values', () => {
            expect(new Decimal('0', 1, 0).ceil(1, 0).toString()).toBe('0');
            expect(new Decimal('0.0', 2, 1).ceil(2, 1).toString()).toBe('0.0');
            expect(new Decimal('0.00', 3, 2).ceil(3, 2).toString()).toBe('0.00');
            expect(new Decimal('0.00', 3, 2).ceil(3, 1).toString()).toBe('0.0');
            expect(new Decimal('0.00', 3, 2).ceil(3, 0).toString()).toBe('0');
        });

        test('should handle scale increase (no rounding needed)', () => {
            expect(new Decimal('123.45', 5, 2).ceil(6, 3).toString()).toBe('123.450');
            expect(new Decimal('123.45', 5, 2).ceil(7, 4).toString()).toBe('123.4500');
            expect(new Decimal('-123.45', 5, 2).ceil(6, 3).toString()).toBe('-123.450');
            expect(new Decimal('-123.45', 5, 2).ceil(7, 4).toString()).toBe('-123.4500');
        });

        test('should handle scale decrease with ceiling rounding', () => {
            // Positive numbers round up with any remainder
            expect(new Decimal('123.451', 6, 3).ceil(6, 2).toString()).toBe('123.46');
            expect(new Decimal('123.450', 6, 3).ceil(6, 2).toString()).toBe('123.45');
            expect(new Decimal('123.401', 6, 3).ceil(6, 2).toString()).toBe('123.41');

            // Negative numbers round towards zero
            expect(new Decimal('-123.451', 6, 3).ceil(6, 2).toString()).toBe('-123.45');
            expect(new Decimal('-123.459', 6, 3).ceil(6, 2).toString()).toBe('-123.45');
            expect(new Decimal('-123.450', 6, 3).ceil(6, 2).toString()).toBe('-123.45');
        });

        test('should handle boundary values', () => {
            // Rounding that causes carry over
            expect(new Decimal('9.91', 3, 2).ceil(3, 1).toString()).toBe('10.0');
            expect(new Decimal('0.991', 4, 3).ceil(4, 2).toString()).toBe('1.00');
            expect(new Decimal('999.1', 4, 1).ceil(4, 0).toString()).toBe('1000');

            // Negative boundary values (no carry over due to ceiling behavior)
            expect(new Decimal('-9.99', 3, 2).ceil(3, 1).toString()).toBe('-9.9');
            expect(new Decimal('-0.999', 4, 3).ceil(4, 2).toString()).toBe('-0.99');
            expect(new Decimal('-999.9', 4, 1).ceil(4, 0).toString()).toBe('-999');
        });

        test('should handle very large numbers', () => {
            // Create a very large number
            const largeNumber = '1' + '2'.repeat(100) + '.' + '3'.repeat(50);
            const decimal = new Decimal(largeNumber, 151, 50);

            // Ceiling to fewer decimal places
            const ceiled = decimal.ceil(151, 10);
            expect(ceiled.toString()).toBe('1' + '2'.repeat(100) + '.' + '3'.repeat(9) + '4');

            // Ceiling to integer
            const ceiledInt = decimal.ceil(151, 0);
            expect(ceiledInt.toString()).toBe('1' + '2'.repeat(99) + '3');

            // Create a number with non-zero digits to test ceiling behavior
            const largeNumberWithRemainder = '1' + '2'.repeat(100) + '.' + '3'.repeat(49) + '1';
            const decimalWithRemainder = new Decimal(largeNumberWithRemainder, 151, 50);

            // Ceiling to fewer decimal places should round up
            const ceiledWithRemainder = decimalWithRemainder.ceil(151, 49);
            expect(ceiledWithRemainder.toString()).toBe('1' + '2'.repeat(100) + '.' + '3'.repeat(49 - 1) + '4');
        });

        test('should throw error for invalid precision and scale', () => {
            const decimal = new Decimal('123.45', 5, 2);

            // Scale > precision
            expect(() => decimal.ceil(2, 3)).toThrow(DecimalError);

            // Negative precision
            expect(() => decimal.ceil(-1, 0)).toThrow(DecimalError);

            // Negative scale
            expect(() => decimal.ceil(5, -1)).toThrow(DecimalError);
        });
    });

    describe('floor method', () => {

        test('should floor round positive numbers (towards zero)', () => {
            // Positive numbers with remainder should round towards zero
            expect(new Decimal('1.21', 3, 2).floor(3, 1).toString()).toBe('1.2');
            expect(new Decimal('1.25', 3, 2).floor(3, 1).toString()).toBe('1.2');
            expect(new Decimal('1.29', 3, 2).floor(3, 1).toString()).toBe('1.2');

            // No remainder, no rounding
            expect(new Decimal('1.20', 3, 2).floor(3, 1).toString()).toBe('1.2');
            expect(new Decimal('1.30', 3, 2).floor(3, 1).toString()).toBe('1.3');
            expect(new Decimal('1.40', 3, 2).floor(3, 1).toString()).toBe('1.4');

            // Integer values
            expect(new Decimal('1.00', 3, 2).floor(3, 0).toString()).toBe('1');
            expect(new Decimal('2.00', 3, 2).floor(3, 0).toString()).toBe('2');
        });

        test('should floor round negative numbers (always round down)', () => {
            // Any negative remainder should round down
            expect(new Decimal('-1.21', 3, 2).floor(3, 1).toString()).toBe('-1.3');
            expect(new Decimal('-1.25', 3, 2).floor(3, 1).toString()).toBe('-1.3');
            expect(new Decimal('-1.29', 3, 2).floor(3, 1).toString()).toBe('-1.3');

            // No remainder, no rounding
            expect(new Decimal('-1.20', 3, 2).floor(3, 1).toString()).toBe('-1.2');
            expect(new Decimal('-1.30', 3, 2).floor(3, 1).toString()).toBe('-1.3');
            expect(new Decimal('-1.40', 3, 2).floor(3, 1).toString()).toBe('-1.4');

            // Integer values
            expect(new Decimal('-1.00', 3, 2).floor(3, 0).toString()).toBe('-1');
            expect(new Decimal('-2.00', 3, 2).floor(3, 0).toString()).toBe('-2');
        });

        test('should handle zero values', () => {
            expect(new Decimal('0', 1, 0).floor(1, 0).toString()).toBe('0');
            expect(new Decimal('0.0', 2, 1).floor(2, 1).toString()).toBe('0.0');
            expect(new Decimal('0.00', 3, 2).floor(3, 2).toString()).toBe('0.00');
            expect(new Decimal('0.00', 3, 2).floor(3, 1).toString()).toBe('0.0');
            expect(new Decimal('0.00', 3, 2).floor(3, 0).toString()).toBe('0');
        });

        test('should handle scale increase (no rounding needed)', () => {
            expect(new Decimal('123.45', 5, 2).floor(6, 3).toString()).toBe('123.450');
            expect(new Decimal('123.45', 5, 2).floor(7, 4).toString()).toBe('123.4500');
            expect(new Decimal('-123.45', 5, 2).floor(6, 3).toString()).toBe('-123.450');
            expect(new Decimal('-123.45', 5, 2).floor(7, 4).toString()).toBe('-123.4500');
        });

        test('should handle scale decrease with floor rounding', () => {
            // Positive numbers round towards zero
            expect(new Decimal('123.451', 6, 3).floor(6, 2).toString()).toBe('123.45');
            expect(new Decimal('123.459', 6, 3).floor(6, 2).toString()).toBe('123.45');
            expect(new Decimal('123.450', 6, 3).floor(6, 2).toString()).toBe('123.45');

            // Negative numbers round down with any remainder
            expect(new Decimal('-123.451', 6, 3).floor(6, 2).toString()).toBe('-123.46');
            expect(new Decimal('-123.450', 6, 3).floor(6, 2).toString()).toBe('-123.45');
            expect(new Decimal('-123.401', 6, 3).floor(6, 2).toString()).toBe('-123.41');
        });

        test('should handle boundary values', () => {
            // Positive boundary values (no carry over due to floor behavior)
            expect(new Decimal('9.99', 3, 2).floor(3, 1).toString()).toBe('9.9');
            expect(new Decimal('0.999', 4, 3).floor(4, 2).toString()).toBe('0.99');
            expect(new Decimal('999.9', 4, 1).floor(4, 0).toString()).toBe('999');

            // Negative boundary values with carry over
            expect(new Decimal('-9.91', 3, 2).floor(3, 1).toString()).toBe('-10.0');
            expect(new Decimal('-0.991', 4, 3).floor(4, 2).toString()).toBe('-1.00');
            expect(new Decimal('-999.1', 4, 1).floor(4, 0).toString()).toBe('-1000');
        });

        test('should handle very large numbers', () => {
            // Create a very large number
            const largeNumber = '1' + '2'.repeat(100) + '.' + '3'.repeat(50);
            const decimal = new Decimal(largeNumber, 151, 50);

            // Floor to fewer decimal places
            const floored = decimal.floor(151, 10);
            expect(floored.toString()).toBe('1' + '2'.repeat(100) + '.' + '3'.repeat(10));

            // Floor to integer
            const flooredInt = decimal.floor(151, 0);
            expect(flooredInt.toString()).toBe('1' + '2'.repeat(100));

            // Create a number with non-zero digits to test floor behavior
            const largeNumberWithRemainder = '1' + '2'.repeat(100) + '.' + '3'.repeat(49) + '1';
            const decimalWithRemainder = new Decimal(largeNumberWithRemainder, 151, 50);

            // Floor to fewer decimal places should round down for positive numbers
            const flooredWithRemainder = decimalWithRemainder.floor(151, 49);
            expect(flooredWithRemainder.toString()).toBe('1' + '2'.repeat(100) + '.' + '3'.repeat(49));
        });

        test('should throw error for invalid precision and scale', () => {
            const decimal = new Decimal('123.45', 5, 2);

            // Scale > precision
            expect(() => decimal.floor(2, 3)).toThrow(DecimalError);

            // Negative precision
            expect(() => decimal.floor(-1, 0)).toThrow(DecimalError);

            // Negative scale
            expect(() => decimal.floor(5, -1)).toThrow(DecimalError);
        });
    });

    describe('Rounding Methods Integration', () => {

        test('should demonstrate different rounding behaviors for the same value', () => {
            const decimal = new Decimal('1.25', 3, 2);

            // Round half up
            expect(decimal.round(3, 1).toString()).toBe('1.3');

            // Ceiling (always round up for positive)
            expect(decimal.ceil(3, 1).toString()).toBe('1.3');

            // Floor (always round down/towards zero for positive)
            expect(decimal.floor(3, 1).toString()).toBe('1.2');

            // Negative case
            const negDecimal = new Decimal('-1.25', 3, 2);

            // Round half up (away from zero)
            expect(negDecimal.round(3, 1).toString()).toBe('-1.3');

            // Ceiling (towards zero for negative)
            expect(negDecimal.ceil(3, 1).toString()).toBe('-1.2');

            // Floor (away from zero for negative)
            expect(negDecimal.floor(3, 1).toString()).toBe('-1.3');
        });

        test('should handle extreme precision and scale differences', () => {
            // Create a decimal with high precision and scale
            const decimal = new Decimal('123456789.987654321', 18, 9);

            // Round to different scales
            expect(decimal.round(18, 5).toString()).toBe('123456789.98765');
            expect(decimal.round(18, 0).toString()).toBe('123456790');

            // Ceiling to different scales
            expect(decimal.ceil(18, 5).toString()).toBe('123456789.98766');
            expect(decimal.ceil(18, 0).toString()).toBe('123456790');

            // Floor to different scales
            expect(decimal.floor(18, 5).toString()).toBe('123456789.98765');
            expect(decimal.floor(18, 0).toString()).toBe('123456789');
        });

        test('should maintain precision constraints', () => {
            // Create a decimal with precision 5, scale 2
            const decimal = new Decimal('123.45', 5, 2);

            // Round to same precision, different scale
            const rounded = decimal.round(5, 1);
            expect(rounded.getPrecision()).toBe(5);
            expect(rounded.getScale()).toBe(1);
            expect(rounded.toString()).toBe('123.5');

            // Ceiling to same precision, different scale
            const ceiled = decimal.ceil(5, 1);
            expect(ceiled.getPrecision()).toBe(5);
            expect(ceiled.getScale()).toBe(1);
            expect(ceiled.toString()).toBe('123.5');

            // Floor to same precision, different scale
            const floored = decimal.floor(5, 1);
            expect(floored.getPrecision()).toBe(5);
            expect(floored.getScale()).toBe(1);
            expect(floored.toString()).toBe('123.4');
        });

        test('should handle rounding at precision boundaries', () => {
            // Create a decimal at precision boundary
            const decimal = new Decimal('9.99', 3, 2);

            // Round up causes precision increase
            const rounded = decimal.round(3, 1);
            expect(rounded.toString()).toBe('10.0');
            expect(rounded.getPrecision()).toBe(3);
            expect(rounded.getScale()).toBe(1);

            // Ceiling causes precision increase
            const ceiled = decimal.ceil(3, 1);
            expect(ceiled.toString()).toBe('10.0');
            expect(ceiled.getPrecision()).toBe(3);
            expect(ceiled.getScale()).toBe(1);

            // Floor stays within precision
            const floored = decimal.floor(3, 1);
            expect(floored.toString()).toBe('9.9');
            expect(floored.getPrecision()).toBe(3);
            expect(floored.getScale()).toBe(1);
        });
    });
});