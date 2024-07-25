export class Decimal {
  private coefficient: bigint;
  private exponent: number;
  private precision: number;
  private scale: number;

  constructor(coefficient: bigint | number | string, exponent: number = 0, precision: number = 10, scale: number = 0) {
    if (precision < 1 || precision > 65) {
      throw new Error("Precision (M) must be between 1 and 65.");
    }

    if (scale < 0 || scale > 30 || scale > precision) {
      throw new Error("Scale (D) must be between 0 and 30 and no larger than the precision.");
    }

    this.coefficient = BigInt(coefficient);
    this.exponent = exponent;
    this.precision = precision;
    this.scale = scale;

    this.normalize();
    this.checkPrecision();
  }

  private normalize(): void {
    if (this.coefficient === BigInt(0)) {
      this.exponent = 0;
      return;
    }

    while (this.coefficient % BigInt(10) === BigInt(0)) {
      this.coefficient /= BigInt(10);
      this.exponent++;
    }
  }

  private checkPrecision(): void {
    const maxCoefficient = BigInt(10 ** this.precision);
    if (this.coefficient >= maxCoefficient || this.coefficient <= -maxCoefficient) {
      throw new Error(`Coefficient exceeds the allowed precision of ${this.precision} digits.`);
    }
  }

  public toString(): string {
    if (this.exponent >= 0) {
      return (this.coefficient * BigInt(10 ** this.exponent)).toString();
    } else {
      const strCoef = this.coefficient.toString().padStart(-this.exponent + 1, '0');
      const decimalIndex = strCoef.length + this.exponent;

      if (decimalIndex <= 0) {
        return `${this.coefficient < BigInt(0) ? '-' : ''}0.${'0'.repeat(-decimalIndex)}${strCoef}`;
      } else {
        return `${this.coefficient < BigInt(0) ? '-' : ''}${strCoef.slice(0, decimalIndex)}.${strCoef.slice(decimalIndex)}`;
      }
    }
  }

  public static parse(str: string, precision: number = 10, scale: number = 0): Decimal {
    str = str.trim();

    const regex = /^(-?\d+(\.\d+)?)$/;
    const match = str.match(regex);

    if (!match) {
      throw new Error("Invalid decimal string format.");
    }

    let [, numberPart] = match;

    let coefficient: bigint;
    let exponent = 0;

    if (numberPart.includes('.')) {
      const [intPart, fracPart] = numberPart.split('.');
      coefficient = BigInt((intPart === '-0' ? '-' : intPart || '0') + fracPart);
      exponent = -fracPart.length;
    } else {
      coefficient = BigInt(numberPart);
    }

    const decimal = new Decimal(coefficient, exponent, precision, scale);
    decimal.checkPrecision();
    return decimal;
  }

  public add(other: Decimal): Decimal {
    this.ensureSamePrecisionAndScale(other);
    const maxExponent = Math.max(this.exponent, other.exponent);
    const thisCoefficient = this.coefficient * BigInt(10 ** (maxExponent - this.exponent));
    const otherCoefficient = other.coefficient * BigInt(10 ** (maxExponent - other.exponent));
    const newCoefficient = thisCoefficient + otherCoefficient;
    return new Decimal(newCoefficient, maxExponent, this.precision, this.scale);
  }

  public subtract(other: Decimal): Decimal {
    this.ensureSamePrecisionAndScale(other);
    const negatedOther = new Decimal(-other.coefficient, other.exponent, other.precision, other.scale);
    return this.add(negatedOther);
  }

  public multiply(other: Decimal): Decimal {
    this.ensureSamePrecisionAndScale(other);
    const newCoefficient = this.coefficient * other.coefficient;
    const newExponent = this.exponent + other.exponent;
    return new Decimal(newCoefficient, newExponent, this.precision, this.scale);
  }

  public divide(other: Decimal, precision: number = 30): Decimal {
    this.ensureSamePrecisionAndScale(other);
    if (other.coefficient === BigInt(0)) {
      throw new Error("Division by zero is not allowed.");
    }

    // Calculate the necessary scale factor to ensure the precision is maintained
    const scaleFactor = this.precision + other.scale;
    let thisCoefficient = this.coefficient * BigInt(10 ** scaleFactor);
    let thisExponent = this.exponent - scaleFactor;

    const quotient = thisCoefficient / other.coefficient;
    const remainder = thisCoefficient % other.coefficient;

    // Adjust for rounding
    if (remainder * BigInt(2) >= other.coefficient) {
      thisCoefficient += thisCoefficient < BigInt(0) ? BigInt(-1) : BigInt(1);
    }

    const result = new Decimal(quotient, thisExponent, this.precision, this.scale);
    result.normalize();
    result.checkPrecision();
    return result;
  }

  private ensureSamePrecisionAndScale(other: Decimal): void {
    if (this.precision !== other.precision || this.scale !== other.scale) {
      throw new Error("Both Decimal instances must have the same precision and scale for arithmetic operations.");
    }
  }

  // Utility methods for JSON and database storage
  public toJSON(): string {
    return JSON.stringify({ coefficient: this.coefficient.toString(), exponent: this.exponent, precision: this.precision, scale: this.scale });
  }

  public static fromJSON(json: string): Decimal {
    const { coefficient, exponent, precision, scale } = JSON.parse(json);
    return new Decimal(BigInt(coefficient), exponent, precision, scale);
  }
}
