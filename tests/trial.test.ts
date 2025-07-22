import Decimal from "../src/core/decimal";


describe('Trial - Failing Tests Only', () => {
  it('provides isolation for debugging breaking code', () => {
    // write your isolated test here

    const a = new Decimal('1.23');
    const b = new Decimal('4.565');
    expect(a.add(b).toString()).toBe('5.80');
    expect(b.sub(a).toString()).toBe('3.33');
    expect(a.mul(b).toString()).toBe('5.61');
    expect(b.div(a).toString()).toBe('3.71');
  });
});
