import { formatBigIntAsDecimal } from '../../../src/core/decimal/decimal-utils';

describe('formatBigIntAsDecimal', () => {
  it('should format zero coefficients with various scales', () => {
    expect(formatBigIntAsDecimal(0n, 0)).toBe('0');
    expect(formatBigIntAsDecimal(0n, 2)).toBe('0.00');
    expect(formatBigIntAsDecimal(0n, 5)).toBe('0.00000');
  });

  it('should format positive coefficients correctly', () => {
    expect(formatBigIntAsDecimal(12345n, 2)).toBe('123.45');
    expect(formatBigIntAsDecimal(1n, 3)).toBe('0.001');
    expect(formatBigIntAsDecimal(1000n, 3)).toBe('1.000');
  });

  it('should format negative coefficients correctly', () => {
    expect(formatBigIntAsDecimal(-12345n, 2)).toBe('-123.45');
    expect(formatBigIntAsDecimal(-1n, 3)).toBe('-0.001');
    expect(formatBigIntAsDecimal(-1000n, 3)).toBe('-1.000');
  });

  it('should throw if coefficient exceeds precision', () => {
    expect(() => formatBigIntAsDecimal(123456n, 5, 2)).toThrow();
  });

  it('should format with precision validation', () => {
    expect(formatBigIntAsDecimal(12345n, 2, 5)).toBe('123.45');
    expect(() => formatBigIntAsDecimal(123456n, 2, 5)).toThrow();
  });
});
