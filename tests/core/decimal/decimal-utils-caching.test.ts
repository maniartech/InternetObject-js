import { getPow10 } from '../../../src/core/decimal/decimal-utils';

describe('getPow10 utility', () => {
  it('should return correct powers of 10 for small exponents', () => {
    expect(getPow10(0)).toBe(1n);
    expect(getPow10(1)).toBe(10n);
    expect(getPow10(2)).toBe(100n);
    expect(getPow10(5)).toBe(100000n);
  });

  it('should return correct powers of 10 for large exponents', () => {
    expect(getPow10(10)).toBe(10000000000n);
    expect(getPow10(20)).toBe(100000000000000000000n);
  });

  it('should cache results for repeated exponents', () => {
    const pow10_7_first = getPow10(7);
    const pow10_7_second = getPow10(7);
    expect(pow10_7_first).toBe(pow10_7_second);
  });

  it('should throw error for negative exponents', () => {
    expect(() => getPow10(-1)).toThrow();
    expect(() => getPow10(-100)).toThrow();
  });
});
