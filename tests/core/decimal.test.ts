import Decimal, { DecimalError } from '../../src/core/decimal';

describe('Decimal', () => {
  it('should create a Decimal from string and number', () => {
    expect(new Decimal('123.45').toString()).toBe('123.45');
    expect(new Decimal(123.45, 5, 2).toString()).toBe('123.45');
  });

  it('should throw DecimalError for invalid input', () => {
    expect(() => new Decimal('abc')).toThrow(DecimalError);
    expect(() => new Decimal(NaN)).toThrow(DecimalError);
  });

  it('should add, subtract, multiply, and divide correctly', () => {
    const a = new Decimal('1.23');
    const b = new Decimal('4.565');
    expect(a.add(b).toString()).toBe('5.80');
    expect(b.sub(a).toString()).toBe('3.335');
    expect(a.mul(b).toString()).toBe('5.62');
    expect(b.div(a).toString()).toBe('3.71');
  });

  it('should handle rounding and precision', () => {
    const d = new Decimal('1.23456789', 5, 2);
    expect(d.toString()).toBe('1.23');
  });

  it('should handle overflow and underflow', () => {
    expect(() => new Decimal('1e1000')).toThrow(DecimalError);
    expect(() => new Decimal('1e-1000')).toThrow(DecimalError);
  });

  it('should document error handling and edge cases', () => {
    try {
      new Decimal('not-a-number');
    } catch (e) {
      expect(e).toBeInstanceOf(DecimalError);
      expect((e as Error).message).toMatch(/invalid/i);
    }
  });
});
