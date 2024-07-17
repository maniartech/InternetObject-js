export class Decimal {
  private coefficient: bigint;
  private exponent: number;

  constructor(coefficient: bigint | number | string, exponent: number) {
      this.coefficient = BigInt(coefficient);

      if (!Number.isInteger(exponent)) {
          throw new Error("Exponent must be an integer.");
      }
      this.exponent = exponent;

      this.normalize();
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

  public static parse(str: string): Decimal {
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

      return new Decimal(coefficient, exponent);
  }

  public add(other: Decimal): Decimal {
      const maxExponent = Math.max(this.exponent, other.exponent);
      const thisCoefficient = this.coefficient * BigInt(10 ** (maxExponent - this.exponent));
      const otherCoefficient = other.coefficient * BigInt(10 ** (maxExponent - other.exponent));
      const newCoefficient = thisCoefficient + otherCoefficient;
      return new Decimal(newCoefficient, maxExponent);
  }

  public subtract(other: Decimal): Decimal {
      const negatedOther = new Decimal(-other.coefficient, other.exponent);
      return this.add(negatedOther);
  }

  public multiply(other: Decimal): Decimal {
      const newCoefficient = this.coefficient * other.coefficient;
      const newExponent = this.exponent + other.exponent;
      return new Decimal(newCoefficient, newExponent);
  }

  public divide(other: Decimal, precision: number = 30): Decimal {
      if (other.coefficient === BigInt(0)) {
          throw new Error("Division by zero is not allowed.");
      }

      let thisCoefficient = this.coefficient;
      let thisExponent = this.exponent;

      // Adjust this decimal to have a larger coefficient
      const scaleFactor = precision + Math.max(0, other.exponent - this.exponent) + 1;
      thisCoefficient *= BigInt(10 ** scaleFactor);
      thisExponent -= scaleFactor;

      let quotient = thisCoefficient / other.coefficient;
      let remainder = thisCoefficient % other.coefficient;

      // Round the result
      if (remainder * BigInt(2) >= other.coefficient) {
          quotient += quotient < BigInt(0) ? BigInt(-1) : BigInt(1);
      }

      return new Decimal(quotient, thisExponent - other.exponent);
  }
}