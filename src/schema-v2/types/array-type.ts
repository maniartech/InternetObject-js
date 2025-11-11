import type Node from '../../parser/nodes/nodes';
import ArrayNode from '../../parser/nodes/array';
import TokenNode from '../../parser/nodes/tokens';
import type Definitions from '../../core/definitions';
import IOValidationError from '../../errors/io-validation-error';
import ErrorCodes from '../../errors/io-error-codes';
import { doCommonValidation } from '../utils/common-validation';
import type { TypeSchema } from './type-schema';
import Schema from '../../schema/schema';

/**
 * Configuration for array validation
 */
export interface ArrayConfig {
  /** Type of array items */
  of?: TypeSchema<any>;

  /** Exact length requirement */
  len?: number;

  /** Minimum length */
  minLen?: number;

  /** Maximum length */
  maxLen?: number;

  /** Default value */
  default?: any[];

  /** Allow null values */
  nullable?: boolean;

  /** Make field optional */
  optional?: boolean;

  /** Valid choices */
  choices?: any[][];
}

/**
 * Schema definition for ArrayConfig validation
 * This schema validates the configuration object passed to ArrayTypeSchema methods
 */
const arrayConfigSchema = new Schema(
  "array-config",
  { type:     { type: "string", optional: false, null: false, choices: ["array"] } },
  { default:  { type: "array",  optional: true,  null: false } },
  { of:       { type: "any",    optional: true,  null: false } }, // TypeSchema - validate separately
  { len:      { type: "number", optional: true,  null: false, min: 0 } },
  { minLen:   { type: "number", optional: true,  null: false, min: 0 } },
  { maxLen:   { type: "number", optional: true,  null: false, min: 0 } },
  { optional: { type: "bool",   optional: true } },
  { nullable: { type: "bool",   optional: true } },
);

/**
 * Array type validator with length and item validation
 *
 * Features:
 * - Parse arrays from AST nodes (ArrayNode)
 * - Load arrays from JS values
 * - Validate array length (len, minLen, maxLen)
 * - Validate array items using 'of' type schema
 * - Support nested arrays and objects
 */
export class ArrayTypeSchema implements TypeSchema<ArrayConfig, any[]> {
  readonly typeName = 'array';

  /** Schema that defines valid configuration structure */
  static readonly schema = arrayConfigSchema;

  private config: ArrayConfig;

  constructor(config: ArrayConfig = {}) {
    this.config = config;
  }

  /**
   * Parse an array from an AST Node (deserialization from IO format)
   *
   * @param node - The AST node to parse (should be ArrayNode)
   * @param config - Configuration for the array
   * @param defs - Variable and schema definitions for resolution
   * @returns Validated array value
   * @throws IOValidationError if validation fails
   *
   * @example
   * ```typescript
   * const arrayType = new ArrayTypeSchema({
   *   of: stringType,
   *   minLen: 1
   * });
   *
   * // Parse from AST node
   * const result = arrayType.parse(arrayNode, config, defs);
   * // result: ["hello", "world"]
   * ```
   */
  parse(node: Node, config: ArrayConfig, defs?: Definitions): any[] {
    // Resolve variable references first
    const resolvedNode = defs?.getV(node) || node;

    // Handle common validation (undefined/null/choices)
    const commonResult = doCommonValidation(
      resolvedNode === node ? resolvedNode : (resolvedNode as any).value,
      config,
      node,
      defs
    );

    if (commonResult.changed) {
      return commonResult.value as any[];
    }

    // Verify we have an ArrayNode
    if (!(resolvedNode instanceof ArrayNode)) {
      throw new IOValidationError(
        ErrorCodes.notAnArray,
        `Expected an array value`,
        node
      );
    }

    // Extract items from ArrayNode
    const items: any[] = [];

    for (const childNode of resolvedNode.children) {
      if (childNode === undefined) {
        items.push(undefined);
        continue;
      }

      // If we have an 'of' type schema, validate each item
      if (config.of) {
        try {
          const itemValue = config.of.parse(childNode, {}, defs);
          items.push(itemValue);
        } catch (err) {
          // If resolvedNode came from defs, update error position
          if (resolvedNode !== node && err instanceof IOValidationError) {
            err.positionRange = node;
          }
          throw err;
        }
      } else {
        // No type specified, convert to JS value as-is
        items.push(childNode.toValue ? childNode.toValue(defs) : childNode);
      }
    }

    // Validate the complete array
    return this.validate(items, config, node, defs);
  }

  /**
   * Load an array from a JavaScript value (deserialization from JS)
   *
   * @param value - The JS value to load (should be array)
   * @param config - Configuration for the array
   * @param defs - Variable and schema definitions for resolution
   * @returns Validated array value
   * @throws IOValidationError if validation fails
   *
   * @example
   * ```typescript
   * const arrayType = new ArrayTypeSchema({
   *   of: numberType,
   *   maxLen: 5
   * });
   *
   * // Load from JS value
   * const result = arrayType.load([1, 2, 3], config);
   * // result: [1, 2, 3]
   * ```
   */
  load(value: any, config: ArrayConfig, defs?: Definitions): any[] {
    // Handle common validation (undefined/null/choices)
    const commonResult = doCommonValidation(value, config, undefined, defs);

    if (commonResult.changed) {
      return commonResult.value as any[];
    }

    // Verify we have an array
    if (!Array.isArray(value)) {
      throw new IOValidationError(
        ErrorCodes.notAnArray,
        `Expected an array value, got ${typeof value}`,
        undefined
      );
    }

    // If we have an 'of' type schema, validate each item
    if (config.of) {
      const validatedItems: any[] = [];

      for (let i = 0; i < value.length; i++) {
        const itemValue = config.of.load(value[i], {}, defs);
        validatedItems.push(itemValue);
      }

      // Validate the complete array
      return this.validate(validatedItems, config, undefined, defs);
    }

    // No type specified, validate as-is
    return this.validate(value, config, undefined, defs);
  }

  /**
   * Validate an array value (common validation logic)
   *
   * This is the core validation logic shared by both parse() and load().
   *
   * @param value - The array value to validate
   * @param config - Configuration for validation
   * @param node - Optional AST node for error reporting
   * @param defs - Optional definitions for resolution
   * @returns Validated array value
   * @throws IOValidationError if validation fails
   */
  validate(value: any[], config: ArrayConfig, node?: Node, defs?: Definitions): any[] {
    // Validate exact length
    if (config.len !== undefined) {
      if (value.length !== config.len) {
        throw new IOValidationError(
          ErrorCodes.invalidLength,
          `Array length must be exactly ${config.len}, got ${value.length}`,
          node
        );
      }
    }

    // Validate minimum length
    if (config.minLen !== undefined) {
      if (value.length < config.minLen) {
        throw new IOValidationError(
          ErrorCodes.outOfRange,
          `Array length must be at least ${config.minLen}, got ${value.length}`,
          node
        );
      }
    }

    // Validate maximum length
    if (config.maxLen !== undefined) {
      if (value.length > config.maxLen) {
        throw new IOValidationError(
          ErrorCodes.outOfRange,
          `Array length must be at most ${config.maxLen}, got ${value.length}`,
          node
        );
      }
    }

    return value;
  }

  /**
   * Stringify an array to IO format (serialization)
   *
   * @param value - The array value to stringify
   * @param config - Configuration for serialization
   * @returns IO format string representation
   *
   * @example
   * ```typescript
   * const arrayType = new ArrayTypeSchema({ of: stringType });
   *
   * arrayType.stringify(["hello", "world"], config);
   * // Returns: "[hello, world]"
   *
   * arrayType.stringify([1, 2, 3], config);
   * // Returns: "[1, 2, 3]"
   * ```
   */
  stringify(value: any[], config: ArrayConfig): string {
    if (!Array.isArray(value)) {
      throw new Error('Cannot stringify non-array value');
    }

    const items: string[] = [];

    for (const item of value) {
      if (config.of) {
        // Use the 'of' type schema to stringify each item
        items.push(config.of.stringify(item, {}));
      } else {
        // No type specified, stringify as-is
        if (item === null) {
          items.push('N');
        } else if (item === undefined) {
          items.push('');
        } else if (typeof item === 'string') {
          // Simple string escaping
          const escaped = item.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
          items.push(escaped.includes(',') || escaped.includes(' ') ? `"${escaped}"` : escaped);
        } else if (typeof item === 'number') {
          items.push(String(item));
        } else if (typeof item === 'boolean') {
          items.push(item ? 'T' : 'F');
        } else if (Array.isArray(item)) {
          // Nested array - recursive stringify
          items.push(this.stringify(item, {}));
        } else if (typeof item === 'object') {
          // Object - would need ObjectTypeSchema.stringify()
          // For now, throw error
          throw new Error('Cannot stringify object without ObjectTypeSchema');
        } else {
          items.push(String(item));
        }
      }
    }

    return `[${items.join(', ')}]`;
  }
}
