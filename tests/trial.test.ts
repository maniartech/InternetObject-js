import Decimal from "../src/core/decimal";

describe('Trial - Failing Tests Only', () => {
  it('provides isolation for debugging breaking code', () => {
    // write your isolated test here

    const a = new Decimal('1.23');
    const b = new Decimal('4.565');
    // expect(b.mul(a).toString()).toBe('5.61');

    console.log(b.div(a).toString());
  });
});
