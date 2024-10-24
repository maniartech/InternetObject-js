// Decimal.ts
// DecimalError.ts
export class DecimalError extends Error {
  constructor(message: string) {
      super(message);
      this.name = "DecimalError";
  }
}

export class Decimal {
    private readonly coefficient: bigint; // Scaled integer
    private readonly exponent: number;    // Number of fractional digits
    private readonly precision: number;   // Total digits
    private readonly scale: number;       // Fractional digits

    /**
     * Constructs a Decimal instance by parsing the input value.
     * @param value The value to initialize the Decimal with (string, number, or Decimal).
     * @param precision The total number of significant digits (M).
     * @param scale The number of digits after the decimal point (D).
     */
    constructor(value: string | number | Decimal, precision: number, scale: number) {
        this.precision = precision;
        this.scale = scale;

        let sign = '';
        let integerPart = '0';
        let fractionalPart = '';

        // The sclae must be less than or equal to the precision (D <= M)
        if (scale > precision) {
            throw new DecimalError("Scale must be less than or equal to precision.");
        }

        if (typeof value === 'string' || typeof value === 'number') {
            const valueStr = typeof value === 'number' ? value.toString() : value;

            if (!Decimal.isValidDecimal(valueStr)) {
                throw new DecimalError("Invalid decimal string format.");
            }

            ({ sign, integerPart, fractionalPart } = Decimal.parseString(valueStr));
        } else if (value instanceof Decimal) {
            // Clone from another Decimal, adjusting precision and scale if necessary
            const fromPrecision = value.getPrecision();
            const fromScale = value.getScale();
            const fromCoefficient = value.getCoefficient();

            const fromIntegerDigits = fromPrecision - fromScale;
            const targetIntegerDigits = precision - scale;

            if (targetIntegerDigits < fromIntegerDigits) {
                throw new DecimalError("Adjusting precision affects integer digits, which is not allowed.");
            }

            if (scale > fromScale) {
                // Need to pad fractional digits with zeros
                const scaleDifference = scale - fromScale;
                const multiplier = BigInt(10 ** scaleDifference);
                const newCoefficient = fromCoefficient * multiplier;
                const combinedNormalized = newCoefficient.toString().replace(/^0+/, '') || '0';
                const totalDigits = combinedNormalized.length;
                if (totalDigits > precision) {
                    throw new DecimalError("Value exceeds the specified precision (M) after scaling.");
                }
                this.coefficient = newCoefficient;
                this.exponent = scale;
                return;
            } else if (scale < fromScale) {
                // Need to truncate and round the fractional digits
                const scaleDifference = fromScale - scale;
                const divisor = BigInt(10 ** scaleDifference);
                const truncated = value.getCoefficient() / divisor;
                const remainder = value.getCoefficient() % divisor;

                // Rounding: If the first digit of the remainder >= 5, round up
                const firstRemainderDigit = Number((remainder * 10n) / divisor);
                let roundedCoefficient = truncated;
                if (Math.abs(firstRemainderDigit) >= 5) {
                    roundedCoefficient += (value.getCoefficient() < 0n ? -1n : 1n);
                }

                // Check if rounding affects the integer digits
                const roundedStr = roundedCoefficient.toString().replace('-', '');
                const roundedIntegerDigits = roundedStr.length - scale;

                if (roundedIntegerDigits > targetIntegerDigits) {
                    throw new DecimalError("Rounding affects integer digits, which is not allowed.");
                }

                const totalDigits = roundedStr.length;
                if (totalDigits > precision) {
                    throw new DecimalError("Value exceeds the specified precision (M) after rounding.");
                }

                this.coefficient = roundedCoefficient;
                this.exponent = scale;
                return;
            } else {
                // Same scale, just clone
                if (value.getTotalDigits() > precision) {
                    throw new DecimalError("Value exceeds the specified precision (M).");
                }
                this.coefficient = value.getCoefficient();
                this.exponent = scale;
                return;
            }
        } else {
            throw new DecimalError("Unsupported value type for Decimal constructor.");
        }

        // Normalize integer part by removing leading zeros
        const normalizedInteger = integerPart.replace(/^0+/, '') || '0';

        // Normalize fractional part:
        // - Pad with zeros if fewer digits than scale
        // - Truncate and round if more digits than scale
        let normalizedFractional = fractionalPart || '';
        if (normalizedFractional.length < scale) {
            normalizedFractional = normalizedFractional.padEnd(scale, '0');
        } else if (normalizedFractional.length > scale) {
            // Perform rounding
            const extraDigits = normalizedFractional.slice(scale);
            const fractionalToKeep = normalizedFractional.slice(0, scale);
            const firstExtraDigit = extraDigits[0];
            let roundedFractional = fractionalToKeep;

            if (parseInt(firstExtraDigit, 10) >= 5) {
                // Round up
                let fractionalNumber = BigInt(fractionalToKeep) + 1n;
                const maxFractional = BigInt('9'.repeat(scale));
                if (fractionalNumber > maxFractional) {
                    // Fractional part overflow, increment integer part
                    roundedFractional = '0'.repeat(scale);
                    const increment = BigInt(1);
                    const newInteger = (BigInt(normalizedInteger) + increment).toString();
                    integerPart = newInteger;
                } else {
                    roundedFractional = fractionalNumber.toString().padStart(scale, '0');
                }
            } else {
                // No rounding needed
                roundedFractional = fractionalToKeep;
            }

            normalizedFractional = roundedFractional;

            // Recompute combined and normalize
            const combined = integerPart + normalizedFractional;
            const combinedNormalized = combined.replace(/^0+/, '') || '0';
            const totalDigits = combinedNormalized.length;
            if (totalDigits > precision) {
                throw new DecimalError("Value exceeds the specified precision (M) after rounding.");
            }

            // Convert to BigInt with sign
            const coeff = BigInt(combinedNormalized);
            this.coefficient = sign === '-' ? -coeff : coeff;
            this.exponent = scale;
            return;
        }

        // Combine integer and fractional parts
        const combined = normalizedInteger + normalizedFractional;

        // Remove leading zeros from combined (except when value is zero)
        const combinedNormalized = combined.replace(/^0+/, '') || '0';

        // Calculate total digits and validate precision
        const totalDigits = combinedNormalized.length;
        if (totalDigits > precision) {
            throw new DecimalError("Value exceeds the specified precision (M).");
        }

        // Convert to BigInt with sign
        const coeff = BigInt(combinedNormalized);
        this.coefficient = sign === '-' ? -coeff : coeff;
        this.exponent = scale;
    }

    /**
     * Helper method to get total digits (excluding sign and decimal point).
     */
    private getTotalDigits(): number {
        return this.coefficient.toString().replace('-', '').length;
    }

    /**
     * Validates if a string is a valid decimal format.
     * @param str The string to validate.
     * @returns True if valid, else false.
     */
    static isValidDecimal(str: string): boolean {
      const regex = /^[+\-]?\d+(\.\d+)?([eE][+-]?\d+)?$/;
      return regex.test(str.trim());
  }


    /**
     * Parses the string into sign, integer part, and fractional part.
     * @param str The string to parse.
     * @returns An object containing sign, integerPart, and fractionalPart.
     */
    static parseString(str: string): { sign: string; integerPart: string; fractionalPart: string } {
      let trimmed = str.trim();
      let sign = '';

      // Handle sign
      if (trimmed.startsWith('-')) {
          sign = '-';
          trimmed = trimmed.slice(1);
      } else if (trimmed.startsWith('+')) {
          trimmed = trimmed.slice(1);
      }

      // Split into mantissa and exponent parts
      const [mantissa, exponentPart] = trimmed.split(/[eE]/);
      const exponent = exponentPart ? parseInt(exponentPart, 10) : 0;

      // Split mantissa into integer and fractional parts
      const [integerPartRaw, fractionalPartRaw = ''] = mantissa.split('.');
      let integerPart = integerPartRaw || '0';
      let fractionalPart = fractionalPartRaw;

      // Adjust for exponent
      if (exponent > 0) {
          if (fractionalPart.length > exponent) {
              integerPart += fractionalPart.slice(0, exponent);
              fractionalPart = fractionalPart.slice(exponent);
          } else {
              integerPart += fractionalPart.padEnd(exponent, '0');
              fractionalPart = '';
          }
      } else if (exponent < 0) {
          const absExp = Math.abs(exponent);
          if (integerPart.length > absExp) {
              fractionalPart = integerPart.slice(-absExp) + fractionalPart;
              integerPart = integerPart.slice(0, -absExp);
          } else {
              fractionalPart = integerPart.padStart(absExp, '0') + fractionalPart;
              integerPart = '0';
          }
      }

      return { sign, integerPart, fractionalPart };
  }



    /**
     * Converts the Decimal instance to a JavaScript Number.
     * @returns The numeric representation.
     */
    toNumber(): number {
        const sign = this.coefficient < 0n ? '-' : '';
        let absCoeffStr = (this.coefficient < 0n ? -this.coefficient : this.coefficient).toString();

        // Insert decimal point based on exponent
        if (this.exponent === 0) {
            // No fractional part
            return Number(`${sign}${absCoeffStr}`);
        }

        // Ensure the string has enough digits to cover the exponent
        while (absCoeffStr.length <= this.exponent) {
            absCoeffStr = '0' + absCoeffStr;
        }

        const integerPart = absCoeffStr.slice(0, -this.exponent);
        const fractionalPart = absCoeffStr.slice(-this.exponent);

        const numberStr = `${sign}${integerPart}.${fractionalPart}`;
        const numberValue = Number(numberStr);

        // Handle overflow
        if (!isFinite(numberValue)) {
            throw new DecimalError("Conversion to Number results in Infinity.");
        }

        return numberValue;
    }

    /**
     * Compares this Decimal instance with another.
     * @param other The other Decimal to compare with.
     * @returns 1 if greater, -1 if less, 0 if equal.
     */
    compareTo(other: Decimal): number {
        // Ensure same precision and scale
        if (this.precision !== other.precision || this.scale !== other.scale) {
            throw new DecimalError("Decimals must have the same precision and scale for comparison.");
        }

        if (this.coefficient === other.coefficient) return 0;
        return this.coefficient > other.coefficient ? 1 : -1;
    }

    /**
     * Checks if this Decimal is equal to another.
     * @param other The other Decimal to compare with.
     * @returns True if equal, else false.
     */
    equals(other: Decimal): boolean {
        return this.compareTo(other) === 0;
    }

    /**
     * Checks if this Decimal is less than another.
     * @param other The other Decimal to compare with.
     * @returns True if less, else false.
     */
    lessThan(other: Decimal): boolean {
        return this.compareTo(other) === -1;
    }

    /**
     * Checks if this Decimal is greater than another.
     * @param other The other Decimal to compare with.
     * @returns True if greater, else false.
     */
    greaterThan(other: Decimal): boolean {
        return this.compareTo(other) === 1;
    }

    /**
     * Checks if this Decimal is less than or equal to another.
     * @param other The other Decimal to compare with.
     * @returns True if less than or equal, else false.
     */
    lessThanOrEqual(other: Decimal): boolean {
        const cmp = this.compareTo(other);
        return cmp === -1 || cmp === 0;
    }

    /**
     * Checks if this Decimal is greater than or equal to another.
     * @param other The other Decimal to compare with.
     * @returns True if greater than or equal, else false.
     */
    greaterThanOrEqual(other: Decimal): boolean {
        const cmp = this.compareTo(other);
        return cmp === 1 || cmp === 0;
    }

    /**
     * Returns the string representation of the Decimal.
     * @returns The normalized string.
     */
    toString(): string {
        const sign = this.coefficient < 0n ? '-' : '';
        let absCoeffStr = (this.coefficient < 0n ? -this.coefficient : this.coefficient).toString();

        if (this.exponent === 0) {
            return `${sign}${absCoeffStr}`;
        }

        // Ensure the string has enough digits to cover the exponent
        while (absCoeffStr.length <= this.exponent) {
            absCoeffStr = '0' + absCoeffStr;
        }

        const integerPart = absCoeffStr.slice(0, -this.exponent);
        const fractionalPart = absCoeffStr.slice(-this.exponent);

        return `${sign}${integerPart}.${fractionalPart}`;
    }

    /**
     * Getter for precision.
     */
    getPrecision(): number {
        return this.precision;
    }

    /**
     * Getter for scale.
     */
    getScale(): number {
        return this.scale;
    }

    /**
     * Getter for exponent.
     */
    getExponent(): number {
        return this.exponent;
    }

    /**
     * Getter for coefficient.
     */
    getCoefficient(): bigint {
        return this.coefficient;
    }

    getFormatPattern(): string {
      const precision = 'x'.repeat(this.precision - this.scale);
      const scale = 'x'.repeat(this.scale);
      return `${precision}.${scale}`;
  }

}

