/**
 * Number Type Schema - Validation and serialization for numeric values
 * **Follows V1 throw pattern - THROWS IOValidationError on failure.**
 *
 * Supports:
 * - min / max validation (inclusive)
 * - Integer validation
 * - multipleOf validation
 * - Choices (enum) validation with lazy resolution
 * - Finite/safe integer checks
 *
 * @example Basic number validation (V1 pattern)
 * ```typescript
 * const schema = new NumberTypeSchema();
 * try {
 *   const value = schema.validate(42, { min: 0, max: 100 }, node, defs);
 *   // value === 42
 * } catch (error) {
 *   // error is IOValidationError
 * }
 * ```
 *
 * @example Integer validation
 * ```typescript
 * const schema = new NumberTypeSchema();
 * const value = schema.validate(42, { integer: true }, node);
 * // value === 42, throws if not integer
 * ```
 */

import type { TypeSchema } from './type-schema';
import type Node from '../../parser/nodes/nodes';
import TokenNode from '../../parser/nodes/tokens';
import TokenType from '../../parser/tokenizer/token-types';
import type Definitions from '../../core/definitions';
import ErrorCodes from '../../errors/io-error-codes';
import IOValidationError from '../../errors/io-validation-error';
import { doCommonValidation, CommonConfig } from '../utils/common-validation';
import Schema from '../../schema/schema';

/**
 * Configuration options for number type
 */
export interface NumberConfig extends CommonConfig<number> {
  /** Minimum value (inclusive) */
  min?: number;

  /** Maximum value (inclusive) */
  max?: number;

  /** Must be an integer */
  integer?: boolean;

  /** Number must be a multiple of this value */
  multipleOf?: number;

  /** Custom error messages */
  messages?: {
    type?: string;
    range?: string;
    integer?: string;
    multipleOf?: string;
  };
}

/**
 * Schema definition for NumberConfig validation
 * This schema validates the configuration object passed to NumberTypeSchema methods
 */
const numberConfigSchema = new Schema(
  "number-config",
  { type:       { type: "string", optional: false, null: false, choices: ["number"] } },
  { default:    { type: "number", optional: true,  null: false } },
  { choices:    { type: "array",  optional: true,  null: false, of: { type: "number" } } },
  { min:        { type: "number", optional: true,  null: false } },
  { max:        { type: "number", optional: true,  null: false } },
  { integer:    { type: "bool",   optional: true,  null: false } },
  { multipleOf: { type: "number", optional: true,  null: false, min: 0 } },
  { optional:   { type: "bool",   optional: true } },
  { nullable:   { type: "bool",   optional: true } },
);

/**
 * Number type schema implementation
 *
 * **Three-phase processing**:
 * 1. parse() - Deserialize from IO format (AST Node → validated number)
 * 2. load() - Deserialize from JS value (JS value → validated number)
 * 3. stringify() - Serialize to IO format (validated number → IO string)
 *
 * All three methods use the common validate() core for validation logic.
 */
export class NumberTypeSchema implements TypeSchema<NumberConfig, number> {
  readonly typeName = 'number';

  /** Schema that defines valid configuration structure */
  static readonly schema = numberConfigSchema;

  /**
   * **DESERIALIZATION: Parse from IO format (AST Node)**
   *
   * Extracts number value from AST Node and validates it.
   *
   * @param node - AST Node from parser (TokenNode with NUMBER type expected)
   * @param config - Number configuration
   * @param defs - Optional Definitions for @var resolution
   * @returns Validated number value
   * @throws IOValidationError if not a number node or validation fails
   */
  parse(
    node: Node,
    config: NumberConfig,
    defs?: Definitions
  ): number {
    // Resolve variable references (if any)
    const resolvedNode = defs?.getV(node) || node;

    // Type check: Must be a TokenNode with NUMBER type (V1 pattern)
    if (!(resolvedNode instanceof TokenNode) || resolvedNode.type !== TokenType.NUMBER) {
      throw new IOValidationError(
        ErrorCodes.notANumber,
        `Expecting a number value but found ${resolvedNode.toValue()}.`,
        node
      );
    }

    // Extract raw value from TokenNode and validate
    return this.validate(resolvedNode.value, config, node, defs);
  }

  /**
   * **DESERIALIZATION: Load from JavaScript value**
   *
   * Validates a plain JavaScript value as a number.
   *
   * @param value - Plain JS value (should be number)
   * @param config - Number configuration
   * @param defs - Optional Definitions for @var resolution
   * @returns Validated number value
   * @throws IOValidationError if validation fails
   */
  load(
    value: unknown,
    config: NumberConfig,
    defs?: Definitions
  ): number {
    // Validate using common validation core (no node position)
    return this.validate(value, config, undefined, defs);
  }

  /**
   * **COMMON VALIDATION CORE**
   *
   * Shared validation logic used by both parse() and load().
   * **Follows V1 pattern - THROWS IOValidationError on failure.**
   *
   * **Implementation flow**:
   * 1. Common validation (undefined, null, choices with lazy resolution) - throws or returns early
   * 2. Type check (including NaN/Infinity rejection) - throws if invalid
   * 3. Validate constraints (integer, min, max, multipleOf) - throws on first failure
   *
   * Performance target: < 50µs for simple numbers
   *
   * @param value - Value to validate (plain JS value)
   * @param config - Number configuration
   * @param node - Optional Node for position tracking (from parse(), undefined for load())
   * @param defs - Optional Definitions for lazy resolution
   * @returns Validated number value
   * @throws IOValidationError on validation failure
   */
  validate(
    value: unknown,
    config: NumberConfig,
    node?: Node,
    defs?: Definitions
  ): number {
    // 1. Common validation (undefined, null, choices with lazy resolution)
    // Throws IOValidationError if required value missing, null not allowed, or invalid choice
    const { value: commonValue, changed } = doCommonValidation(value, config, node, defs);
    if (changed) {
      return commonValue as number; // Early return for default/optional/null
    }

    // 2. Type check (includes NaN and Infinity rejection) - THROW immediately (V1 pattern)
    if (typeof commonValue !== 'number' || Number.isNaN(commonValue) || !Number.isFinite(commonValue)) {
      const actualDesc = typeof commonValue === 'number'
        ? (Number.isNaN(commonValue) ? 'NaN' : 'Infinity')
        : typeof commonValue;

      throw new IOValidationError(
        ErrorCodes.notANumber,
        config.messages?.type || `Expected finite number, got ${actualDesc}.`,
        node
      );
    }

    // 3. Check integer requirement - THROW immediately (V1 pattern)
    if (config.integer && !Number.isInteger(commonValue)) {
      throw new IOValidationError(
        ErrorCodes.notAnInteger,
        config.messages?.integer || `Expected integer, got ${commonValue}.`,
        node
      );
    }

    // 4. Validate min constraint - THROW immediately (V1 pattern)
    if (config.min !== undefined && commonValue < config.min) {
      throw new IOValidationError(
        ErrorCodes.outOfRange,
        config.messages?.range || `Number ${commonValue} is less than minimum ${config.min}.`,
        node
      );
    }

    // 5. Validate max constraint - THROW immediately (V1 pattern)
    if (config.max !== undefined && commonValue > config.max) {
      throw new IOValidationError(
        ErrorCodes.outOfRange,
        config.messages?.range || `Number ${commonValue} exceeds maximum ${config.max}.`,
        node
      );
    }

    // 6. Validate multipleOf - THROW immediately (V1 pattern)
    if (config.multipleOf !== undefined && config.multipleOf !== 0) {
      // Use epsilon comparison to handle floating point precision issues
      const remainder = Math.abs(commonValue % config.multipleOf);
      const epsilon = 1e-10;

      if (remainder > epsilon && Math.abs(remainder - config.multipleOf) > epsilon) {
        throw new IOValidationError(
          ErrorCodes.outOfRange,
          config.messages?.multipleOf || `Number ${commonValue} is not a multiple of ${config.multipleOf}.`,
          node
        );
      }
    }

    // All validations passed
    return commonValue;
  }

  /**
   * **SERIALIZATION: Convert to IO string format**
   *
   * Serializes a validated number value to Internet Object format.
   *
   * Handles:
   * - Standard numbers (integers and decimals)
   * - Special values (NaN, Infinity, -Infinity)
   * - Scientific notation for very large/small numbers
   *
   * @param value - Validated number value
   * @param config - Number configuration
   * @returns IO format string representation
   */
  stringify(
    value: number,
    config: NumberConfig
  ): string {
    // Handle special values
    if (Number.isNaN(value)) {
      return 'NaN';
    }
    if (value === Infinity) {
      return 'Infinity';
    }
    if (value === -Infinity) {
      return '-Infinity';
    }

    // For very large or very small numbers, use scientific notation
    if (Math.abs(value) > 1e15 || (Math.abs(value) < 1e-6 && value !== 0)) {
      return value.toExponential();
    }

    // Standard number serialization
    return value.toString();
  }

  /**
   * Get default value for number type
   */
  getDefaultValue(config: NumberConfig): number | undefined {
    return config.default;
  }
}
