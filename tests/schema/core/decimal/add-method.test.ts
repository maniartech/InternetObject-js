import Decimal from '../../../../src/core/decimal/decimal';

describe('Decimal Addition Tests', () => {
  test('should correctly add two decimal values with same precision and scale', () => {
    const a = new Decimal('123.45', 5, 2);
    const b = new Decimal('67.89', 5, 2);
    const result = a.add(b);
    expect(result.toString()).toBe('191.34');
  });

  test('should correctly add two decimal values with different scales', () => {
    const a = new Decimal('123.45', 5, 2);
    const b = new Decimal('67.8', 4, 1);
    const result = a.add(b);
    expect(result.toString()).toBe('191.25');
  });

  test('should correctly add two decimal values with different precision', () => {
    const a = new Decimal('123.45', 5, 2);
    const b = new Decimal('67.89', 4, 2);
    const result = a.add(b);
    expect(result.toString()).toBe('191.34');
  });

  test('should correctly add negative values', () => {
    const a = new Decimal('-123.45', 5, 2);
    const b = new Decimal('67.89', 5, 2);
    const result = a.add(b);
    expect(result.toString()).toBe('-55.56');
  });

  test('should correctly add values resulting in zero', () => {
    const a = new Decimal('123.45', 5, 2);
    const b = new Decimal('-123.45', 5, 2);
    const result = a.add(b);
    expect(result.toString()).toBe('0.00');
  });
});