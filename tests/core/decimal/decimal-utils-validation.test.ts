import { validatePrecisionScale, fitToPrecision } from '../../../src/core/decimal/decimal-utils';

describe('validatePrecisionScale', () => {
  it('should validate correct precision and scale', () => {
    expect(validatePrecisionScale(12345n, 5, 2).valid).toBe(true);
    expect(validatePrecisionScale(0n, 3, 0).valid).toBe(true);
  });

  it('should invalidate when scale > precision', () => {
    const result = validatePrecisionScale(123n, 2, 3);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/scale/i);
  });

  it('should invalidate when coefficient exceeds precision', () => {
    const result = validatePrecisionScale(123456n, 5, 2);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/precision/i);
  });

  it('should validate negative coefficients', () => {
    expect(validatePrecisionScale(-123n, 3, 1).valid).toBe(true);
  });
});

describe('fitToPrecision', () => {
  it('should fit coefficient within precision (no rounding needed)', () => {
    expect(fitToPrecision(12345n, 5, 2)).toBe(12345n);
  });

  it('should round down if coefficient exceeds precision', () => {
    // 123456 with precision 5, scale 2, should round to 12346 (round-half-up)
    expect(fitToPrecision(123456n, 5, 2)).toBe(12346n);
  });

  it('should throw error if cannot fit even after rounding', () => {
    expect(() => fitToPrecision(123456789n, 5, 2)).toThrow();
  });

  it('should support ceil and floor rounding modes', () => {
    // 123456 with precision 5, scale 2, ceil: 12346, floor: 12345
    expect(fitToPrecision(123456n, 5, 2, 'ceil')).toBe(12346n);
    expect(fitToPrecision(123456n, 5, 2, 'floor')).toBe(12345n);
  });

  it('should handle zero coefficient', () => {
    expect(fitToPrecision(0n, 5, 2)).toBe(0n);
  });
});
