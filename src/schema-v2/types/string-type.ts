/**
 * String Type Schema - Validation and serialization for string values
 * **Follows V1 throw pattern - THROWS IOValidationError on failure.**
 *
 * Supports:
 * - minLength / maxLength validation
 * - Pattern (regex) validation
 * - Format validation (email, url, uuid, etc.)
 * - Choices (enum) validation with lazy resolution (V1 pattern)
 * - Trim / transform options
 *
 * @example Basic string validation (V1 pattern)
 * ```typescript
 * const schema = new StringTypeSchema();
 * try {
 *   const value = schema.validate('hello', { minLength: 3 }, node, defs);
 *   // value === 'hello'
 * } catch (error) {
 *   // error is IOValidationError
 * }
 * ```
 *
 * @example String with choices (enum)
 * ```typescript
 * const schema = new StringTypeSchema();
 * const value = schema.validate('red', { choices: ['red', 'green', 'blue'] }, node);
 * // value === 'red', throws if invalid
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
 * Configuration options for string type
 */
export interface StringConfig extends CommonConfig<string> {
  /** Minimum length (inclusive) */
  minLength?: number;

  /** Maximum length (inclusive) */
  maxLength?: number;

  /** Regular expression pattern (string or RegExp) */
  pattern?: string | RegExp;

  /** Predefined format validation */
  format?: 'email' | 'url' | 'uuid' | 'date' | 'time' | 'datetime' | 'hostname' | 'ipv4' | 'ipv6';

  /** Whether to trim whitespace before validation */
  trim?: boolean;

  /** Transform to lowercase before validation */
  lowercase?: boolean;

  /** Transform to uppercase before validation */
  uppercase?: boolean;

  /** Custom error messages */
  messages?: {
    type?: string;
    minLength?: string;
    maxLength?: string;
    pattern?: string;
    format?: string;
  };
}

/**
 * Schema definition for StringConfig validation
 * This schema validates the configuration object passed to StringTypeSchema methods
 */
const stringConfigSchema = new Schema(
  "string-config",
  { type:       { type: "string", optional: false, null: false, choices: ["string"] } },
  { default:    { type: "string", optional: true,  null: false } },
  { choices:    { type: "array",  optional: true,  null: false, of: { type: "string" } } },
  { minLength:  { type: "number", optional: true,  null: false, min: 0 } },
  { maxLength:  { type: "number", optional: true,  null: false, min: 0 } },
  { pattern:    { type: "string", optional: true,  null: false } },
  { format:     { type: "string", optional: true,  null: false, choices: ["email", "url", "uuid", "date", "time", "datetime", "hostname", "ipv4", "ipv6"] } },
  { trim:       { type: "bool",   optional: true,  null: false } },
  { lowercase:  { type: "bool",   optional: true,  null: false } },
  { uppercase:  { type: "bool",   optional: true,  null: false } },
  { optional:   { type: "bool",   optional: true } },
  { nullable:   { type: "bool",   optional: true } },
);

/**
 * String type schema implementation
 *
 * **Three-phase processing**:
 * 1. parse() - Deserialize from IO format (AST Node → validated string)
 * 2. load() - Deserialize from JS value (JS value → validated string)
 * 3. stringify() - Serialize to IO format (validated string → IO string)
 *
 * All three methods use the common validate() core for validation logic.
 */
export class StringTypeSchema implements TypeSchema<StringConfig, string> {
  readonly typeName = 'string';

  /** Schema that defines valid configuration structure */
  static readonly schema = stringConfigSchema;

  /**
   * **DESERIALIZATION: Parse from IO format (AST Node)**
   *
   * Extracts string value from AST Node and validates it.
   *
   * @param node - AST Node from parser (TokenNode with STRING type expected)
   * @param config - String configuration
   * @param defs - Optional Definitions for @var resolution
   * @returns Validated string value
   * @throws IOValidationError if not a string node or validation fails
   */
  parse(
    node: Node,
    config: StringConfig,
    defs?: Definitions
  ): string {
    // Resolve variable references (if any)
    const resolvedNode = defs?.getV(node) || node;

    // Type check: Must be a TokenNode with STRING type (V1 pattern)
    if (!(resolvedNode instanceof TokenNode) || resolvedNode.type !== TokenType.STRING) {
      throw new IOValidationError(
        ErrorCodes.notAString,
        `Expecting a string value but found ${resolvedNode.toValue()}.`,
        node
      );
    }

    // Extract raw value from TokenNode and validate
    return this.validate(resolvedNode.value, config, node, defs);
  }

  /**
   * **DESERIALIZATION: Load from JavaScript value**
   *
   * Validates a plain JavaScript value as a string.
   *
   * @param value - Plain JS value (should be string)
   * @param config - String configuration
   * @param defs - Optional Definitions for @var resolution
   * @returns Validated string value
   * @throws IOValidationError if validation fails
   */
  load(
    value: unknown,
    config: StringConfig,
    defs?: Definitions
  ): string {
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
   * 2. Type check - throws if not string
   * 3. Apply transformations (trim, lowercase, uppercase)
   * 4. Validate constraints (length, pattern, format) - throws on first failure
   *
   * Performance target: < 50µs for simple strings
   *
   * @param value - Value to validate (plain JS value)
   * @param config - String configuration
   * @param node - Optional Node for position tracking (from parse(), undefined for load())
   * @param defs - Optional Definitions for lazy resolution
   * @returns Validated and transformed string value
   * @throws IOValidationError on validation failure
   */
  validate(
    value: unknown,
    config: StringConfig,
    node?: Node,
    defs?: Definitions
  ): string {
    // 1. Common validation (undefined, null, choices with lazy resolution)
    // Throws IOValidationError if required value missing, null not allowed, or invalid choice
    const { value: commonValue, changed } = doCommonValidation(value, config, node, defs);
    if (changed) {
      return commonValue as string; // Early return for default/optional/null
    }

    // 2. Type check - THROW immediately (V1 pattern)
    if (typeof commonValue !== 'string') {
      throw new IOValidationError(
        ErrorCodes.notAString,
        config.messages?.type || `Expected string, got ${typeof commonValue}.`,
        node
      );
    }

    let processedValue = commonValue;

    // 3. Apply transformations
    if (config.trim) {
      processedValue = processedValue.trim();
    }
    if (config.lowercase) {
      processedValue = processedValue.toLowerCase();
    }
    if (config.uppercase) {
      processedValue = processedValue.toUpperCase();
    }

    // 4. Validate minLength - THROW immediately (V1 pattern)
    if (config.minLength !== undefined && processedValue.length < config.minLength) {
      throw new IOValidationError(
        ErrorCodes.outOfRange,
        config.messages?.minLength ||
          `String length ${processedValue.length} is less than minimum ${config.minLength}.`,
        node
      );
    }

    // 5. Validate maxLength - THROW immediately (V1 pattern)
    if (config.maxLength !== undefined && processedValue.length > config.maxLength) {
      throw new IOValidationError(
        ErrorCodes.outOfRange,
        config.messages?.maxLength ||
          `String length ${processedValue.length} exceeds maximum ${config.maxLength}.`,
        node
      );
    }

    // 6. Validate pattern - THROW immediately (V1 pattern)
    if (config.pattern) {
      const regex = typeof config.pattern === 'string'
        ? new RegExp(config.pattern)
        : config.pattern;

      if (!regex.test(processedValue)) {
        throw new IOValidationError(
          ErrorCodes.invalidPattern,
          config.messages?.pattern || `String does not match required pattern.`,
          node
        );
      }
    }

    // 7. Validate format - THROW immediately (V1 pattern)
    if (config.format) {
      const formatValid = this.validateFormat(processedValue, config.format);
      if (!formatValid) {
        throw new IOValidationError(
          ErrorCodes.invalidChoice,
          config.messages?.format || `String is not a valid ${config.format}.`,
          node
        );
      }
    }

    // All validations passed
    return processedValue;
  }

  /**
   * **SERIALIZATION: Convert to IO string format**
   *
   * Serializes a validated string value to Internet Object format.
   *
   * Handles:
   * - Escaping special characters
   * - Quoting strings with commas, newlines, or leading/trailing whitespace
   * - Multi-line string formatting
   *
   * @param value - Validated string value
   * @param config - String configuration
   * @returns IO format string representation
   */
  stringify(
    value: string,
    config: StringConfig
  ): string {
    // Check if quoting is needed
    const needsQuoting =
      value.includes(',') ||
      value.includes('\n') ||
      value.includes('"') ||
      value.trim() !== value ||
      value.startsWith('$') ||
      value.startsWith('@') ||
      value === '';

    if (!needsQuoting) {
      return value;
    }

    // Escape quotes and backslashes
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    return `"${escaped}"`;
  }

  /**
   * Get default value for string type
   */
  getDefaultValue(config: StringConfig): string | undefined {
    return config.default;
  }

  /**
   * Validate string format
   *
   * @param value - String to validate
   * @param format - Format to validate against
   * @returns true if valid, false otherwise
   */
  private validateFormat(value: string, format: string): boolean {
    switch (format) {
      case 'email':
        // Simple email validation (not RFC 5322 compliant, but reasonable)
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      case 'url':
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }

      case 'uuid':
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

      case 'date':
        // ISO 8601 date format (YYYY-MM-DD)
        return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));

      case 'time':
        // Time format (HH:MM:SS or HH:MM:SS.mmm)
        return /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(\.\d{1,3})?$/.test(value);

      case 'datetime':
        // ISO 8601 datetime
        return !isNaN(Date.parse(value));

      case 'hostname':
        // Simple hostname validation
        return /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(value);

      case 'ipv4':
        return /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(value);

      case 'ipv6':
        // Simplified IPv6 validation
        return /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(value) ||
               /^::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$/.test(value);

      default:
        return true; // Unknown format - pass through
    }
  }
}
