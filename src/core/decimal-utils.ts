/**
 * Decimal Utility Functions
 *
 * Core utility functions for decimal arithmetic operations following KISS principles.
 * All functions use BigInt-only calculations and avoid JavaScript Number class.
 */
import { DecimalError } from './decimal';

/**
 * Result of coefficient normalization
 */
export interface NormalizedCoefficient {
    coefficient: bigint;
    isZero: boolean;
}

/**
 * Result of precision and scale validation
 */
export interface ValidationResult {
    valid: boolean;
    reason?: string;
}

/**
 * Normalizes a BigInt coefficient by handling leading zeros and sign normalization.
 *
 * @param coefficient The BigInt coefficient to normalize
 * @returns Normalized coefficient and zero flag
 */
export function normalizeCoefficient(coefficient: bigint): NormalizedCoefficient {
    // Handle zero case
    if (coefficient === 0n) {
        return {
            coefficient: 0n,
            isZero: true
        };
    }

    // For non-zero values, BigInt already handles normalization
    // No leading zeros exist in BigInt representation
    return {
        coefficient,
        isZero: false
    };
}

/**
 * Gets the absolute value of a BigInt coefficient.
 *
 * @param coefficient The BigInt coefficient
 * @returns The absolute value as BigInt
 */
export function getAbsoluteValue(coefficient: bigint): bigint {
    return coefficient < 0n ? -coefficient : coefficient;
}

/**
 * Gets the sign of a BigInt coefficient.
 *
 * @param coefficient The BigInt coefficient
 * @returns 1 for positive, -1 for negative, 0 for zero
 */
export function getSign(coefficient: bigint): 1 | -1 | 0 {
    if (coefficient === 0n) return 0;
    return coefficient > 0n ? 1 : -1;
}

/**
 * Cache for powers of 10
 */
const POW10_CACHE: Map<number, bigint> = new Map();

/**
 * Gets a power of 10 as BigInt, using cache for performance.
 * @param exponent The exponent for the power of 10
 * @returns 10^exponent as BigInt
 */
export function getPow10(exponent: number): bigint {
    if (exponent < 0) {
        throw new Error('Exponent must be non-negative');
    }
    if (!POW10_CACHE.has(exponent)) {
        POW10_CACHE.set(exponent, 10n ** BigInt(exponent));
    }
    return POW10_CACHE.get(exponent)!;
}

/**
 * Scales up a coefficient by multiplying by powers of 10.
 * Effectively moves the decimal point to the right.
 *
 * @param coefficient The BigInt coefficient to scale up
 * @param scaleFactor The number of decimal places to scale up (must be non-negative)
 * @returns The scaled up coefficient
 * @throws Error if scaleFactor is negative
 */
export function scaleUp(coefficient: bigint, scaleFactor: number): bigint {
    if (scaleFactor < 0) {
        throw new Error(`Scale factor must be non-negative, got ${scaleFactor}`);
    }
    if (scaleFactor === 0) {
        return coefficient;
    }
    return coefficient * getPow10(scaleFactor);
}

/**
 * Scales down a coefficient by dividing by powers of 10 with basic truncation.
 * Effectively moves the decimal point to the left.
 *
 * @param coefficient The BigInt coefficient to scale down
 * @param scaleFactor The number of decimal places to scale down (must be non-negative)
 * @returns The scaled down coefficient (truncated, not rounded)
 * @throws Error if scaleFactor is negative
 */
export function scaleDown(coefficient: bigint, scaleFactor: number): bigint {
    if (scaleFactor < 0) {
        throw new Error('Scale factor must be non-negative');
    }

    if (scaleFactor === 0) {
        return coefficient;
    }

    return coefficient / getPow10(scaleFactor);
}

/**
 * Rounds a coefficient using round-half-up behavior when scaling down.
 *
 * @param coefficient The BigInt coefficient to round
 * @param currentScale The current scale of the coefficient
 * @param targetScale The target scale after rounding
 * @returns The rounded coefficient
 * @throws Error if targetScale is negative or currentScale is negative
 */
export function roundHalfUp(coefficient: bigint, currentScale: number, targetScale: number): bigint {
    if (currentScale < 0 || targetScale < 0) {
        throw new Error('Scales must be non-negative');
    }

    if (currentScale <= targetScale) {
        // Scale up by padding zeros
        return scaleUp(coefficient, targetScale - currentScale);
    }

    // Scale down with rounding
    const scaleDiff = currentScale - targetScale;
    const divisor = getPow10(scaleDiff);
    const quotient = coefficient / divisor;
    const remainder = coefficient % divisor;

    // Round half up logic
    const halfDivisor = divisor / 2n;
    const absRemainder = remainder < 0n ? -remainder : remainder;

    if (absRemainder >= halfDivisor) {
        return quotient + (coefficient >= 0n ? 1n : -1n);
    }

    return quotient;
}

/**
 * Rounds a coefficient using ceiling behavior (always round up) when scaling down.
 *
 * @param coefficient The BigInt coefficient to round
 * @param currentScale The current scale of the coefficient
 * @param targetScale The target scale after rounding
 * @returns The ceiling rounded coefficient
 * @throws Error if targetScale is negative or currentScale is negative
 */
export function ceilRound(coefficient: bigint, currentScale: number, targetScale: number): bigint {
    if (currentScale < 0 || targetScale < 0) {
        throw new Error('Scales must be non-negative');
    }

    if (currentScale <= targetScale) {
        // Scale up by padding zeros
        return scaleUp(coefficient, targetScale - currentScale);
    }

    // Scale down with ceiling
    const scaleDiff = currentScale - targetScale;
    const divisor = getPow10(scaleDiff);
    const quotient = coefficient / divisor;
    const remainder = coefficient % divisor;

    // Ceiling logic: if there's any remainder and coefficient is positive, round up
    // If coefficient is negative and there's remainder, don't round (towards zero)
    if (remainder !== 0n && coefficient > 0n) {
        return quotient + 1n;
    }

    return quotient;
}

/**
 * Rounds a coefficient using floor behavior (always round down) when scaling down.
 *
 * @param coefficient The BigInt coefficient to round
 * @param currentScale The current scale of the coefficient
 * @param targetScale The target scale after rounding
 * @returns The floor rounded coefficient
 * @throws Error if targetScale is negative or currentScale is negative
 */
export function floorRound(coefficient: bigint, currentScale: number, targetScale: number): bigint {
    if (currentScale < 0 || targetScale < 0) {
        throw new Error('Scales must be non-negative');
    }

    if (currentScale <= targetScale) {
        // Scale up by padding zeros
        return scaleUp(coefficient, targetScale - currentScale);
    }

    // Scale down with floor
    const scaleDiff = currentScale - targetScale;
    const divisor = getPow10(scaleDiff);
    const quotient = coefficient / divisor;
    const remainder = coefficient % divisor;

    // Floor logic: if there's any remainder and coefficient is negative, round down
    // If coefficient is positive and there's remainder, don't round (towards zero)
    if (remainder !== 0n && coefficient < 0n) {
        return quotient - 1n;
    }

    return quotient;
}

/**
 * Formats a BigInt coefficient as a decimal string with the specified scale and precision.
 * Uses normalization utilities for proper coefficient handling and decimal point placement.
 *
 * @param coefficient The BigInt coefficient to format
 * @param scale The number of decimal places
 * @param precision Optional. The total number of significant digits. If provided, validates that the coefficient fits within precision.
 * @returns The formatted decimal string
 * @throws Error if the coefficient exceeds the specified precision
 */
export function formatBigIntAsDecimal(coefficient: bigint, scale: number, precision?: number): string {
    // Handle zero case
    if (coefficient === 0n) {
        return scale > 0 ? `0.${'0'.repeat(scale)}` : '0';
    }

    // Validate precision and scale if precision is provided
    if (precision !== undefined) {
        const validationResult = validatePrecisionScale(coefficient, precision, scale);
        if (!validationResult.valid) {
            throw new DecimalError(`Coefficient validation failed: ${validationResult.reason}`);
        }
    }

    // Extract sign and work with absolute value
    const sign = coefficient < 0n ? '-' : '';
    const absCoeff = coefficient < 0n ? -coefficient : coefficient;
    let coeffStr = absCoeff.toString();

    // Pad with leading zeros if needed
    while (coeffStr.length <= scale) {
        coeffStr = '0' + coeffStr;
    }

    // Split into integer and fractional parts
    const integerPart = coeffStr.slice(0, coeffStr.length - scale) || '0';
    const fractionalPart = scale > 0 ? coeffStr.slice(-scale) : '';

    // Validate that the formatted number fits within precision constraints
    // This is a check on the significant digits in the formatted result
    if (precision !== undefined) {
        // Count significant digits (ignore leading zeros in integer part)
        const significantIntegerDigits = integerPart === '0' ? 0 : integerPart.replace(/^0+/, '').length;

        // For fractional part, count all digits except trailing zeros if integer part is 0
        let significantFractionalDigits = fractionalPart.length;
        if (significantIntegerDigits === 0) {
            // For values less than 1, ignore leading zeros in fractional part
            const significantFractionalPart = fractionalPart.replace(/^0+/, '');
            significantFractionalDigits = significantFractionalPart.length || 0;
        }

        const totalSignificantDigits = significantIntegerDigits + significantFractionalDigits;

        if (totalSignificantDigits > precision) {
            throw new DecimalError(`Formatted value exceeds specified precision (${precision}). Value has ${totalSignificantDigits} significant digits.`);
        }
    }

    return sign + integerPart + (scale > 0 ? '.' + fractionalPart : '');
}

/**
 * Fits a coefficient to the specified precision by truncating and rounding if necessary.
 * Uses the specified rounding mode to handle precision overflow.
 *
 * @param coefficient The BigInt coefficient to fit to precision
 * @param precision The maximum number of significant digits allowed
 * @param scale The current scale of the coefficient
 * @param roundingMode The rounding mode to use ('round', 'ceil', 'floor')
 * @returns The coefficient fitted to the specified precision
 * @throws DecimalError if the coefficient cannot be fitted to the precision
 */
export function fitToPrecision(
    coefficient: bigint,
    precision: number,
    scale: number,
    roundingMode: 'round' | 'ceil' | 'floor' = 'round'
): bigint {
    // Handle zero coefficient
    if (coefficient === 0n) {
        return 0n;
    }

    // Get absolute value for digit counting
    const absCoeff = getAbsoluteValue(coefficient);
    const coeffStr = absCoeff.toString();

    // If already fits within precision, return unchanged
    if (coeffStr.length <= precision) {
        return coefficient;
    }

    // Calculate how many digits to remove
    const excessDigits = coeffStr.length - precision;

    // If excess digits are more than scale, we can't fit without losing integer part
    if (excessDigits > scale) {
        // We would lose digits from the integer part, which is not allowed
        throw new DecimalError(
            `Cannot fit coefficient to precision ${precision}. ` +
            `Coefficient has ${coeffStr.length} digits with scale ${scale}. ` +
            `Would lose ${excessDigits - scale} digits from integer part.`
        );
    }

    // Calculate target scale after truncation
    const targetScale = scale - excessDigits;

    // Apply appropriate rounding based on mode
    let result: bigint;
    switch (roundingMode) {
        case 'round':
            result = roundHalfUp(coefficient, scale, targetScale);
            break;
        case 'ceil':
            result = ceilRound(coefficient, scale, targetScale);
            break;
        case 'floor':
            result = floorRound(coefficient, scale, targetScale);
            break;
        default:
            throw new DecimalError(`Invalid rounding mode: ${roundingMode}`);
    }

    // Verify the result fits within precision
    const resultStr = getAbsoluteValue(result).toString();
    if (resultStr.length > precision) {
        // This can happen with rounding (e.g., 999 rounded to 2 digits becomes 1000)
        // In this case, we need to adjust scale again
        if (targetScale > 0) {
            // Use the same rounding mode for consistency
            switch (roundingMode) {
                case 'round':
                    return roundHalfUp(result, targetScale, targetScale - 1);
                case 'ceil':
                    return ceilRound(result, targetScale, targetScale - 1);
                case 'floor':
                    return floorRound(result, targetScale, targetScale - 1);
                default:
                    throw new DecimalError(`Invalid rounding mode: ${roundingMode}`);
            }
        } else {
            // Special case for rounding that causes overflow (e.g., 9999 -> 10000)
            // If the result ends with zeros, we can remove them to fit precision
            if (result % 10n === 0n) {
                // Count trailing zeros
                let tempResult = result;
                let zerosToRemove = 0;
                while (tempResult % 10n === 0n && zerosToRemove < resultStr.length - precision) {
                    tempResult = tempResult / 10n;
                    zerosToRemove++;
                }

                if (getAbsoluteValue(tempResult).toString().length <= precision) {
                    return tempResult;
                }
            }

            throw new DecimalError(
                `Rounding resulted in precision overflow. ` +
                `Result has ${resultStr.length} digits, but precision is ${precision}.`
            );
        }
    }

    return result;
}

/**
 * Validates if a coefficient fits within the specified precision and scale constraints.
 *
 * @param coefficient The BigInt coefficient to validate
 * @param precision The maximum number of significant digits allowed
 * @param scale The number of decimal places
 * @returns A ValidationResult object indicating if the coefficient is valid and why if not
 */
export function validatePrecisionScale(
    coefficient: bigint,
    precision: number,
    scale: number
): ValidationResult {
    // Validate precision and scale parameters
    if (precision <= 0) {
        return { valid: false, reason: 'Precision must be positive' };
    }

    if (scale < 0) {
        return { valid: false, reason: 'Scale must be non-negative' };
    }

    if (scale > precision) {
        return { valid: false, reason: 'Scale must be less than or equal to precision' };
    }

    // Handle zero coefficient (always valid)
    if (coefficient === 0n) {
        return { valid: true };
    }

    // Get absolute value for digit counting
    const absCoeff = getAbsoluteValue(coefficient);
    const coeffStr = absCoeff.toString();

    // Check if coefficient fits within precision
    if (coeffStr.length > precision) {
        return {
            valid: false,
            reason: `Coefficient has ${coeffStr.length} digits, exceeding precision of ${precision}`
        };
    }

    // Calculate integer part digits
    const integerDigits = coeffStr.length - scale;

    // If integer part is negative, we have leading zeros in fractional part
    if (integerDigits < 0) {
        // This is valid, as it means we have leading zeros in fractional part
        // For example: 0.001 with scale 3 has integerDigits = -2
        return { valid: true };
    }

    // If we get here, the coefficient fits within precision and scale constraints
    return { valid: true };
}

/**
 * Result of long division operation
 */
export interface DivisionResult {
    quotient: bigint;
    remainder: bigint;
    isExact: boolean;
    repeatingDigits?: string;
}

/**
 * Performs long division between two BigInt coefficients with specified scale and precision.
 * Handles repeating decimals and precision constraints.
 *
 * @param dividend The dividend coefficient
 * @param divisor The divisor coefficient (must not be zero)
 * @param scale The desired scale (decimal places) for the result
 * @param precision The maximum precision allowed for the result
 * @param maxIterations Maximum number of iterations to detect repeating decimals (default: 100)
 * @returns A DivisionResult object containing quotient, remainder, and flags for exactness and repeating digits
 * @throws DecimalError if divisor is zero or if precision constraints cannot be met
 */
export function performLongDivision(
    dividend: bigint,
    divisor: bigint,
    scale: number,
    precision: number,
    maxIterations: number = 100
): DivisionResult {
    // Validate inputs
    if (divisor === 0n) {
        throw new DecimalError("Division by zero");
    }

    if (precision <= 0) {
        throw new DecimalError("Precision must be positive");
    }

    if (scale < 0) {
        throw new DecimalError("Scale must be non-negative");
    }

    if (scale > precision) {
        throw new DecimalError("Scale must be less than or equal to precision");
    }

    // Handle zero dividend case
    if (dividend === 0n) {
        return {
            quotient: 0n,
            remainder: 0n,
            isExact: true
        };
    }

    // Work with absolute values for division
    const isNegative = (dividend < 0n) !== (divisor < 0n);
    const absDividend = getAbsoluteValue(dividend);
    const absDivisor = getAbsoluteValue(divisor);

    // Scale up the dividend to get the desired decimal places (use cached pow10)
    const scaledDividend = absDividend * getPow10(scale);

    // Perform integer division
    let quotient = scaledDividend / absDivisor;
    const remainder = scaledDividend % absDivisor;

    // Check if division is exact
    const isExact = remainder === 0n;

    // Apply sign to quotient
    if (isNegative) {
        quotient = -quotient;
    }

    // Check for repeating decimals if not exact
    let repeatingDigits: string | undefined;
    if (!isExact && scale > 0) {
        repeatingDigits = detectRepeatingDecimals(absDividend, absDivisor, scale, maxIterations);
    }

    // Ensure the result fits within precision constraints
    const quotientStr = getAbsoluteValue(quotient).toString();
    if (quotientStr.length > precision) {
        // For division, we should truncate excess digits rather than trying to round
        // This is because division can produce an infinite number of digits
        const excessDigits = quotientStr.length - precision;

        if (excessDigits <= scale) {
            // We can truncate from the fractional part
            const divisor = 10n ** BigInt(excessDigits);
            quotient = quotient / divisor;
        } else {
            // Cannot fit within precision constraints
            throw new DecimalError(
                `Division result exceeds precision limit (${precision}). ` +
                `Result has ${quotientStr.length} digits, but precision is ${precision}.`
            );
        }
    }

    return {
        quotient,
        remainder: isNegative ? -remainder : remainder,
        isExact,
        repeatingDigits
    };
}

/**
 * Result of operand alignment
 */
export interface AlignedOperands {
    a: bigint;
    b: bigint;
    targetScale: number;
    scaleAdjustment: number;
}

/**
 * Aligns two decimal operands to have the same scale for arithmetic operations.
 * Scales up the operand with the smaller scale to match the larger scale.
 *
 * @param aCoefficient First operand coefficient
 * @param aScale Scale of the first operand
 * @param bCoefficient Second operand coefficient
 * @param bScale Scale of the second operand
 * @param maxScale Optional maximum scale to limit the result scale (default: no limit)
 * @param roundingMode The rounding mode to use when scaling down ('round', 'ceil', 'floor')
 * @returns An AlignedOperands object with aligned coefficients and the target scale
 */
export function alignOperands(
    aCoefficient: bigint,
    aScale: number,
    bCoefficient: bigint,
    bScale: number,
    maxScale?: number,
    roundingMode: 'round' | 'ceil' | 'floor' = 'round'
): AlignedOperands {
    // Handle zero operands
    if (aCoefficient === 0n) {
        return {
            a: 0n,
            b: bCoefficient,
            targetScale: bScale,
            scaleAdjustment: 0
        };
    }

    if (bCoefficient === 0n) {
        return {
            a: aCoefficient,
            b: 0n,
            targetScale: aScale,
            scaleAdjustment: 0
        };
    }

    // Determine target scale (the larger of the two scales)
    let targetScale = Math.max(aScale, bScale);

    // Apply maximum scale constraint if provided
    if (maxScale !== undefined && targetScale > maxScale) {
        targetScale = maxScale;
    }

    // Calculate scale adjustments
    const aAdjustment = targetScale - aScale;
    const bAdjustment = targetScale - bScale;

    // Scale up operands as needed
    let adjustedA = aCoefficient;
    let adjustedB = bCoefficient;

    if (aAdjustment > 0) {
        adjustedA = scaleUp(aCoefficient, aAdjustment);
    }

    if (bAdjustment > 0) {
        adjustedB = scaleUp(bCoefficient, bAdjustment);
    }

    // If maxScale is less than either original scale, we need to scale down
    if (maxScale !== undefined) {
        if (aScale > maxScale) {
            // Use the specified rounding mode
            switch (roundingMode) {
                case 'round':
                    adjustedA = roundHalfUp(aCoefficient, aScale, maxScale);
                    break;
                case 'ceil':
                    adjustedA = ceilRound(aCoefficient, aScale, maxScale);
                    break;
                case 'floor':
                    adjustedA = floorRound(aCoefficient, aScale, maxScale);
                    break;
                default:
                    throw new DecimalError(`Invalid rounding mode: ${roundingMode}`);
            }
        }

        if (bScale > maxScale) {
            // Use the specified rounding mode
            switch (roundingMode) {
                case 'round':
                    adjustedB = roundHalfUp(bCoefficient, bScale, maxScale);
                    break;
                case 'ceil':
                    adjustedB = ceilRound(bCoefficient, bScale, maxScale);
                    break;
                case 'floor':
                    adjustedB = floorRound(bCoefficient, bScale, maxScale);
                    break;
                default:
                    throw new DecimalError(`Invalid rounding mode: ${roundingMode}`);
            }
        }
    }

    return {
        a: adjustedA,
        b: adjustedB,
        targetScale,
        scaleAdjustment: Math.max(aAdjustment, bAdjustment)
    };
}

/**
 * Detects repeating decimals in division operation.
 * Uses the standard long division algorithm to identify repeating patterns.
 *
 * @param dividend The dividend (absolute value)
 * @param divisor The divisor (absolute value)
 * @param scale The desired scale (decimal places)
 * @param maxIterations Maximum iterations to detect repeating pattern
 * @returns The repeating decimal digits as a string, or undefined if no repeating pattern found
 */
function detectRepeatingDecimals(
    dividend: bigint,
    divisor: bigint,
    scale: number,
    maxIterations: number
): string | undefined {
    // First, get the integer part out of the way
    const integerPart = dividend / divisor;
    let remainder = dividend % divisor;

    // If remainder is zero, there's no repeating decimal
    if (remainder === 0n) {
        return undefined;
    }

    // Track remainders to detect cycles
    const remainders: Map<string, number> = new Map();
    let fractionalDigits = '';
    let position = 0;

    // Perform long division algorithm
    while (remainder !== 0n && position < maxIterations) {
        // Scale up remainder by 10
        remainder = remainder * 10n;

        // Store the current remainder and position
        const remainderKey = remainder.toString();
        if (remainders.has(remainderKey)) {
            // Found a repeating pattern
            const cycleStart = remainders.get(remainderKey)!;
            return fractionalDigits.substring(cycleStart);
        }

        remainders.set(remainderKey, position);

        // Calculate next digit and remainder
        const digit = remainder / divisor;
        remainder = remainder % divisor;

        // Add digit to fractional part
        fractionalDigits += digit.toString();
        position++;
    }

    // If we've reached max iterations without finding a cycle,
    // we can't determine if there's a repeating pattern
    return undefined;
}/**

 * RDBMS-compliant precision and scale calculation result
 */
export interface RdbmsArithmeticResult {
    precision: number;
    scale: number;
}

/**
 * Calculates the result precision and scale for addition/subtraction operations
 * following RDBMS/SQL standards.
 *
 * RDBMS Standard for Addition/Subtraction:
 * - Result Scale = max(scale1, scale2)
 * - Result Precision = max(precision1 - scale1, precision2 - scale2) + result_scale + 1
 *
 * The +1 accounts for potential carry in addition or borrow in subtraction.
 *
 * @param precision1 Precision of first operand
 * @param scale1 Scale of first operand
 * @param precision2 Precision of second operand
 * @param scale2 Scale of second operand
 * @returns RdbmsArithmeticResult with calculated precision and scale
 * @throws DecimalError if parameters are invalid
 */
export function calculateAdditionResultPrecisionScale(
    precision1: number,
    scale1: number,
    precision2: number,
    scale2: number
): RdbmsArithmeticResult {
    // Validate input parameters
    if (precision1 <= 0 || precision2 <= 0) {
        throw new DecimalError('Precision must be positive');
    }
    if (scale1 < 0 || scale2 < 0) {
        throw new DecimalError('Scale must be non-negative');
    }
    if (scale1 > precision1 || scale2 > precision2) {
        throw new DecimalError('Scale must not exceed precision');
    }

    // Calculate result scale (maximum of input scales)
    const resultScale = Math.max(scale1, scale2);

    // Calculate integer digits for each operand
    const integerDigits1 = precision1 - scale1;
    const integerDigits2 = precision2 - scale2;

    // Calculate result precision
    // max(integer_digits) + result_scale + 1 (for potential carry/borrow)
    const maxIntegerDigits = Math.max(integerDigits1, integerDigits2);
    const resultPrecision = maxIntegerDigits + resultScale + 1;

    return {
        precision: resultPrecision,
        scale: resultScale
    };
}

/**
 * Calculates the result precision and scale for multiplication operations
 * following RDBMS/SQL standards.
 *
 * RDBMS Standard for Multiplication:
 * - Result Scale = scale1 + scale2
 * - Result Precision = precision1 + precision2 + 1
 *
 * The +1 accounts for potential overflow in multiplication.
 *
 * @param precision1 Precision of first operand
 * @param scale1 Scale of first operand
 * @param precision2 Precision of second operand
 * @param scale2 Scale of second operand
 * @returns RdbmsArithmeticResult with calculated precision and scale
 * @throws DecimalError if parameters are invalid
 */
export function calculateMultiplicationResultPrecisionScale(
    precision1: number,
    scale1: number,
    precision2: number,
    scale2: number
): RdbmsArithmeticResult {
    // Validate input parameters
    if (precision1 <= 0 || precision2 <= 0) {
        throw new DecimalError('Precision must be positive');
    }
    if (scale1 < 0 || scale2 < 0) {
        throw new DecimalError('Scale must be non-negative');
    }
    if (scale1 > precision1 || scale2 > precision2) {
        throw new DecimalError('Scale must not exceed precision');
    }

    // Calculate result scale (sum of input scales)
    const resultScale = scale1 + scale2;

    // Calculate result precision (sum of input precisions + 1 for overflow)
    const resultPrecision = precision1 + precision2 + 1;

    return {
        precision: resultPrecision,
        scale: resultScale
    };
}

/**
 * Calculates the result precision and scale for division operations
 * following RDBMS/SQL standards.
 *
 * RDBMS Standard for Division (varies by system, this follows common approach):
 * - Result Scale = max(6, scale1 + precision2 + 1)
 * - Result Precision = precision1 - scale1 + scale2 + max(6, scale1 + precision2 + 1)
 *
 * Different RDBMS systems handle division differently:
 * - SQL Server: Uses a complex formula with minimum scale of 6
 * - PostgreSQL: Uses configurable precision
 * - Oracle: Uses maximum available precision
 *
 * This implementation follows a conservative approach similar to SQL Server.
 *
 * @param precision1 Precision of dividend
 * @param scale1 Scale of dividend
 * @param precision2 Precision of divisor
 * @param scale2 Scale of divisor
 * @param minScale Minimum scale for result (default: 6, following SQL Server)
 * @returns RdbmsArithmeticResult with calculated precision and scale
 * @throws DecimalError if parameters are invalid
 */
export function calculateDivisionResultPrecisionScale(
    precision1: number,
    scale1: number,
    precision2: number,
    scale2: number,
    minScale: number = 6
): RdbmsArithmeticResult {
    // Validate input parameters
    if (precision1 <= 0 || precision2 <= 0) {
        throw new DecimalError('Precision must be positive');
    }
    if (scale1 < 0 || scale2 < 0) {
        throw new DecimalError('Scale must be non-negative');
    }
    if (scale1 > precision1 || scale2 > precision2) {
        throw new DecimalError('Scale must not exceed precision');
    }
    if (minScale < 0) {
        throw new DecimalError('Minimum scale must be non-negative');
    }

    // Calculate result scale
    const calculatedScale = scale1 + precision2 + 1;
    const resultScale = Math.max(minScale, calculatedScale);

    // Calculate result precision
    const integerDigits1 = precision1 - scale1;
    const resultPrecision = integerDigits1 + scale2 + resultScale;

    return {
        precision: resultPrecision,
        scale: resultScale
    };
}

/**
 * Validates that the calculated precision and scale are within reasonable limits
 * and adjusts them if necessary to prevent overflow or excessive memory usage.
 *
 * @param precision The calculated precision
 * @param scale The calculated scale
 * @param maxPrecision Maximum allowed precision (default: 38, SQL Server limit)
 * @param maxScale Maximum allowed scale (default: same as maxPrecision)
 * @returns Adjusted RdbmsArithmeticResult within limits
 * @throws DecimalError if the result cannot be represented within limits
 */
export function validateAndAdjustPrecisionScale(
    precision: number,
    scale: number,
    maxPrecision: number = 38,
    maxScale?: number
): RdbmsArithmeticResult {
    const effectiveMaxScale = maxScale ?? maxPrecision;

    // Validate basic constraints
    if (precision <= 0) {
        throw new DecimalError('Precision must be positive');
    }
    if (scale < 0) {
        throw new DecimalError('Scale must be non-negative');
    }
    if (scale > precision) {
        throw new DecimalError('Scale must not exceed precision');
    }

    // Check if within limits
    if (precision <= maxPrecision && scale <= effectiveMaxScale) {
        return { precision, scale };
    }

    // Adjust if exceeding limits
    let adjustedPrecision = Math.min(precision, maxPrecision);
    let adjustedScale = Math.min(scale, effectiveMaxScale);

    // Ensure scale doesn't exceed adjusted precision
    if (adjustedScale > adjustedPrecision) {
        // Prioritize scale, but ensure we have at least 1 integer digit
        adjustedScale = Math.max(0, adjustedPrecision - 1);
    }

    // Ensure we have at least 1 integer digit
    if (adjustedScale >= adjustedPrecision) {
        adjustedScale = Math.max(0, adjustedPrecision - 1);
    }

    return {
        precision: adjustedPrecision,
        scale: adjustedScale
    };
}

/**
 * Determines the appropriate precision and scale for a decimal result
 * based on the operation type and operand characteristics.
 *
 * This is a convenience function that combines the specific calculation
 * functions with validation and adjustment.
 *
 * @param operation The arithmetic operation type
 * @param precision1 Precision of first operand
 * @param scale1 Scale of first operand
 * @param precision2 Precision of second operand
 * @param scale2 Scale of second operand
 * @param options Optional configuration for limits and division behavior
 * @returns RdbmsArithmeticResult with final precision and scale
 */
export function calculateRdbmsArithmeticResult(
    operation: 'add' | 'subtract' | 'multiply' | 'divide',
    precision1: number,
    scale1: number,
    precision2: number,
    scale2: number,
    options?: {
        maxPrecision?: number;
        maxScale?: number;
        divisionMinScale?: number;
    }
): RdbmsArithmeticResult {
    let result: RdbmsArithmeticResult;

    // Calculate based on operation type
    switch (operation) {
        case 'add':
        case 'subtract':
            result = calculateAdditionResultPrecisionScale(precision1, scale1, precision2, scale2);
            break;
        case 'multiply':
            result = calculateMultiplicationResultPrecisionScale(precision1, scale1, precision2, scale2);
            break;
        case 'divide':
            result = calculateDivisionResultPrecisionScale(
                precision1, scale1, precision2, scale2, options?.divisionMinScale
            );
            break;
        default:
            throw new DecimalError(`Unsupported operation: ${operation}`);
    }

    // Validate and adjust if necessary
    return validateAndAdjustPrecisionScale(
        result.precision,
        result.scale,
        options?.maxPrecision,
        options?.maxScale
    );
}