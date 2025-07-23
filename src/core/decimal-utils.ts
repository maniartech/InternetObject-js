/**
 * Decimal Utility Functions
 * 
 * Core utility functions for decimal arithmetic operations following KISS principles.
 * All functions use BigInt-only calculations and avoid JavaScript Number class.
 */

/**
 * Result of coefficient normalization
 */
export interface NormalizedCoefficient {
    coefficient: bigint;
    isZero: boolean;
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
        throw new Error('Scale factor must be non-negative');
    }
    
    if (scaleFactor === 0) {
        return coefficient;
    }
    
    return coefficient * (10n ** BigInt(scaleFactor));
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
    
    return coefficient / (10n ** BigInt(scaleFactor));
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
    const divisor = 10n ** BigInt(scaleDiff);
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
    const divisor = 10n ** BigInt(scaleDiff);
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
    const divisor = 10n ** BigInt(scaleDiff);
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
 * Formats a BigInt coefficient as a decimal string with the specified scale.
 * 
 * @param coefficient The BigInt coefficient to format
 * @param scale The number of decimal places
 * @returns The formatted decimal string
 */
export function formatBigIntAsDecimal(coefficient: bigint, scale: number): string {
    // Handle zero case
    if (coefficient === 0n) {
        return scale > 0 ? `0.${'0'.repeat(scale)}` : '0';
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
    
    return sign + integerPart + (scale > 0 ? '.' + fractionalPart : '');
}