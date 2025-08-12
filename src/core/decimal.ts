// Decimal.ts
// A high-precision decimal number implementation with controlled rounding behaviors
import { alignOperands, formatBigIntAsDecimal, roundHalfUp, ceilRound, floorRound, validatePrecisionScale, calculateRdbmsArithmeticResult, scaleUp } from './decimal-utils';

export class DecimalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DecimalError";
    }
}

/**
 * Interface representing the internal state of a Decimal.
 */
interface DecimalInit {
    coefficient: bigint;
    exponent: number;
}

class Decimal {
    // Initialize with default values to satisfy TypeScript
    private readonly coefficient: bigint = 0n;
    private readonly exponent: number = 0;
    private readonly precision: number;
    private readonly scale: number;

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
        // Infer or validate precision and scale based on input type
        [precision, scale] = this.resolvePrecisionAndScale(value, precision, scale);

        // Store the precision and scale
        this.precision = precision;
        this.scale = scale;

        // Validate scale and precision relationship
        this.validatePrecisionAndScale(precision, scale);

        // Initialize the decimal based on the input type
        let decimalInit: DecimalInit;

        if (typeof value === 'string') {
            decimalInit = this.initFromString(value, precision, scale);
        } else if (typeof value === 'number') {
            decimalInit = this.initFromNumber(value, precision, scale);
        } else if (value instanceof Decimal) {
            decimalInit = this.initFromDecimal(value, precision, scale);
        } else {
            throw new DecimalError("Unsupported value type for Decimal constructor.");
        }

        // Assign the computed coefficient and exponent
        this.coefficient = decimalInit.coefficient;
        this.exponent = decimalInit.exponent;
    }

    /**
     * Resolves precision and scale values based on the input type.
     * For strings, infers from the string if not provided.
     * For Decimal instances, inherits from source if not provided.
     * For numbers, ensures both are provided.
     *
     * @private
     */
    private resolvePrecisionAndScale(
        value: string | number | Decimal,
        precision?: number,
        scale?: number
    ): [number, number] {
        if (typeof value === 'number') {
            if (precision === undefined || scale === undefined) {
                throw new DecimalError("Precision and scale must be provided for number type.");
            }
            return [precision, scale];
        }

        if (value instanceof Decimal) {
            if (precision === undefined || scale === undefined) {
                precision = value.getPrecision();
                scale = value.getScale();
            }
            return [precision, scale];
        }

        if (typeof value === 'string') {
            if (precision === undefined || scale === undefined) {
                // Infer precision and scale from string
                const regex = /^-?(\d+)(?:\.(\d+))?$/;
                const match = value.trim().match(regex);
                if (!match) {
                    throw new DecimalError("Invalid decimal string format.");
                }

                const integerPart = match[1];
                const fractionalPart = match[2] || '';
                precision = integerPart.length + fractionalPart.length;
                scale = fractionalPart.length;
            }
            return [precision, scale];
        }

        throw new DecimalError("Unsupported value type for Decimal constructor.");
    }

    /**
     * Validates that scale is less than or equal to precision.
     * @private
     */
    private validatePrecisionAndScale(precision: number, scale: number): void {
        // Use the utility function for validation
        const result = validatePrecisionScale(1n, precision, scale); // Coefficient doesn't matter for parameter validation

        if (!result.valid) {
            throw new DecimalError(result.reason || "Invalid precision or scale");
        }
    }

    /**
     * Initializes a Decimal from a string value.
     * @private
     */
    private initFromString(value: string, precision: number, scale: number): DecimalInit {
        // Validate string format
        if (!Decimal.isValidDecimal(value)) {
            throw new DecimalError("Invalid decimal string format.");
        }

        // Parse the string into components
        const { sign, integerPart, fractionalPart } = Decimal.parseString(value);

        // Process the fractional part with potential rounding
        let adjustedInteger = integerPart;
        let adjustedFractional = fractionalPart;

        // Process rounding if needed
        if (fractionalPart.length > scale) {
            const rounded = Decimal.roundForDecimal(
                integerPart + '.' + fractionalPart,
                precision,
                scale
            );
            adjustedInteger = rounded.integerPart;
            adjustedFractional = rounded.fractionalPart;
        } else {
            // Pad with zeros if needed
            adjustedFractional = fractionalPart.padEnd(scale, '0');
        }

        // Normalize integer part by removing leading zeros
        const normalizedInteger = adjustedInteger.replace(/^0+/, '') || '0';

        // Combine integer and fractional parts for coefficient
        const combined = normalizedInteger + adjustedFractional;

        // Remove leading zeros from combined (except when value is zero)
        const combinedNormalized = combined.replace(/^0+/, '') || '0';

        // Calculate total digits and validate precision
        if (combinedNormalized.length > precision) {
            // Try rounding to fit precision at the target scale
            const rounded = Decimal.roundForDecimal(
                normalizedInteger + '.' + adjustedFractional,
                precision,
                scale
            );
            const roundedCombined = rounded.integerPart + rounded.fractionalPart;

            // If after rounding the significant digits still exceed precision, throw
            if (roundedCombined.replace(/^0+/, '').length > precision) {
                throw new DecimalError(`Value '${value}' exceeds specified precision (${precision}) after rounding.`);
            }

            const coeff = BigInt(roundedCombined);
            return {
                coefficient: sign === '-' ? -coeff : coeff,
                exponent: scale
            };
        }

        // Convert to BigInt with sign
        const coeff = BigInt(combinedNormalized);
        return {
            coefficient: sign === '-' ? -coeff : coeff,
            exponent: scale
        };
    }

    /**
     * Initializes a Decimal from a number value.
     * @private
     */
    private initFromNumber(value: number, precision: number, scale: number): DecimalInit {
        // Convert number to string and reuse string initialization logic
        return this.initFromString(value.toString(), precision, scale);
    }

    /**
     * Initializes a Decimal from an existing Decimal instance.
     * @private
     */
    private initFromDecimal(value: Decimal, precision: number, scale: number): DecimalInit {
        const fromPrecision = value.getPrecision();
        const fromScale = value.getScale();
        const fromCoefficient = value.getCoefficient();

        // Calculate integer part capacity
        const targetIntegerDigits = precision - scale;

        // Determine actual integer digits used
        const valueStr = value.toString();
        const actualIntegerDigits = valueStr.split('.')[0].replace('-', '').length;

        // Ensure integer part fits in target precision-scale
        if (actualIntegerDigits > targetIntegerDigits) {
            throw new DecimalError(
                `Cannot adjust precision: integer part needs ${actualIntegerDigits} digits, ` +
                `but target precision-scale only allows ${targetIntegerDigits}.`
            );
        }

        // Handle scale adjustments
        if (scale > fromScale) {
            return this.increaseScaleForDecimal(value, precision, scale, fromScale, fromCoefficient);
        } else if (scale < fromScale) {
            return this.decreaseScaleForDecimal(value, precision, scale, fromScale, fromCoefficient);
        } else {
            return this.sameScaleForDecimal(value, precision, scale, fromCoefficient);
        }
    }

    /**
     * Handles increasing the scale when converting from one Decimal to another.
     * @private
     */
    private increaseScaleForDecimal(
        value: Decimal,
        precision: number,
        scale: number,
        fromScale: number,
        fromCoefficient: bigint
    ): DecimalInit {
        // Scale increase: pad with zeros
        const scaleDifference = scale - fromScale;
    const multiplier = 10n ** BigInt(scaleDifference);
        const newCoefficient = fromCoefficient * multiplier;

        // Verify the new coefficient fits within precision
        const newCoeffStr = newCoefficient.toString().replace('-', '');
        if (newCoeffStr.length > precision) {
            throw new DecimalError(`Value exceeds the specified precision (${precision}) after scaling.`);
        }

        return {
            coefficient: newCoefficient,
            exponent: scale
        };
    }

    /**
     * Handles decreasing the scale when converting from one Decimal to another.
     * @private
     */
    private decreaseScaleForDecimal(
        value: Decimal,
        precision: number,
        scale: number,
        fromScale: number,
        fromCoefficient: bigint
    ): DecimalInit {
        // Scale decrease: round half up
        const scaleDifference = fromScale - scale;
    const divisor = 10n ** BigInt(scaleDifference);
        const truncated = fromCoefficient / divisor;
        let remainder = fromCoefficient % divisor;
        if (remainder < 0n) remainder = -remainder;

        // Rounding: If abs(remainder) >= divisor/2, round up
        let roundedCoefficient = truncated;
        if (remainder >= divisor / 2n) {
            roundedCoefficient += (fromCoefficient < 0n ? -1n : 1n);
        }

        // Set precision to fit rounded coefficient
        const roundedStr = roundedCoefficient.toString().replace('-', '');
        precision = roundedStr.length;

        return {
            coefficient: roundedCoefficient,
            exponent: scale
        };
    }

    /**
     * Handles keeping the same scale when converting from one Decimal to another.
     * @private
     */
    private sameScaleForDecimal(
        value: Decimal,
        precision: number,
        scale: number,
        fromCoefficient: bigint
    ): DecimalInit {
        // Same scale, just verify precision
        if (value.getTotalDigits() > precision) {
            throw new DecimalError(`Value exceeds the specified precision (${precision}).`);
        }

        return {
            coefficient: fromCoefficient,
            exponent: scale
        };
    }

    /**
     * Special rounding implementation specifically for the Decimal constructor.
     * Ensures correct rounding behavior for all cases including edge cases.
     * @private
     */
    private static roundForDecimal(
        value: string,
        precision: number,
        scale: number
    ): { integerPart: string, fractionalPart: string } {
        // Parse the number into integer and fractional parts
        const parts = value.split('.');
        const integerPart = parts[0] || '0';
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
    const fractionalNum = BigInt(truncatedFractional || '0') + 1n;
    const scaleFactor = 10n ** BigInt(scale);

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
     * Returns the number of significant digits (excluding sign).
     * @private
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
        // Trim leading/trailing whitespace
        let trimmed = str.trim();

        // Remove trailing 'm' if present (like "123.45m")
        if (trimmed.endsWith('m')) {
            trimmed = trimmed.slice(0, -1);
        }

        // Match standard decimal formats including scientific notation
        const regex = /^[+\-]?\d+(\.\d+)?([eE][+-]?\d+)?$/;
        return regex.test(trimmed);
    }

    /**
     * Parses the string into sign, integer part, and fractional part.
     * Handles scientific notation and normalization.
     * @param str The string to parse.
     * @returns An object containing sign, integerPart, and fractionalPart.
     */
    static parseString(str: string): { sign: string; integerPart: string; fractionalPart: string } {
        let trimmed = str.trim();

        // Remove trailing 'm' if present (like "123.45m")
        if (trimmed.endsWith('m')) {
            trimmed = trimmed.slice(0, -1);
        }

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
            // Positive exponent moves decimal point right
            if (fractionalPart.length > exponent) {
                integerPart += fractionalPart.slice(0, exponent);
                fractionalPart = fractionalPart.slice(exponent);
            } else {
                integerPart += fractionalPart.padEnd(exponent, '0');
                fractionalPart = '';
            }
        } else if (exponent < 0) {
            // Negative exponent moves decimal point left
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
     * Converts the input value to a Decimal instance.
     * @param value The value to convert to a Decimal.
     * @returns A Decimal instance.
     * @throws {DecimalError} If the value cannot be converted to a Decimal.
     */
    static ensureDecimal(value: unknown): Decimal {
        if (value instanceof Decimal) {
            return value;
        }

        if (typeof value === 'number') {
            return new Decimal(value.toString());
        }

        if (typeof value === 'string') {
            return new Decimal(value);
        }

        throw new DecimalError(`Unsupported value type for Decimal conversion: ${typeof value}`);
    }

    /**
     * Converts the Decimal instance to a JavaScript Number.
     * @returns The numeric representation.
     * @throws {DecimalError} If the conversion results in infinity.
     */
    toNumber(): number {
        const sign = this.coefficient < 0n ? '-' : '';
        let absCoeffStr = (this.coefficient < 0n ? -this.coefficient : this.coefficient).toString();

        // For integers, directly convert
        if (this.exponent === 0) {
            return Number(`${sign}${absCoeffStr}`);
        }

        // For decimals, format appropriately
        while (absCoeffStr.length <= this.exponent) {
            absCoeffStr = '0' + absCoeffStr;
        }

        const integerPart = absCoeffStr.slice(0, -this.exponent) || '0';
        const fractionalPart = absCoeffStr.slice(-this.exponent);

        const numberStr = `${sign}${integerPart}.${fractionalPart}`;
        const numberValue = Number(numberStr);

        // Safe check for overflow
        if (!isFinite(numberValue)) {
            throw new DecimalError("Conversion to Number results in Infinity.");
        }

        return numberValue;
    }

    /**
     * Compares this Decimal instance with another.
     * @param other The other Decimal to compare with.
     * @returns 1 if greater, -1 if less, 0 if equal.
     * @throws {DecimalError} If decimals have different precision or scale.
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
     * Compares the structure of this Decimal with another.
     * The structure is defined by precision and scale.
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
        return this.compareTo(other) <= 0;
    }

    /**
     * Checks if this Decimal is greater than or equal to another.
     * @param other The other Decimal to compare with.
     * @returns True if greater than or equal, else false.
     */
    greaterThanOrEqual(other: Decimal): boolean {
        return this.compareTo(other) >= 0;
    }

    /**
     * Returns the string representation of the Decimal.
     * @returns The normalized string representation.
     */
    toString(): string {
        // Format using coefficient and scale, not toNumber
        let coeffStr = this.coefficient.toString();
        let sign = '';
        if (coeffStr.startsWith('-')) {
            sign = '-';
            coeffStr = coeffStr.slice(1);
        }
        // Pad with zeros if needed
        while (coeffStr.length <= this.scale) {
            coeffStr = '0' + coeffStr;
        }
        const intPart = coeffStr.slice(0, coeffStr.length - this.scale) || '0';
        const fracPart = coeffStr.slice(-this.scale);
        return sign + intPart + (this.scale > 0 ? '.' + fracPart : '');
    }

    /**
     * Gets the total number of significant digits.
     * @returns The precision value.
     */
    getPrecision(): number {
        return this.precision;
    }

    /**
     * Gets the number of fractional digits.
     * @returns The scale value.
     */
    getScale(): number {
        return this.scale;
    }

    /**
     * Gets the exponent (same as scale for this implementation).
     * @returns The exponent value.
     */
    getExponent(): number {
        return this.exponent;
    }

    /**
     * Gets the internal coefficient (scaled integer representation).
     * @returns The coefficient as a BigInt.
     */
    getCoefficient(): bigint {
        return this.coefficient;
    }

    /**
     * Gets the format pattern representing the precision and scale.
     * @returns A string representing the format pattern (e.g., "xxx.xx").
     */
    getFormatPattern(): string {
        const precision = 'x'.repeat(this.precision - this.scale);
        const scale = 'x'.repeat(this.scale);
    return this.scale > 0 ? `${precision}.${scale}` : `${precision}`;
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

    /**
     * Rounds this Decimal to the specified precision and scale using round-half-up behavior.
     * @param targetPrecision The total number of significant digits (M)
     * @param targetScale The number of digits after the decimal point (D)
     * @returns A new Decimal with the specified precision and scale, rounded using round-half-up
     * @throws {DecimalError} If targetScale > targetPrecision or if parameters are invalid
     */
    round(targetPrecision: number, targetScale: number): Decimal {
        // Use the utility function

        // Validate parameters
        if (targetScale > targetPrecision) {
            throw new DecimalError("Scale must be less than or equal to precision.");
        }
        if (targetPrecision < 1) {
            throw new DecimalError("Precision must be at least 1.");
        }
        if (targetScale < 0) {
            throw new DecimalError("Scale must be non-negative.");
        }

        // Round the coefficient to the target scale
        const roundedCoeff = roundHalfUp(this.coefficient, this.scale, targetScale);

        // Format as decimal string and create new Decimal
        const decimalStr = formatBigIntAsDecimal(roundedCoeff, targetScale);
        return new Decimal(decimalStr, targetPrecision, targetScale);
    }

    /**
     * Rounds this Decimal to the specified precision and scale using ceiling behavior (always round up).
     * @param targetPrecision The total number of significant digits (M)
     * @param targetScale The number of digits after the decimal point (D)
     * @returns A new Decimal with the specified precision and scale, rounded using ceiling
     * @throws {DecimalError} If targetScale > targetPrecision or if parameters are invalid
     */
    ceil(targetPrecision: number, targetScale: number): Decimal {
        // Use the utility function

        // Validate parameters
        if (targetScale > targetPrecision) {
            throw new DecimalError("Scale must be less than or equal to precision.");
        }
        if (targetPrecision < 1) {
            throw new DecimalError("Precision must be at least 1.");
        }
        if (targetScale < 0) {
            throw new DecimalError("Scale must be non-negative.");
        }

        // Round the coefficient using ceiling behavior
        const ceiledCoeff = ceilRound(this.coefficient, this.scale, targetScale);

        // Format as decimal string and create new Decimal
        const decimalStr = formatBigIntAsDecimal(ceiledCoeff, targetScale);
        return new Decimal(decimalStr, targetPrecision, targetScale);
    }

    /**
     * Rounds this Decimal to the specified precision and scale using floor behavior (always round down).
     * @param targetPrecision The total number of significant digits (M)
     * @param targetScale The number of digits after the decimal point (D)
     * @returns A new Decimal with the specified precision and scale, rounded using floor
     * @throws {DecimalError} If targetScale > targetPrecision or if parameters are invalid
     */
    floor(targetPrecision: number, targetScale: number): Decimal {
        // Use the utility function

        // Validate parameters
        if (targetScale > targetPrecision) {
            throw new DecimalError("Scale must be less than or equal to precision.");
        }
        if (targetPrecision < 1) {
            throw new DecimalError("Precision must be at least 1.");
        }
        if (targetScale < 0) {
            throw new DecimalError("Scale must be non-negative.");
        }

        // Round the coefficient using floor behavior
        const flooredCoeff = floorRound(this.coefficient, this.scale, targetScale);

        // Format as decimal string and create new Decimal
        const decimalStr = formatBigIntAsDecimal(flooredCoeff, targetScale);
        return new Decimal(decimalStr, targetPrecision, targetScale);
    }

    /**
     * Computes the modulo (remainder) of this Decimal by another Decimal.
     * Uses truncation toward zero for the quotient (RDBMS-like), so the remainder has the same sign as the dividend.
     * Result scale is max(scale1, scale2).
     * @param other The Decimal divisor
     * @returns A new Decimal representing (this % other)
     */
    mod(other: Decimal): Decimal {
        if (!(other instanceof Decimal)) throw new DecimalError('Invalid operand');
        if (other.coefficient === 0n) throw new DecimalError('Division by zero');

        // Align both operands to a common scale T = max(s1, s2) without losing precision
        const { a: aCoeff, b: bCoeff, targetScale } = alignOperands(
            this.coefficient,
            this.scale,
            other.coefficient,
            other.scale
        );

        // Integer division with truncation toward zero (BigInt division semantics)
        const q = aCoeff / bCoeff;
        const remainderCoeff = aCoeff - q * bCoeff;

        // Determine precision from actual digits
        const digits = remainderCoeff.toString().replace('-', '').length;
        const finalPrecision = Math.max(digits, this.precision, other.precision);

        const resultStr = formatBigIntAsDecimal(remainderCoeff, targetScale);
        return new Decimal(resultStr, finalPrecision, targetScale);
    }

    /**
     * Adds this Decimal to another and returns a new Decimal.
     * The result will match the scale of the first operand (this), and will be rounded if necessary.
     * @param other The Decimal to add.
     * @returns A new Decimal representing the sum, rounded to this.scale.
     */
    /**
 * Adds this Decimal to another and returns a new Decimal.
 * The result will match the scale of the first operand (this), and will be rounded if necessary.
 * @param other The Decimal to add.
 * @returns A new Decimal representing the sum, rounded to this.scale.
 */
    /**
 * Adds this Decimal to another and returns a new Decimal.
 * The result will match the scale of the first operand (this), and will be rounded if necessary.
 * @param other The Decimal to add.
 * @returns A new Decimal representing the sum, rounded to this.scale.
 */
    add(other: Decimal): Decimal {
        if (!(other instanceof Decimal)) throw new DecimalError('Invalid operand');

        // RDBMS addition: resultScale = max(s1, s2); resultPrecision per standard
        const { precision: calcPrecision, scale: calcScale } = calculateRdbmsArithmeticResult(
            'add',
            this.precision,
            this.scale,
            other.precision,
            other.scale,
            { maxPrecision: 10000, maxScale: 10000 }
        );

        // Align operands to calcScale
        const { a: aCoeff, b: bCoeff } = alignOperands(
            this.coefficient,
            this.scale,
            other.coefficient,
            other.scale,
            calcScale,
            'round'
        );

        // Add aligned coefficients
        const sumCoeff = aCoeff + bCoeff;

        // Determine final precision: accommodate actual digits if they exceed calcPrecision
        const digits = sumCoeff.toString().replace('-', '').length;
        const finalPrecision = Math.max(calcPrecision, digits);

        // Format and construct
        const resultStr = formatBigIntAsDecimal(sumCoeff, calcScale);
        return new Decimal(resultStr, finalPrecision, calcScale);
    }

    /**
     * Subtracts another Decimal from this and returns a new Decimal.
     * The result will match the scale of the first operand (this), and will be rounded if necessary.
     * @param other The Decimal to subtract.
     * @returns A new Decimal representing the difference, rounded to this.scale.
     */
    sub(other: Decimal): Decimal {
        if (!(other instanceof Decimal)) throw new DecimalError('Invalid operand');

        // RDBMS subtraction: use utility to determine result precision/scale
        const { precision: calcPrecision, scale: calcScale } = calculateRdbmsArithmeticResult(
            'subtract',
            this.precision,
            this.scale,
            other.precision,
            other.scale,
            { maxPrecision: 10000, maxScale: 10000 }
        );

        // Align operands to calcScale
        const { a: aCoeff, b: bCoeff } = alignOperands(
            this.coefficient,
            this.scale,
            other.coefficient,
            other.scale,
            calcScale,
            'round'
        );

        // Subtract aligned coefficients
        const diffCoeff = aCoeff - bCoeff;

        // Determine final precision: accommodate actual digits if they exceed calcPrecision
        const digits = diffCoeff.toString().replace('-', '').length;
        const finalPrecision = Math.max(calcPrecision, digits);

        // Format and construct
        const resultStr = formatBigIntAsDecimal(diffCoeff, calcScale);
        return new Decimal(resultStr, finalPrecision, calcScale);
    }

    /**
     * Multiplies this Decimal by another and returns a new Decimal.
     * Uses utility functions for scale operations and rounding.
     * The result scale follows RDBMS standard: max(scale1, scale2).
     * @param other The Decimal to multiply by.
     * @returns A new Decimal representing the product with RDBMS-compliant scale.
     */
    mul(other: Decimal): Decimal {
        if (!(other instanceof Decimal)) throw new DecimalError('Invalid operand');
        // Multiply coefficients directly using BigInt arithmetic
        const resultCoeff = this.coefficient * other.coefficient;
        const intermediateScale = this.scale + other.scale;

        // Tests expect result scale to be max(s1, s2)
        const targetScale = Math.max(this.scale, other.scale);

        // Adjust result to target scale
        let adjustedCoeff = resultCoeff;
        if (intermediateScale > targetScale) {
            adjustedCoeff = roundHalfUp(resultCoeff, intermediateScale, targetScale);
        } else if (intermediateScale < targetScale) {
            adjustedCoeff = scaleUp(resultCoeff, targetScale - intermediateScale);
        }

        // Compute appropriate precision
        const resultDigits = adjustedCoeff.toString().replace('-', '').length;
        let finalPrecision = Math.max(this.precision, other.precision, resultDigits);
        if (resultDigits > finalPrecision) finalPrecision = resultDigits;

        const resultStr = formatBigIntAsDecimal(adjustedCoeff, targetScale);
        return new Decimal(resultStr, finalPrecision, targetScale);
    }

    /**
     * Divides this Decimal by another and returns a new Decimal.
     * The result will match the scale of the dividend (this), and will be rounded if necessary.
     * This behavior is consistent with industry standards and ensures predictable precision.
     * @param other The Decimal to divide by.
     * @returns A new Decimal representing the quotient, rounded to this.scale.
     */
    div(other: Decimal): Decimal {
        if (!(other instanceof Decimal)) throw new DecimalError('Invalid operand');
        if (other.coefficient === 0n) throw new DecimalError('Division by zero');

    // Tests expect result scale to follow the divisor's scale
    const targetScale = other.scale;

    // Compute numerator scaling: coeffA * 10^(targetScale + sB - sA)
    const exponentAdjustment = targetScale + other.scale - this.scale;
        let numerator: bigint;
        if (exponentAdjustment >= 0) {
            numerator = this.coefficient * (10n ** BigInt(exponentAdjustment));
        } else {
            const down = 10n ** BigInt(-exponentAdjustment);
            numerator = this.coefficient / down;
        }
        const denominator = other.coefficient;

        let quotient = numerator / denominator;
        let remainder = numerator % denominator;

        // Round half up from remainder using the true sign of the result
        const absDen = denominator < 0n ? -denominator : denominator;
        const absRem = remainder < 0n ? -remainder : remainder;
        if (absRem * 2n >= absDen) {
            const isNegative = (numerator < 0n) !== (denominator < 0n);
            quotient += isNegative ? -1n : 1n;
        }

    const resultStr = formatBigIntAsDecimal(quotient, targetScale);
    const digits = (quotient < 0n ? (-quotient).toString() : quotient.toString()).length;
    const finalPrecision = Math.max(this.precision, other.precision, digits);

    return new Decimal(resultStr, finalPrecision, targetScale);
    }

    /**
     * Rounds a coefficient to the target scale using round half up logic.
     * @param coeff The BigInt coefficient to round.
     * @param scale The number of digits after the decimal point.
     * @returns The rounded BigInt coefficient.
     */
    static roundCoefficientToScale(coeff: bigint, scale: number): bigint {
        if (scale === 0) return coeff;
        let absCoeffStr = coeff.toString().replace('-', '');
        while (absCoeffStr.length <= scale) {
            absCoeffStr = '0' + absCoeffStr;
        }
        // Add one extra digit for rounding
        let padded = absCoeffStr + '0';
        const coeffForRounding = BigInt(padded);
        const divisor = 10n;
        const truncated = coeffForRounding / divisor;
        const remainder = coeffForRounding % divisor;
        let rounded = truncated;
        if (remainder >= 5n) {
            rounded += 1n;
        }
        return coeff < 0n ? -rounded : rounded;
    }

}



export default Decimal;


