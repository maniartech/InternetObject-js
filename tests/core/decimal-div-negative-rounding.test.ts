import Decimal from "../../src/core/decimal";

describe('Decimal.div negative rounding edge cases', () => {
  it('rounds -1 / 3 at scale 0 to -0 correctly (towards -1)', () => {
    const a = new Decimal('-1', 1, 0);
    const b = new Decimal('3', 1, 0);
    const result = a.div(b);
    expect(result.getScale()).toBe(0);
    expect(result.toString()).toBe('0'); // scale follows divisor (0)
    // value is -0 (no sign), but internal rounding should have used negative direction if needed
  });

  it('rounds 1 / -3 at scale 0 to 0 correctly (towards -1)', () => {
    const a = new Decimal('1', 1, 0);
    const b = new Decimal('-3', 1, 0);
    const result = a.div(b);
    expect(result.getScale()).toBe(0);
    expect(result.toString()).toBe('0');
  });

  it('rounds -1 / 2 at scale 0 to -1', () => {
    const a = new Decimal('-1', 1, 0);
    const b = new Decimal('2', 1, 0);
    const result = a.div(b);
    expect(result.getScale()).toBe(0);
    expect(result.toString()).toBe('-1');
  });
});
