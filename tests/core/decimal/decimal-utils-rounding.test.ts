import { roundHalfUp, ceilRound, floorRound } from '../../../src/core/decimal/decimal-utils';

describe('roundHalfUp', () => {
  it('should round up at half or more', () => {
    expect(roundHalfUp(125n, 2, 1)).toBe(13n); // 12.5 -> 13
    expect(roundHalfUp(135n, 2, 1)).toBe(14n); // 13.5 -> 14
    expect(roundHalfUp(-125n, 2, 1)).toBe(-13n); // -12.5 -> -13
    expect(roundHalfUp(-135n, 2, 1)).toBe(-14n); // -13.5 -> -14
  });
  it('should round down below half', () => {
    expect(roundHalfUp(124n, 2, 1)).toBe(12n);
    expect(roundHalfUp(-124n, 2, 1)).toBe(-12n);
  });
  it('should handle scale up (no rounding)', () => {
    expect(roundHalfUp(123n, 1, 2)).toBe(1230n);
  });
  it('should throw for negative scales', () => {
    expect(() => roundHalfUp(123n, -1, 0)).toThrow();
    expect(() => roundHalfUp(123n, 0, -1)).toThrow();
  });
});

describe('ceilRound', () => {
  it('should always round up for positive', () => {
    expect(ceilRound(121n, 2, 1)).toBe(13n);
    expect(ceilRound(129n, 2, 1)).toBe(13n);
    expect(ceilRound(120n, 2, 1)).toBe(12n);
  });
  it('should round towards zero for negative', () => {
    expect(ceilRound(-121n, 2, 1)).toBe(-12n);
    expect(ceilRound(-129n, 2, 1)).toBe(-12n);
    expect(ceilRound(-120n, 2, 1)).toBe(-12n);
  });
  it('should handle scale up (no rounding)', () => {
    expect(ceilRound(123n, 1, 2)).toBe(1230n);
  });
  it('should throw for negative scales', () => {
    expect(() => ceilRound(123n, -1, 0)).toThrow();
    expect(() => ceilRound(123n, 0, -1)).toThrow();
  });
});

describe('floorRound', () => {
  it('should always round down for negative', () => {
    expect(floorRound(-121n, 2, 1)).toBe(-13n);
    expect(floorRound(-129n, 2, 1)).toBe(-13n);
    expect(floorRound(-120n, 2, 1)).toBe(-12n);
  });
  it('should round towards zero for positive', () => {
    expect(floorRound(121n, 2, 1)).toBe(12n);
    expect(floorRound(129n, 2, 1)).toBe(12n);
    expect(floorRound(120n, 2, 1)).toBe(12n);
  });
  it('should handle scale up (no rounding)', () => {
    expect(floorRound(123n, 1, 2)).toBe(1230n);
  });
  it('should throw for negative scales', () => {
    expect(() => floorRound(123n, -1, 0)).toThrow();
    expect(() => floorRound(123n, 0, -1)).toThrow();
  });
});
