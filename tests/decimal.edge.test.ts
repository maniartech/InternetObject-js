import Decimal from '../src/core/decimal';

describe('Decimal Edge Cases', () => {
  it('throws on overflow (too many digits for precision)', () => {
    expect(() => new Decimal('123456', 5, 2)).toThrow();
  });

  it('throws on underflow (negative scale)', () => {
    expect(() => new Decimal('1.23', 3, -1)).toThrow();
  });

  it('throws on division by zero', () => {
    const a = new Decimal('1.00', 3, 2);
    const b = new Decimal('0.00', 3, 2);
    expect(() => a.div(b)).toThrow();
  });

  it('handles rounding up and down', () => {
    expect(new Decimal('1.2345', 5, 2).toString()).toBe('1.23');
    expect(new Decimal('1.235', 4, 2).toString()).toBe('1.24');
    expect(new Decimal('-1.235', 4, 2).toString()).toBe('-1.24');
    expect(new Decimal('-1.234', 4, 2).toString()).toBe('-1.23');
  });

  it('handles very large numbers', () => {
    const big = new Decimal('12345678901234567890.12', 22, 2);
    expect(big.toString()).toBe('12345678901234567890.12');
  });

  it('handles very small numbers', () => {
    const small = new Decimal('0.000000000123', 13, 12);
    expect(small.toString()).toBe('0.000000000123');
  });

  it('throws on invalid input', () => {
    expect(() => new Decimal('abc', 3, 2)).toThrow();
    expect(() => new Decimal('', 3, 2)).toThrow();
    expect(() => new Decimal('1.2.3', 5, 2)).toThrow();
  });

  it('handles conversion edge cases', () => {
    const dec = new Decimal('123.4567', 7, 4);
    expect(new Decimal(dec, 6, 2).toString()).toBe('123.46');
    expect(() => new Decimal(dec, 4, 2)).toThrow();
  });

  it('handles arithmetic edge cases', () => {
    const a = new Decimal('1.23', 3, 2);
    const b = new Decimal('4.56', 3, 2);
    expect(a.add(b).toString()).toBe('5.79');
    expect(b.sub(a).toString()).toBe('3.33');
    expect(a.mul(b).toString()).toBe('5.61');
    expect(b.div(a).toString()).toBe('3.71');
  });
});
