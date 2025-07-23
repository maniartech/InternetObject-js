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