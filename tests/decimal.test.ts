import Decimal from '../src/core/decimal';


describe('Decimal', () => {

  // Creating Decimal instances
  const dec1 = new Decimal("123.45", 5, 2); // M=5, D=2
  const dec2 = new Decimal(123.45, 5, 2);
  const dec3 = new Decimal("123.4500", 5, 2); // Normalized to "123.45"
  const dec4 = new Decimal("-123.45", 5, 2);

  it("should create a Decimal instance", () => {
    expect(dec1 instanceof Decimal).toEqual(true);
    expect(dec2 instanceof Decimal).toEqual(true);
    expect(dec3 instanceof Decimal).toEqual(true);
    expect(dec4 instanceof Decimal).toEqual(true);

    expect(dec1.toString()).toEqual("123.45");
    expect(dec2.toString()).toEqual("123.45");
    expect(dec3.toString()).toEqual("123.45");
    expect(dec4.toString()).toEqual("-123.45");
  });

  it("should compare Decimal instances", () => {
    expect(dec1.equals(dec2)).toEqual(true);
    expect(dec1.equals(dec4)).toEqual(false);
    expect(dec1.greaterThan(dec4)).toEqual(true);
    expect(dec4.lessThan(dec2)).toEqual(true);
  });

  it("should perform arithmetic operations", () => {
    // Addition
    const dec5 = new Decimal("100.00", 5, 2);
    const sum = dec1.add(dec5); // 123.45 + 100.00 = 223.45
    console.log(sum.toString()); // "223.45"

    // Subtraction
    const diff = dec1.subtract(dec5); // 123.45 - 100.00 = 23.45
    console.log(diff.toString()); // "23.45"

    // Multiplication
    const dec6 = new Decimal("2.00", 5, 2);
    const product = dec1.multiply(dec6); // 123.45 * 2.00 = 246.90
    console.log(product.toString()); // "246.90"

    // Division
    const dec7 = new Decimal("50.00", 5, 2);
    const quotient = dec1.divide(dec7, 5, 2); // 123.45 / 50.00 = 2.47
    console.log(quotient.toString()); // "2.47"
  });

  // // Handling Different Fractional Parts
  // const dec8 = new Decimal("0.01", 3, 2); // M=3, D=2
  // const dec9 = new Decimal("0.02", 3, 2);
  // const sum2 = dec8.add(dec9); // 0.01 + 0.02 = 0.03
  // console.log(sum2.toString()); // "0.03"

  // // Error Handling
  // try {
  //     const invalidDec = new Decimal("123.456", 5, 2); // Exceeds scale
  // } catch (error) {
  //     console.error(error.message); // "Value exceeds the specified scale (2)."
  // }

  // try {
  //     const invalidDec2 = new Decimal("12345.67", 5, 2); // Exceeds precision
  // } catch (error) {
  //     console.error(error.message); // "Value exceeds the specified precision (5)."
  // }

  // try {
  //     const decDifferentScale = new Decimal("123.45", 5, 2);
  //     const decDifferentScale2 = new Decimal("67.89", 5, 3); // Different scale
  //     decDifferentScale.add(decDifferentScale2);
  // } catch (error) {
  //     console.error(error.message); // "Decimals must have the same precision and scale for this operation."
  // }


});
