import Decimal, { DecimalError } from "../../src/core/decimal";

describe('Decimal.mod', () => {
  it('computes simple remainders with same scale', () => {
    const a = new Decimal('10.0', 3, 1);
    const b = new Decimal('3.0', 2, 1);
    const r = a.mod(b);
    expect(r.toString()).toBe('1.0');
    expect(r.getScale()).toBe(1);
  });

  it('aligns scales (max) and keeps remainder sign of dividend', () => {
    const a = new Decimal('-10.00', 4, 2);
    const b = new Decimal('3.0', 2, 1);
    const r = a.mod(b);
    // -10.00 % 3.0  -> (-1000 % 300) at scale 2 -> remainder -100
    expect(r.toString()).toBe('-1.00');
    expect(r.getScale()).toBe(2);
  });

  it('handles different scales accurately', () => {
    const a = new Decimal('5.75', 3, 2);
    const b = new Decimal('2.5', 2, 1);
    const r = a.mod(b);
    // Align to scale 2: a=575, b=250 -> q=2, rem=575-500=75 => 0.75
    expect(r.toString()).toBe('0.75');
    expect(r.getScale()).toBe(2);
  });

  it('returns zero when divisible', () => {
    const a = new Decimal('6.00', 3, 2);
    const b = new Decimal('3.0', 2, 1);
    const r = a.mod(b);
    expect(r.toString()).toBe('0.00');
  });

  it('throws on division by zero', () => {
    const a = new Decimal('1.0', 2, 1);
    expect(() => a.mod(new Decimal('0.0', 1, 1))).toThrow(DecimalError);
  });

  it('handles tiny fractional modulo', () => {
    const a = new Decimal('0.001', 4, 3);
    const b = new Decimal('0.0003', 4, 4);
    const r = a.mod(b);
    // Align to scale 4: a=10, b=3 -> q=3, rem=1 => 0.0001
    expect(r.toString()).toBe('0.0001');
    expect(r.getScale()).toBe(4);
  });
});
