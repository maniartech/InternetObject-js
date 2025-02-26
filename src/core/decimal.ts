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
     *
     * Constructor behavior varies based on input type:
     *
     * 1. String input:
     *    - If precision/scale not provided: Infers from string format
     *    - If precision/scale provided: Validates and formats according to specs
     *    Example: new Decimal("123.45") or new Decimal("123.45", 5, 2)
     *
     * 2. Decimal input (conversion):
     *    - If precision/scale not provided: Inherits from source Decimal
     *    - If precision/scale provided: Adjusts value to match new precision/scale
     *    Example: new Decimal(existingDecimal) or new Decimal(existingDecimal, 5, 2)
     *
     * 3. Number input:
     *    - Always requires precision and scale parameters
     *    Example: new Decimal(123.45, 5, 2)
     *
     * @param value The value to initialize the Decimal with (string, number, or Decimal)
     * @param precision The total number of significant digits (M)
     * @param scale The number of digits after the decimal point (D)
     * @throws {DecimalError} If value format is invalid or precision/scale constraints are violated
     */
    constructor(value: string | number | Decimal, precision?: number, scale?: number) {
        if (typeof value === 'number') {
            if (precision === undefined || scale === undefined) {
                throw new DecimalError("Precision and scale must be provided for number type.");
            }
        } else if (value instanceof Decimal) {
            // Infer from source Decimal if precision/scale not provided
            if (precision === undefined || scale === undefined) {
                precision = value.getPrecision();
                scale = value.getScale();
            }
        } else {
            // String input - infer if needed
            if (precision === undefined || scale === undefined) {
                const regex = /^(-)?(\d+)(\.(\d+))?$/;
                const match = value.toString().match(regex);
                if (!match) {
                    throw new DecimalError("Invalid decimal string format.");
                }
                const integerPart = match[2];
                const fractionalPart = match[4] || '';
                precision = integerPart.length + fractionalPart.length;
                scale = fractionalPart.length;
            }
        }

        this.precision = precision;
        this.scale = scale;

        let sign = '';
        let integerPart = '0';
        let fractionalPart = '';

        // The scale must be less than or equal to the precision (D <= M)
        if (scale > precision) {
            throw new DecimalError("Scale must be less than or equal to precision.");
        }

        if (typeof value === 'string' || typeof value === 'number') {
            const valueStr = typeof value === 'number' ? value.toString() : value;

            if (!Decimal.isValidDecimal(valueStr)) {
                throw new DecimalError("Invalid decimal string format.");
            }

            ({ sign, integerPart, fractionalPart } = Decimal.parseString(valueStr));
            
            // Process rounding if needed
            if (fractionalPart.length > scale) {
                // Use the dedicated rounding function
                const rounded = Decimal.roundForDecimal(
                    integerPart + '.' + fractionalPart,
                    precision,
                    scale
                );
                integerPart = rounded.integerPart;
                fractionalPart = rounded.fractionalPart;
            } else {
                // Pad with zeros if needed
                fractionalPart = fractionalPart.padEnd(scale, '0');
            }
            
        } else if (value instanceof Decimal) {
            // Clone from another Decimal, adjusting precision and scale if necessary
            const fromPrecision = value.getPrecision();
            const fromScale = value.getScale();
            const fromCoefficient = value.getCoefficient();

            const fromIntegerDigits = fromPrecision - fromScale;
            const targetIntegerDigits = precision - scale;

            // Only check if decreasing integer part capacity when the actual integer digits used would be affected
            // Get the actual number of integer digits (not the max allowed by precision-scale)
            const valueStr = value.toString();
            const actualIntegerDigits = valueStr.split('.')[0].replace('-', '').length;
            
            // Check if actual integer digits won't fit in target precision-scale
            if (actualIntegerDigits > targetIntegerDigits) {
                throw new DecimalError("Adjusting precision affects integer digits, which is not allowed.");
            }

            if (scale > fromScale) {
                // Need to pad fractional digits with zeros
                const scaleDifference = scale - fromScale;
                const multiplier = BigInt(10 ** scaleDifference);
                const newCoefficient = fromCoefficient * multiplier;
                
                // Check if the new coefficient would exceed the precision
                const newCoeffStr = newCoefficient.toString().replace('-', '');
                if (newCoeffStr.length > precision) {
                    throw new DecimalError("Value exceeds the specified precision (M) after scaling.");
                }
                
                this.coefficient = newCoefficient;
                this.exponent = scale;
                return;
            } else if (scale < fromScale) {
                // Need to truncate and round the fractional digits
                const scaleDifference = fromScale - scale;
                const divisor = BigInt(10 ** scaleDifference);
                const truncated = fromCoefficient / divisor;
                const remainder = fromCoefficient % divisor;

                // Rounding: If the first digit of the remainder >= 5, round up
                const firstRemainderDigit = Number((remainder * 10n) / divisor);
                let roundedCoefficient = truncated;
                if (Math.abs(firstRemainderDigit) >= 5) {
                    roundedCoefficient += (fromCoefficient < 0n ? -1n : 1n);
                }

                // Check if the new coefficient exceeds the precision
                const roundedStr = roundedCoefficient.toString().replace('-', '');
                if (roundedStr.length > precision) {
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
                this.coefficient = fromCoefficient;
                this.exponent = scale;
                return;
            }
        } else {
            throw new DecimalError("Unsupported value type for Decimal constructor.");
        }

        // Normalize integer part by removing leading zeros
        const normalizedInteger = integerPart.replace(/^0+/, '') || '0';
        const normalizedFractional = fractionalPart;

        // Combine integer and fractional parts for coefficient
        const combined = (normalizedInteger === '0' && integerPart !== '0') 
            ? integerPart + normalizedFractional 
            : normalizedInteger + normalizedFractional;

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
     * Special rounding implementation specifically for the Decimal constructor.
     * This ensures correct rounding behavior for all cases including edge cases.
     */
    private static roundForDecimal(value: string, precision: number, scale: number): { integerPart: string, fractionalPart: string } {
        // Parse the number into integer and fractional parts
        const parts = value.split('.');
        let integerPart = parts[0] || '0';
        const origFractional = parts[1] || '';
        
        // If fractional part length is less than or equal to scale, just pad with zeros
        if (origFractional.length <= scale) {
            return {
                integerPart,
                fractionalPart: origFractional.padEnd(scale, '0')
            };
        }
        
        // Need to truncate and potentially round
        const truncatedFractional = origFractional.slice(0, scale);
        const nextDigit = parseInt(origFractional.charAt(scale), 10);
        
        // No rounding needed
        if (nextDigit < 5) {
            return {
                integerPart,
                fractionalPart: truncatedFractional
            };
        }
        
        // Rounding needed
        // Convert to numeric representation for proper arithmetic
        const fractionalNum = BigInt(truncatedFractional) + 1n;
        const scaleFactor = BigInt(10 ** scale);
        
        // Check if rounding caused overflow
        if (fractionalNum === scaleFactor) {
            // Carry to integer part
            const integerNum = BigInt(integerPart) + 1n;
            return {
                integerPart: integerNum.toString(),
                fractionalPart: '0'.repeat(scale)
            };
        }
        
        // No overflow, just use the rounded fractional part
        return {
            integerPart,
            fractionalPart: fractionalNum.toString().padStart(scale, '0')
        };
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
     * Converts the number to a Decimal instance.
     * @param value The number to convert to a Decimal.
     * @returns A decimal instance.
     */
    static ensureDecimal(value: any): Decimal {
      if (value instanceof Decimal) {
          return value;
      }

      if (typeof value === 'number') {
          return new Decimal(value.toString());
      }

      if (typeof value === 'string') {
          return new Decimal(value);
      }

      throw new DecimalError("Unsupported value type for Decimal import.");
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
     * Compares the structure of this Decimal with another. The structure is
     * defined by precision and scale.
     * @param other The other Decimal to compare.
     * @returns True if the structure is the same, else false.
     */
    compareStructure(other: Decimal): boolean {
      return this.precision === other.precision && this.scale === other.scale;
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

    /**
     * Converts this Decimal to a new Decimal with the specified precision and scale.
     * @param targetPrecision The total number of significant digits (M)
     * @param targetScale The number of digits after the decimal point (D)
     * @returns A new Decimal with the specified precision and scale
     * @throws {DecimalError} If conversion is not possible due to precision constraints
     */
    convert(targetPrecision: number, targetScale: number): Decimal {
      // Validate that the target scale doesn't exceed the target precision
      if (targetScale > targetPrecision) {
        throw new DecimalError("Scale must be less than or equal to precision.");
      }

      try {
        // Use the existing constructor logic to handle precision and scale conversion
        return new Decimal(this, targetPrecision, targetScale);
      } catch (error) {
        // Re-throw the error for clarity
        if (error instanceof DecimalError) {
          throw error;
        }
        // Wrap any other unexpected errors
        throw new DecimalError(`Conversion failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

}

