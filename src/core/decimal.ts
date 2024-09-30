class Decimal {
  private value: bigint;       // Scaled integer representation
  private precision: number;   // M
  private scale: number;       // D

  /**
   * Constructs a Decimal instance.
   * @param value - The decimal value as a string, number, or another Decimal.
   * @param precision - Total number of digits (M). Default is 10.
   * @param scale - Number of digits after the decimal point (D). Default is 0.
   */
  constructor(value: string | number | Decimal, precision: number = 10, scale: number = 0) {
      // Validate precision and scale
      if (!Number.isInteger(precision) || precision < 1 || precision > 65) {
          throw new RangeError('Precision (M) must be an integer between 1 and 65.');
      }
      if (!Number.isInteger(scale) || scale < 0 || scale > 30) {
          throw new RangeError('Scale (D) must be an integer between 0 and 30.');
      }
      if (scale > precision) {
          throw new RangeError('Scale (D) cannot be greater than Precision (M).');
      }

      this.precision = precision;
      this.scale = scale;

      if (value instanceof Decimal) {
          if (value.precision !== precision || value.scale !== scale) {
              throw new Error('Decimal precision and scale must match.');
          }
          this.value = value.value;
      } else {
          let strValue: string;

          if (typeof value === 'number') {
              if (!Number.isFinite(value)) {
                  throw new Error('Invalid number value.');
              }
              strValue = value.toFixed(scale);
          } else if (typeof value === 'string') {
              strValue = value.trim();
          } else {
              throw new TypeError('Invalid type for Decimal constructor.');
          }

          // Validate the string format
          if (!Decimal.isValidDecimal(strValue)) {
              throw new Error(`Invalid decimal string: ${strValue}`);
          }

          // Normalize the string and adjust to scale
          const normalized = Decimal.normalize(strValue, scale);

          // Split into integer and fractional parts
          const [intPart, fracPart] = Decimal.splitDecimal(normalized);

          // Calculate total digits
          const totalDigits = intPart.replace('-', '').replace(/^0+(?!$)/, '').length + (fracPart ? fracPart.length : 0);

          if (totalDigits > precision) {
              throw new RangeError(`Value exceeds the specified precision (${precision}).`);
          }

          if ((fracPart ? fracPart.length : 0) > scale) {
              throw new RangeError(`Value exceeds the specified scale (${scale}).`);
          }

          // Scale the value by multiplying with 10^scale
          const scaledValue = Decimal.scaleValue(normalized, scale);

          this.value = BigInt(scaledValue);
      }
  }

  /**
   * Validates if the string is a valid decimal number.
   * @param str - The string to validate.
   * @returns True if valid, else false.
   */
  private static isValidDecimal(str: string): boolean {
      return /^-?\d+(\.\d+)?$/.test(str);
  }

  /**
   * Normalizes the decimal string by removing leading zeros and adjusting fractional part to match scale.
   * @param str - The decimal string.
   * @param scale - The required scale.
   * @returns Normalized decimal string.
   */
  private static normalize(str: string, scale: number): string {
      let [integerPart, fractionalPart] = str.split('.');

      // Handle sign
      let sign = '';
      if (integerPart.startsWith('-')) {
          sign = '-';
          integerPart = integerPart.slice(1);
      }

      // Remove leading zeros
      integerPart = integerPart.replace(/^0+(?!$)/, '');

      // Adjust fractional part
      if (scale > 0) {
          fractionalPart = fractionalPart || '';
          if (fractionalPart.length > scale) {
              // Truncate extra digits
              fractionalPart = fractionalPart.slice(0, scale);
          } else {
              // Pad with zeros
              fractionalPart = fractionalPart.padEnd(scale, '0');
          }
      } else {
          fractionalPart = '';
      }

      return fractionalPart ? `${sign}${integerPart}.${fractionalPart}` : `${sign}${integerPart}`;
  }

  /**
   * Splits the decimal string into integer and fractional parts.
   * @param str - The normalized decimal string.
   * @returns A tuple containing integer and fractional parts.
   */
  private static splitDecimal(str: string): [string, string | undefined] {
      const [intPart, fracPart] = str.replace(/^-/, '').split('.');
      return [intPart, fracPart];
  }

  /**
   * Scales the decimal value by multiplying with 10^scale.
   * @param str - The normalized decimal string.
   * @param scale - The scale.
   * @returns The scaled integer as a string.
   */
  private static scaleValue(str: string, scale: number): string {
      if (scale === 0) {
          return str.replace('.', '');
      }

      const parts = str.split('.');
      const integerPart = parts[0];
      let fractionalPart = parts[1] || '';

      // Pad fractional part with zeros if necessary
      fractionalPart = fractionalPart.padEnd(scale, '0');

      return `${integerPart}${fractionalPart}`;
  }

  /**
   * Compares this Decimal with another.
   * @param other - The other Decimal instance.
   * @returns -1 if less than, 0 if equal, 1 if greater than.
   */
  public compareTo(other: Decimal): number {
      this.ensureSamePrecisionAndScale(other);

      if (this.value === other.value) {
          return 0;
      }

      if (this.value > other.value) {
          return 1;
      }

      return -1;
  }

  /**
   * Ensures that two Decimals have the same precision and scale.
   * @param other - The other Decimal instance.
   */
  private ensureSamePrecisionAndScale(other: Decimal): void {
      if (this.precision !== other.precision || this.scale !== other.scale) {
          throw new Error('Decimals must have the same precision and scale for comparison.');
      }
  }

  /**
   * Checks equality between two Decimals.
   * @param other - The other Decimal instance.
   * @returns True if equal, else false.
   */
  public equals(other: Decimal): boolean {
      return this.compareTo(other) === 0;
  }

  /**
   * Checks if this Decimal is greater than another.
   * @param other - The other Decimal instance.
   * @returns True if greater, else false.
   */
  public greaterThan(other: Decimal): boolean {
      return this.compareTo(other) === 1;
  }

  /**
   * Checks if this Decimal is greater than or equal to another.
   * @param other - The other Decimal instance.
   * @returns True if greater than or equal, else false.
   */
  public greaterThanOrEqual(other: Decimal): boolean {
      const cmp = this.compareTo(other);
      return cmp === 1 || cmp === 0;
  }

  /**
   * Checks if this Decimal is less than another.
   * @param other - The other Decimal instance.
   * @returns True if less, else false.
   */
  public lessThan(other: Decimal): boolean {
      return this.compareTo(other) === -1;
  }

  /**
   * Checks if this Decimal is less than or equal to another.
   * @param other - The other Decimal instance.
   * @returns True if less than or equal, else false.
   */
  public lessThanOrEqual(other: Decimal): boolean {
      const cmp = this.compareTo(other);
      return cmp === -1 || cmp === 0;
  }

  /**
   * Adds this Decimal with another.
   * @param other - The other Decimal instance.
   * @returns A new Decimal instance representing the sum.
   */
  public add(other: Decimal): Decimal {
      this.ensureSamePrecisionAndScale(other);

      const sum = this.value + other.value;
      const sumStr = sum.toString();

      return new Decimal(Decimal.fromScaledValue(sumStr, this.scale), this.precision, this.scale);
  }

  /**
   * Subtracts another Decimal from this Decimal.
   * @param other - The other Decimal instance.
   * @returns A new Decimal instance representing the difference.
   */
  public subtract(other: Decimal): Decimal {
      this.ensureSamePrecisionAndScale(other);

      const diff = this.value - other.value;
      const diffStr = diff.toString();

      return new Decimal(Decimal.fromScaledValue(diffStr, this.scale), this.precision, this.scale);
  }

  /**
   * Multiplies this Decimal with another.
   * @param other - The other Decimal instance.
   * @returns A new Decimal instance representing the product.
   */
  public multiply(other: Decimal): Decimal {
      // The resulting scale is the sum of the scales
      const resultScale = this.scale + other.scale;

      if (resultScale > this.scale) {
          throw new Error('Resulting scale exceeds the maximum allowed scale.');
      }

      const product = this.value * other.value;
      const productStr = product.toString();

      // Adjust the scale
      const scaledProductStr = Decimal.adjustScale(productStr, resultScale, this.scale);

      return new Decimal(Decimal.fromScaledValue(scaledProductStr, this.scale), this.precision, this.scale);
  }

  /**
   * Divides this Decimal by another.
   * @param other - The other Decimal instance.
   * @param precision - The desired precision of the result.
   * @param scale - The desired scale of the result.
   * @returns A new Decimal instance representing the quotient.
   */
  public divide(other: Decimal, precision: number = this.precision, scale: number = this.scale): Decimal {
      if (other.value === BigInt(0)) {
          throw new Error('Division by zero.');
      }

      // To maintain scale, we need to scale the dividend
      const scalingFactor = BigInt(10 ** scale);
      const dividendScaled = this.value * scalingFactor;
      const quotient = dividendScaled / other.value;

      return new Decimal(quotient.toString(), precision, scale);
  }

  /**
   * Adjusts the scale of the product for multiplication.
   * @param productStr - The product as a string.
   * @param resultScale - The sum of scales.
   * @param targetScale - The desired scale.
   * @returns The adjusted scaled value as a string.
   */
  private static adjustScale(productStr: string, resultScale: number, targetScale: number): string {
      // Since resultScale should be equal to targetScale for simplicity
      if (resultScale === targetScale) {
          return productStr;
      } else if (resultScale > targetScale) {
          // Truncate extra digits
          const difference = resultScale - targetScale;
          return productStr.slice(0, -difference);
      } else {
          // Pad with zeros
          const difference = targetScale - resultScale;
          return productStr.padEnd(productStr.length + difference, '0');
      }
  }

  /**
   * Creates a Decimal instance from a scaled value string.
   * @param scaledValueStr - The scaled integer as a string.
   * @param scale - The scale.
   * @returns The decimal string adjusted to scale.
   */
  private static fromScaledValue(scaledValueStr: string, scale: number): string {
      if (scale === 0) {
          return scaledValueStr;
      }

      const isNegative = scaledValueStr.startsWith('-');
      let str = isNegative ? scaledValueStr.slice(1) : scaledValueStr;

      // Pad with leading zeros if necessary
      while (str.length <= scale) {
          str = '0' + str;
      }

      const integerPart = str.slice(0, -scale);
      const fractionalPart = str.slice(-scale);

      return `${isNegative ? '-' : ''}${integerPart}.${fractionalPart}`;
  }

  /**
   * Converts the Decimal instance to a string.
   * @returns The decimal number as a string.
   */
  public toString(): string {
      const strValue = this.value.toString();
      if (this.scale === 0) {
          return strValue;
      }

      const isNegative = strValue.startsWith('-');
      let str = isNegative ? strValue.slice(1) : strValue;

      // Pad with leading zeros if necessary
      while (str.length <= this.scale) {
          str = '0' + str;
      }

      const integerPart = str.slice(0, -this.scale);
      const fractionalPart = str.slice(-this.scale);

      return `${isNegative ? '-' : ''}${integerPart}.${fractionalPart}`;
  }

  /**
   * Converts the Decimal instance to a number.
   * **Note:** This may lose precision for very large or highly precise numbers.
   * @returns The decimal number as a JavaScript number.
   */
  public toNumber(): number {
      return Number(this.toString());
  }

  /**
   * Static method to parse a string into a Decimal instance.
   * @param value - The decimal string.
   * @param precision - Total number of digits (M).
   * @param scale - Number of digits after the decimal point (D).
   * @returns A new Decimal instance.
   */
  public static parse(value: string, precision: number = 10, scale: number = 0): Decimal {
      return new Decimal(value, precision, scale);
  }
}

export default Decimal;