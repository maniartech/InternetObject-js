/**
 * Comprehensive test suite for Decimal class rounding methods
 *
 * Tests round, ceil, and floor methods with various edge cases including:
 * - Positive, negative, and zero values
 * - Boundary values
 * - Very large numbers with hundreds of digits
 * - Precision and scale constraints
 */

import Decimal, { DecimalError } from '../../../src/core/decimal/decimal';

describe('Decimal Rounding Methods - Comprehensive Tests', () => {

  describe('round method', () => {

    test('should handle exact half cases consistently', () => {
      // Positive half cases (round away from zero)
      expect(new Decimal('0.5', 2, 1).round(2, 0).toString()).toBe('1');
      expect(new Decimal('1.5', 2, 1).round(2, 0).toString()).toBe('2');
      expect(new Decimal('2.5', 2, 1).round(2, 0).toString()).toBe('3');
      expect(new Decimal('0.05', 3, 2).round(3, 1).toString()).toBe('0.1');
      expect(new Decimal('0.15', 3, 2).round(3, 1).toString()).toBe('0.2');
      expect(new Decimal('0.25', 3, 2).round(3, 1).toString()).toBe('0.3');

      // Negative half cases (round away from zero)
      expect(new Decimal('-0.5', 2, 1).round(2, 0).toString()).toBe('-1');
      expect(new Decimal('-1.5', 2, 1).round(2, 0).toString()).toBe('-2');
      expect(new Decimal('-2.5', 2, 1).round(2, 0).toString()).toBe('-3');
      expect(new Decimal('-0.05', 3, 2).round(3, 1).toString()).toBe('-0.1');
      expect(new Decimal('-0.15', 3, 2).round(3, 1).toString()).toBe('-0.2');
      expect(new Decimal('-0.25', 3, 2).round(3, 1).toString()).toBe('-0.3');
    });

    test('should handle less than half cases consistently', () => {
      // Positive less than half cases (no rounding)
      expect(new Decimal('0.4', 2, 1).round(2, 0).toString()).toBe('0');
      expect(new Decimal('1.4', 2, 1).round(2, 0).toString()).toBe('1');
      expect(new Decimal('2.4', 2, 1).round(2, 0).toString()).toBe('2');
      expect(new Decimal('0.04', 3, 2).round(3, 1).toString()).toBe('0.0');
      expect(new Decimal('0.14', 3, 2).round(3, 1).toString()).toBe('0.1');
      expect(new Decimal('0.24', 3, 2).round(3, 1).toString()).toBe('0.2');

      // Negative less than half cases (no rounding)
      expect(new Decimal('-0.4', 2, 1).round(2, 0).toString()).toBe('0');
      expect(new Decimal('-1.4', 2, 1).round(2, 0).toString()).toBe('-1');
      expect(new Decimal('-2.4', 2, 1).round(2, 0).toString()).toBe('-2');
      expect(new Decimal('-0.04', 3, 2).round(3, 1).toString()).toBe('0.0');
      expect(new Decimal('-0.14', 3, 2).round(3, 1).toString()).toBe('-0.1');
      expect(new Decimal('-0.24', 3, 2).round(3, 1).toString()).toBe('-0.2');
    });

    test('should handle greater than half cases consistently', () => {
      // Positive greater than half cases (round up)
      expect(new Decimal('0.6', 2, 1).round(2, 0).toString()).toBe('1');
      expect(new Decimal('1.6', 2, 1).round(2, 0).toString()).toBe('2');
      expect(new Decimal('2.6', 2, 1).round(2, 0).toString()).toBe('3');
      expect(new Decimal('0.06', 3, 2).round(3, 1).toString()).toBe('0.1');
      expect(new Decimal('0.16', 3, 2).round(3, 1).toString()).toBe('0.2');
      expect(new Decimal('0.26', 3, 2).round(3, 1).toString()).toBe('0.3');

      // Negative greater than half cases (round down)
      expect(new Decimal('-0.6', 2, 1).round(2, 0).toString()).toBe('-1');
      expect(new Decimal('-1.6', 2, 1).round(2, 0).toString()).toBe('-2');
      expect(new Decimal('-2.6', 2, 1).round(2, 0).toString()).toBe('-3');
      expect(new Decimal('-0.06', 3, 2).round(3, 1).toString()).toBe('-0.1');
      expect(new Decimal('-0.16', 3, 2).round(3, 1).toString()).toBe('-0.2');
      expect(new Decimal('-0.26', 3, 2).round(3, 1).toString()).toBe('-0.3');
    });

    test('should handle boundary cases with carry over', () => {
      // Positive boundary cases
      expect(new Decimal('0.99', 3, 2).round(3, 1).toString()).toBe('1.0');
      expect(new Decimal('9.99', 3, 2).round(3, 1).toString()).toBe('10.0');
      expect(new Decimal('99.9', 3, 1).round(3, 0).toString()).toBe('100');
      expect(new Decimal('999.9', 4, 1).round(4, 0).toString()).toBe('1000');

      // Negative boundary cases
      expect(new Decimal('-0.99', 3, 2).round(3, 1).toString()).toBe('-1.0');
      expect(new Decimal('-9.99', 3, 2).round(3, 1).toString()).toBe('-10.0');
      expect(new Decimal('-99.9', 3, 1).round(3, 0).toString()).toBe('-100');
      expect(new Decimal('-999.9', 4, 1).round(4, 0).toString()).toBe('-1000');
    });

    test('should handle very large coefficients', () => {
      // Create a very large number with hundreds of digits
      const largeInteger = '9'.repeat(100);
      const largeFraction = '9'.repeat(50);
      const largeNumber = largeInteger + '.' + largeFraction;

      const decimal = new Decimal(largeNumber, 151, 50);

      // Round to fewer decimal places
      const rounded = decimal.round(151, 10);
      expect(rounded.toString()).toBe('1' + '0'.repeat(100) + '.' + '0'.repeat(10));

      // Round to integer
      const roundedInt = decimal.round(151, 0);
      expect(roundedInt.toString()).toBe('1' + '0'.repeat(100));
    });
  });

  describe('ceil method', () => {

    test('should handle exact integer values', () => {
      // Positive integers
      expect(new Decimal('1', 1, 0).ceil(1, 0).toString()).toBe('1');
      expect(new Decimal('10', 2, 0).ceil(2, 0).toString()).toBe('10');
      expect(new Decimal('100', 3, 0).ceil(3, 0).toString()).toBe('100');

      // Negative integers
      expect(new Decimal('-1', 1, 0).ceil(1, 0).toString()).toBe('-1');
      expect(new Decimal('-10', 2, 0).ceil(2, 0).toString()).toBe('-10');
      expect(new Decimal('-100', 3, 0).ceil(3, 0).toString()).toBe('-100');
    });

    test('should handle positive fractional values correctly', () => {
      // Any positive remainder should round up
      expect(new Decimal('0.1', 2, 1).ceil(2, 0).toString()).toBe('1');
      expect(new Decimal('0.01', 3, 2).ceil(3, 1).toString()).toBe('0.1');
      expect(new Decimal('0.001', 4, 3).ceil(4, 2).toString()).toBe('0.01');

      // Multiple digits
      expect(new Decimal('1.23', 3, 2).ceil(3, 1).toString()).toBe('1.3');
      expect(new Decimal('12.34', 4, 2).ceil(4, 1).toString()).toBe('12.4');
      expect(new Decimal('123.45', 5, 2).ceil(5, 1).toString()).toBe('123.5');
    });

    test('should handle negative fractional values correctly', () => {
      // Negative numbers with remainder should round towards zero
      expect(new Decimal('-0.1', 2, 1).ceil(2, 0).toString()).toBe('0');
      expect(new Decimal('-0.01', 3, 2).ceil(3, 1).toString()).toBe('0.0');
      expect(new Decimal('-0.001', 4, 3).ceil(4, 2).toString()).toBe('0.00');

      // Multiple digits
      expect(new Decimal('-1.23', 3, 2).ceil(3, 1).toString()).toBe('-1.2');
      expect(new Decimal('-12.34', 4, 2).ceil(4, 1).toString()).toBe('-12.3');
      expect(new Decimal('-123.45', 5, 2).ceil(5, 1).toString()).toBe('-123.4');
    });

    test('should handle boundary cases with carry over', () => {
      // Positive boundary cases
      expect(new Decimal('0.99', 3, 2).ceil(3, 0).toString()).toBe('1');
      expect(new Decimal('9.99', 3, 2).ceil(3, 0).toString()).toBe('10');
      expect(new Decimal('99.9', 3, 1).ceil(3, 0).toString()).toBe('100');

      // Negative boundary cases (no carry over due to ceiling behavior)
      expect(new Decimal('-0.99', 3, 2).ceil(3, 0).toString()).toBe('0');
      expect(new Decimal('-9.99', 3, 2).ceil(3, 0).toString()).toBe('-9');
      expect(new Decimal('-99.9', 3, 1).ceil(3, 0).toString()).toBe('-99');
    });

    test('should handle very large coefficients', () => {
      // Create a very large number with hundreds of digits
      const largeInteger = '9'.repeat(100);
      const largeFraction = '9'.repeat(50);
      const largeNumber = largeInteger + '.' + largeFraction;

      const decimal = new Decimal(largeNumber, 151, 50);

      // Ceiling to fewer decimal places
      const ceiled = decimal.ceil(151, 10);
      expect(ceiled.toString()).toBe('1' + '0'.repeat(100) + '.' + '0'.repeat(10));

      // Ceiling to integer
      const ceiledInt = decimal.ceil(151, 0);
      expect(ceiledInt.toString()).toBe('1' + '0'.repeat(100));
    });
  });

  describe('floor method', () => {

    test('should handle exact integer values', () => {
      // Positive integers
      expect(new Decimal('1', 1, 0).floor(1, 0).toString()).toBe('1');
      expect(new Decimal('10', 2, 0).floor(2, 0).toString()).toBe('10');
      expect(new Decimal('100', 3, 0).floor(3, 0).toString()).toBe('100');

      // Negative integers
      expect(new Decimal('-1', 1, 0).floor(1, 0).toString()).toBe('-1');
      expect(new Decimal('-10', 2, 0).floor(2, 0).toString()).toBe('-10');
      expect(new Decimal('-100', 3, 0).floor(3, 0).toString()).toBe('-100');
    });

    test('should handle positive fractional values correctly', () => {
      // Positive numbers with remainder should round towards zero
      expect(new Decimal('0.1', 2, 1).floor(2, 0).toString()).toBe('0');
      expect(new Decimal('0.01', 3, 2).floor(3, 1).toString()).toBe('0.0');
      expect(new Decimal('0.001', 4, 3).floor(4, 2).toString()).toBe('0.00');

      // Multiple digits
      expect(new Decimal('1.23', 3, 2).floor(3, 1).toString()).toBe('1.2');
      expect(new Decimal('12.34', 4, 2).floor(4, 1).toString()).toBe('12.3');
      expect(new Decimal('123.45', 5, 2).floor(5, 1).toString()).toBe('123.4');
    });

    test('should handle negative fractional values correctly', () => {
      // Any negative remainder should round down
      expect(new Decimal('-0.1', 2, 1).floor(2, 0).toString()).toBe('-1');
      expect(new Decimal('-0.01', 3, 2).floor(3, 1).toString()).toBe('-0.1');
      expect(new Decimal('-0.001', 4, 3).floor(4, 2).toString()).toBe('-0.01');

      // Multiple digits
      expect(new Decimal('-1.23', 3, 2).floor(3, 1).toString()).toBe('-1.3');
      expect(new Decimal('-12.34', 4, 2).floor(4, 1).toString()).toBe('-12.4');
      expect(new Decimal('-123.45', 5, 2).floor(5, 1).toString()).toBe('-123.5');
    });

    test('should handle boundary cases with carry over', () => {
      // Positive boundary cases (no carry over due to floor behavior)
      expect(new Decimal('0.99', 3, 2).floor(3, 0).toString()).toBe('0');
      expect(new Decimal('9.99', 3, 2).floor(3, 0).toString()).toBe('9');
      expect(new Decimal('99.9', 3, 1).floor(3, 0).toString()).toBe('99');

      // Negative boundary cases
      expect(new Decimal('-0.99', 3, 2).floor(3, 0).toString()).toBe('-1');
      expect(new Decimal('-9.99', 3, 2).floor(3, 0).toString()).toBe('-10');
      expect(new Decimal('-99.9', 3, 1).floor(3, 0).toString()).toBe('-100');
    });

    test('should handle very large coefficients', () => {
      // Create a very large number with hundreds of digits
      const largeInteger = '9'.repeat(100);
      const largeFraction = '9'.repeat(50);
      const largeNumber = largeInteger + '.' + largeFraction;

      const decimal = new Decimal(largeNumber, 151, 50);

      // Floor to fewer decimal places
      const floored = decimal.floor(151, 10);
      expect(floored.toString()).toBe('9'.repeat(100) + '.' + '9'.repeat(10));

      // Floor to integer
      const flooredInt = decimal.floor(151, 0);
      expect(flooredInt.toString()).toBe('9'.repeat(100));
    });
  });

  describe('Rounding Methods Comparison', () => {

    test('should demonstrate different behaviors for the same value', () => {
      // Test with positive fractional value
      const posDecimal = new Decimal('1.5', 3, 1);

      expect(posDecimal.round(3, 0).toString()).toBe('2');  // Round half up
      expect(posDecimal.ceil(3, 0).toString()).toBe('2');   // Ceiling always rounds up for positive
      expect(posDecimal.floor(3, 0).toString()).toBe('1');  // Floor always rounds down for positive

      // Test with negative fractional value
      const negDecimal = new Decimal('-1.5', 3, 1);

      expect(negDecimal.round(3, 0).toString()).toBe('-2'); // Round half up (away from zero)
      expect(negDecimal.ceil(3, 0).toString()).toBe('-1');  // Ceiling rounds towards zero for negative
      expect(negDecimal.floor(3, 0).toString()).toBe('-2'); // Floor rounds away from zero for negative
    });

    test('should handle precision and scale constraints consistently', () => {
      const decimal = new Decimal('123.456', 6, 3);

      // Round to same precision, different scale
      const rounded = decimal.round(6, 2);
      const ceiled = decimal.ceil(6, 2);
      const floored = decimal.floor(6, 2);

      expect(rounded.getPrecision()).toBe(6);
      expect(ceiled.getPrecision()).toBe(6);
      expect(floored.getPrecision()).toBe(6);

      expect(rounded.getScale()).toBe(2);
      expect(ceiled.getScale()).toBe(2);
      expect(floored.getScale()).toBe(2);

      expect(rounded.toString()).toBe('123.46'); // Round half up
      expect(ceiled.toString()).toBe('123.46');  // Ceiling rounds up
      expect(floored.toString()).toBe('123.45'); // Floor rounds down
    });
  });
});