import ErrorCodes from '../../errors/io-error-codes'
import IOValidationError from '../../errors/io-validation-error'
import type Node from '../../parser/nodes/nodes'
import type Definitions from '../../core/definitions'
import { resolveChoices } from './lazy-resolution'

/**
 * Result of common validation checks.
 * Matches V1's doCommonTypeCheck return type exactly.
 *
 * If changed is true, the validator should return immediately with the value
 * (early return for default/optional/null handling).
 */
export interface CommonValidationResult<T> {
  value: T | null | undefined
  changed: boolean  // true = early return, false = continue with type-specific validation
}

/**
 * Common configuration options shared across all type schemas.
 * Matches V1's MemberDef pattern for optional, nullable, default, and choices.
 */
export interface CommonConfig<T> {
  optional?: boolean
  nullable?: boolean
  default?: T
  choices?: T[] | string[] // Supports lazy resolution via @varName or $schemaName
}

/**
 * Performs common validation checks that apply to all types.
 * **Follows V1's doCommonTypeCheck pattern exactly - THROWS IOValidationError on failure.**
 *
 * Handles:
 * - undefined values → returns default, or returns undefined if optional, or THROWS
 * - null values → returns null if nullable, or THROWS
 * - choices validation → validates against allowed values with lazy resolution, or THROWS
 *
 * @param value The value to validate
 * @param config The common configuration options
 * @param node Optional Node for position tracking (passed to IOValidationError)
 * @param defs Optional Definitions for lazy resolution of @var and $schema
 * @returns CommonValidationResult with { value, changed } - changed=true means early return
 * @throws IOValidationError if validation fails (valueRequired, nullNotAllowed, invalidChoice)
 *
 * @example V1 pattern usage
 * ```typescript
 * const { value, changed } = doCommonValidation(value, config, node, defs);
 * if (changed) return value as string;  // Early return for default/optional/null
 *
 * // Continue with type-specific validation...
 * if (typeof value !== 'string') {
 *   throw new IOValidationError(ErrorCodes.notAString, message, node);
 * }
 * ```
 */
export function doCommonValidation<T>(
  value: unknown,
  config: CommonConfig<T>,
  node?: Node,
  defs?: Definitions
): CommonValidationResult<T> {

  const isUndefined = value === undefined
  const isNull = value === null

  // 1. Check for undefined - THROW if required
  if (isUndefined) {
    // Return default if provided
    if (config.default !== undefined) {
      return { value: config.default, changed: true }
    }

    // Return undefined if optional
    if (config.optional) {
      return { value: undefined, changed: true }
    }

    // ✅ THROW immediately (V1 pattern)
    throw new IOValidationError(
      ErrorCodes.valueRequired,
      `Value is required.`,
      node
    )
  }

  // 2. Check for null - THROW if not nullable
  if (isNull) {
    // Return null if nullable
    if (config.nullable) {
      return { value: null, changed: true }
    }

    // ✅ THROW immediately (V1 pattern)
    throw new IOValidationError(
      ErrorCodes.nullNotAllowed,
      `Null is not allowed.`,
      node
    )
  }

  // 3. Validate choices (if provided) - THROW if invalid
  if (config.choices && config.choices.length > 0) {
    // Resolve choices with lazy resolution support (V1 pattern)
    const resolved = resolveChoices(config.choices as any[], defs)

    // Check if value is in choices
    const found = resolved.some(choice => value === choice)

    if (!found) {
      const choicesStr = resolved.length <= 5 ?
        resolved.join(', ') :
        `${resolved.slice(0, 5).join(', ')}, ... (${resolved.length} total)`

      // ✅ THROW immediately (V1 pattern)
      throw new IOValidationError(
        ErrorCodes.invalidChoice,
        `Invalid choice '${value}'. Valid options: ${choicesStr}.`,
        node
      )
    }
  }

  // All common checks passed, continue with type-specific validation
  return { value: value as T, changed: false }
}
