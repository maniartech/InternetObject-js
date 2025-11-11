/**
 * Boolean Type Schema - Validation and serialization for boolean values
 * **Follows V1 throw pattern - THROWS IOValidationError on failure.**
 *
 * Supports:
 * - Strict boolean validation (true/false only)
 * - Truthy/falsy conversion (when enabled)
 * - Default value handling
 *
 * @example Basic boolean validation (V1 pattern)
 * ```typescript
 * const schema = new BooleanTypeSchema();
 * try {
 *   const value = schema.validate(true, {}, node, defs);
 *   // value === true
 * } catch (error) {
 *   // error is IOValidationError
 * }
 * ```
 *
 * @example Truthy/falsy conversion
 * ```typescript
 * const schema = new BooleanTypeSchema();
 * const value = schema.validate(1, { allowTruthy: true }, node);
 * // value === true, throws if not convertible
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
 * Configuration options for boolean type
 */
export interface BooleanConfig extends CommonConfig<boolean> {
  /**
   * Allow truthy/falsy values to be converted to boolean
   *
   * When true:
   * - Truthy: 1, '1', 'true', 'yes', 'on' → true
   * - Falsy: 0, '0', 'false', 'no', 'off', null, undefined, '' → false
   *
   * When false (default): Only true/false accepted
   */
  allowTruthy?: boolean;

  /** Custom error messages */
  messages?: {
    type?: string;
  };
}

/**
 * Schema definition for BooleanConfig validation
 * This schema validates the configuration object passed to BooleanTypeSchema methods
 */
const booleanConfigSchema = new Schema(
  "boolean-config",
  { type:        { type: "string", optional: false, null: false, choices: ["bool", "boolean"] } },
  { default:     { type: "bool",   optional: true,  null: false } },
  { allowTruthy: { type: "bool",   optional: true,  null: false } },
  { optional:    { type: "bool",   optional: true } },
  { nullable:    { type: "bool",   optional: true } },
);

/**
 * Boolean type schema implementation
 *
 * **Three-phase processing**:
 * 1. parse() - Deserialize from IO format (AST Node → validated boolean)
 * 2. load() - Deserialize from JS value (JS value → validated boolean)
 * 3. stringify() - Serialize to IO format (validated boolean → IO string)
 *
 * All three methods use the common validate() core for validation logic.
 */
export class BooleanTypeSchema implements TypeSchema<BooleanConfig, boolean> {
  readonly typeName = 'boolean';

  /** Schema that defines valid configuration structure */
  static readonly schema = booleanConfigSchema;

  /**
   * **DESERIALIZATION: Parse from IO format (AST Node)**
   *
   * Extracts boolean value from AST Node and validates it.
   *
   * @param node - AST Node from parser (TokenNode with BOOLEAN type expected)
   * @param config - Boolean configuration
   * @param defs - Optional Definitions for @var resolution
   * @returns Validated boolean value
   * @throws IOValidationError if not a boolean node or validation fails
   */
  parse(
    node: Node,
    config: BooleanConfig,
    defs?: Definitions
  ): boolean {
    // Resolve variable references (if any)
    const resolvedNode = defs?.getV(node) || node;

    // Type check: Must be a TokenNode with BOOLEAN type (V1 pattern)
    if (!(resolvedNode instanceof TokenNode) || resolvedNode.type !== TokenType.BOOLEAN) {
      throw new IOValidationError(
        ErrorCodes.notABool,
        `Expecting a boolean value but found ${resolvedNode.toValue()}.`,
        node
      );
    }

    // Extract raw value from TokenNode and validate
    return this.validate(resolvedNode.value, config, node, defs);
  }

  /**
   * **DESERIALIZATION: Load from JavaScript value**
   *
   * Validates a plain JavaScript value as a boolean.
   *
   * @param value - Plain JS value (should be boolean)
   * @param config - Boolean configuration
   * @param defs - Optional Definitions for @var resolution
   * @returns Validated boolean value
   * @throws IOValidationError if validation fails
   */
  load(
    value: unknown,
    config: BooleanConfig,
    defs?: Definitions
  ): boolean {
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
   * 2. Type check (strict boolean or truthy/falsy conversion) - throws if invalid
   *
   * Performance target: < 50µs for simple booleans
   *
   * @param value - Value to validate (plain JS value)
   * @param config - Boolean configuration
   * @param node - Optional Node for position tracking (from parse(), undefined for load())
   * @param defs - Optional Definitions for lazy resolution
   * @returns Validated boolean value (possibly converted from truthy/falsy)
   * @throws IOValidationError on validation failure
   */
  validate(
    value: unknown,
    config: BooleanConfig,
    node?: Node,
    defs?: Definitions
  ): boolean {
    // 1. Common validation (undefined, null, choices with lazy resolution)
    // Throws IOValidationError if required value missing, null not allowed, or invalid choice
    const { value: commonValue, changed } = doCommonValidation(value, config, node, defs);
    if (changed) {
      return commonValue as boolean; // Early return for default/optional/null
    }

    // 2. Strict boolean check (fast path)
    if (typeof commonValue === 'boolean') {
      return commonValue;
    }

    // 3. Truthy/falsy conversion (if allowed)
    if (config.allowTruthy) {
      const converted = this.convertToBoolean(commonValue);
      if (converted !== undefined) {
        return converted;
      }
    }

    // 4. Type error - THROW immediately (V1 pattern)
    const hint = config.allowTruthy
      ? 'Use true/false, or truthy/falsy values like 1/0, "yes"/"no"'
      : 'Use true or false';

    throw new IOValidationError(
      ErrorCodes.notABool,
      config.messages?.type || `Expected boolean, got ${typeof commonValue}. ${hint}`,
      node
    );
  }

  /**
   * **SERIALIZATION: Convert to IO string format**
   *
   * Serializes a validated boolean value to Internet Object format.
   *
   * Simple: true → 'true', false → 'false'
   *
   * @param value - Validated boolean value
   * @param config - Boolean configuration
   * @returns IO format string representation ('true' or 'false')
   */
  stringify(
    value: boolean,
    config: BooleanConfig
  ): string {
    return value ? 'true' : 'false';
  }

  /**
   * Get default value for boolean type
   */
  getDefaultValue(config: BooleanConfig): boolean | undefined {
    return config.default;
  }

  /**
   * Convert truthy/falsy values to boolean
   *
   * @param value - Value to convert
   * @returns Boolean value, or undefined if cannot convert
   */
  private convertToBoolean(value: unknown): boolean | undefined {
    // Already boolean
    if (typeof value === 'boolean') {
      return value;
    }

    // Number conversion
    if (typeof value === 'number') {
      if (value === 1) return true;
      if (value === 0) return false;
      return undefined; // Other numbers not convertible
    }

    // String conversion (case-insensitive)
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      if (lower === 'true' || lower === 'yes' || lower === 'on' || lower === '1') {
        return true;
      }
      if (lower === 'false' || lower === 'no' || lower === 'off' || lower === '0' || lower === '') {
        return false;
      }
      return undefined; // Other strings not convertible
    }

    // null/undefined → false
    if (value === null || value === undefined) {
      return false;
    }

    // Cannot convert
    return undefined;
  }
}
