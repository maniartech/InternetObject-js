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