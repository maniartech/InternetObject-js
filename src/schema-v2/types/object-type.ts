import type Node from '../../parser/nodes/nodes';
import ObjectNode from '../../parser/nodes/objects';
import MemberNode from '../../parser/nodes/members';
import type Definitions from '../../core/definitions';
import IOValidationError from '../../errors/io-validation-error';
import ErrorCodes from '../../errors/io-error-codes';
import { doCommonValidation } from '../utils/common-validation';
import type { TypeSchema } from './type-schema';
import Schema from '../../schema/schema';

/**
 * Configuration for a single object member
 */
export interface MemberConfig {
  /** Type schema for this member */
  type: TypeSchema<any, any> | string;

  /** Member name/path */
  path?: string;

  /** Default value */
  default?: any;

  /** Allow null values */
  nullable?: boolean;

  /** Make field optional */
  optional?: boolean;

  /** Valid choices */
  choices?: any[];

  /** Custom schema (for nested objects) */
  schema?: ObjectConfig;
}

/**
 * Configuration for object validation
 */
export interface ObjectConfig {
  /** Member definitions (keyed by member name) */
  defs?: Record<string, MemberConfig>;

  /** Ordered member names (for positional access) */
  names?: string[];

  /** Allow additional properties not in schema */
  open?: boolean | MemberConfig;

  /** Default value */
  default?: Record<string, any>;

  /** Allow null values */
  nullable?: boolean;

  /** Make field optional */
  optional?: boolean;

  /** Valid choices */
  choices?: Record<string, any>[];
}

/**
 * Schema definition for ObjectConfig validation
 * This schema validates the configuration object passed to ObjectTypeSchema methods
 */
const objectConfigSchema = new Schema(
  "object-config",
  { type:     { type: "string", optional: false, null: false, choices: ["object"] } },
  { default:  { type: "any",    optional: true,  null: false } }, // Object default
  { defs:     { type: "any",    optional: true,  null: false } }, // Record<string, MemberConfig> - validate separately
  { names:    { type: "array",  optional: true,  null: false, of: { type: "string" } } },
  { open:     { type: "any",    optional: true,  null: false } }, // boolean | MemberConfig - validate separately
  { optional: { type: "bool",   optional: true } },
  { nullable: { type: "bool",   optional: true } },
);

/**
 * Object type validator with member and schema validation
 *
 * Features:
 * - Parse objects from AST nodes (ObjectNode)
 * - Load objects from JS values
 * - Support positional and keyed member access
 * - Validate nested objects and arrays
 * - Support open schemas (additional properties)
 * - Validate required members
 */
export class ObjectTypeSchema implements TypeSchema<ObjectConfig, Record<string, any>> {
  readonly typeName = 'object';

  /** Schema that defines valid configuration structure */
  static readonly schema = objectConfigSchema;

  private config: ObjectConfig;

  constructor(config: ObjectConfig = {}) {
    // Default open to true (allow all defined members)
    this.config = {
      ...config,
      open: config.open !== undefined ? config.open : true
    };
  }

  /**
   * Parse an object from an AST Node (deserialization from IO format)
   *
   * @param node - The AST node to parse (should be ObjectNode)
   * @param config - Configuration for the object
   * @param defs - Variable and schema definitions for resolution
   * @returns Validated object value
   * @throws IOValidationError if validation fails
   *
   * @example
   * ```typescript
   * const personSchema = new ObjectTypeSchema({
   *   defs: {
   *     name: { type: stringType, optional: false },
   *     age: { type: numberType, optional: true }
   *   },
   *   names: ['name', 'age']
   * });
   *
   * // Parse from AST node
   * const result = personSchema.parse(objectNode, config, defs);
   * // result: { name: "John", age: 30 }
   * ```
   */
  parse(node: Node, config: ObjectConfig, defs?: Definitions): Record<string, any> {
    // Merge provided config with instance config (instance config takes precedence for structure)
    const mergedConfig: ObjectConfig = {
      ...config,
      defs: this.config.defs || config.defs,
      names: this.config.names || config.names,
      open: this.config.open !== undefined ? this.config.open : config.open
    };

    // Resolve variable references first
    const resolvedNode = defs?.getV(node) || node;

    // Handle common validation (undefined/null/choices)
    const commonResult = doCommonValidation(
      resolvedNode === node ? resolvedNode : (resolvedNode as any).value,
      mergedConfig,
      node,
      defs
    );

    if (commonResult.changed) {
      return commonResult.value as Record<string, any>;
    }

    // Verify we have an ObjectNode
    if (!(resolvedNode instanceof ObjectNode)) {
      throw new IOValidationError(
        ErrorCodes.invalidObject,
        `Expected an object value`,
        node
      );
    }

    const result: Record<string, any> = {};
    const processedNames = new Set<string>();
    const memberDefs = mergedConfig.defs || {};
    const orderedNames = mergedConfig.names || [];

    // Phase 1: Process positional members (schema order)
    let positionalIndex = 0;
    let transitionedToKeyed = false;

    for (const child of resolvedNode.children) {
      if (child === undefined) continue;

      const memberNode = child as MemberNode;
      const hasKey = memberNode.key !== undefined;

      // Detect transition from positional to keyed
      if (hasKey) {
        transitionedToKeyed = true;
      }

      if (!transitionedToKeyed && !hasKey) {
        // Positional member
        if (positionalIndex >= orderedNames.length) {
          // No more schema members, check if open schema
          if (!mergedConfig.open) {
            throw new IOValidationError(
              ErrorCodes.additionalValuesNotAllowed,
              `Additional positional values not allowed`,
              memberNode
            );
          }

          // Process as additional property
          const additionalConfig = typeof mergedConfig.open === 'object' ? mergedConfig.open : { type: 'any' };
          try {
            const value = this.processMember(memberNode, additionalConfig, defs);
            result[positionalIndex] = value;
          } catch (err) {
            if (resolvedNode !== node && err instanceof IOValidationError) {
              err.positionRange = node;
            }
            throw err;
          }

          positionalIndex++;
          continue;
        }

        const name = orderedNames[positionalIndex];
        const memberConfig = memberDefs[name];

        if (!memberConfig) {
          throw new IOValidationError(
            ErrorCodes.invalidSchema,
            `No schema definition for positional member '${name}'`,
            memberNode
          );
        }

        try {
          const value = this.processMember(memberNode, memberConfig, defs);
          if (value !== undefined) {
            result[name] = value;
          }
          processedNames.add(name);
        } catch (err) {
          if (resolvedNode !== node && err instanceof IOValidationError) {
            err.positionRange = node;
          }
          throw err;
        }

        positionalIndex++;
      } else if (hasKey) {
        // Keyed member
        const keyValue = memberNode.key!.value as string;

        // Check for duplicate keys
        if (processedNames.has(keyValue)) {
          throw new IOValidationError(
            ErrorCodes.duplicateMember,
            `Duplicate member '${keyValue}'`,
            memberNode.key!
          );
        }

        const memberConfig = memberDefs[keyValue];

        if (!memberConfig) {
          // Unknown member - check if open schema
          if (!mergedConfig.open) {
            throw new IOValidationError(
              ErrorCodes.unknownMember,
              `Unknown member '${keyValue}'`,
              memberNode.key!
            );
          }

          // Process as additional property
          const additionalConfig = typeof mergedConfig.open === 'object' ? mergedConfig.open : { type: 'any' };
          try {
            const value = this.processMember(memberNode, additionalConfig, defs);
            if (value !== undefined) {
              result[keyValue] = value;
            }
          } catch (err) {
            if (resolvedNode !== node && err instanceof IOValidationError) {
              err.positionRange = node;
            }
            throw err;
          }
        } else {
          // Known member
          try {
            const value = this.processMember(memberNode, memberConfig, defs);
            if (value !== undefined) {
              result[keyValue] = value;
            }
            processedNames.add(keyValue);
          } catch (err) {
            if (resolvedNode !== node && err instanceof IOValidationError) {
              err.positionRange = node;
            }
            throw err;
          }
        }
      }
    }

    // Phase 2: Check for missing required members and apply defaults
    for (const name in memberDefs) {
      if (processedNames.has(name)) continue;

      const memberConfig = memberDefs[name];

      // Try to get default value or check if optional
      try {
        const value = this.processMember(undefined as any, memberConfig, defs);
        if (value !== undefined) {
          result[name] = value;
        }
      } catch (err) {
        if (err instanceof IOValidationError) {
          // Missing required member - set position to parent object
          err.positionRange = resolvedNode;
        }
        throw err;
      }
    }

    return this.validate(result, mergedConfig, node, defs);
  }

  /**
   * Load an object from a JavaScript value (deserialization from JS)
   *
   * @param value - The JS value to load (should be object)
   * @param config - Configuration for the object
   * @param defs - Variable and schema definitions for resolution
   * @returns Validated object value
   * @throws IOValidationError if validation fails
   *
   * @example
   * ```typescript
   * const personSchema = new ObjectTypeSchema({
   *   defs: {
   *     name: { type: stringType, optional: false },
   *     age: { type: numberType, optional: true }
   *   }
   * });
   *
   * // Load from JS value
   * const result = personSchema.load({ name: "John", age: 30 }, config);
   * // result: { name: "John", age: 30 }
   * ```
   */
  load(value: any, config: ObjectConfig, defs?: Definitions): Record<string, any> {
    // Handle common validation (undefined/null/choices)
    const commonResult = doCommonValidation(value, config, undefined, defs);

    if (commonResult.changed) {
      return commonResult.value as Record<string, any>;
    }

    // Verify we have an object
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new IOValidationError(
        ErrorCodes.invalidObject,
        `Expected an object value, got ${typeof value}`,
        undefined
      );
    }

    const result: Record<string, any> = {};
    const processedNames = new Set<string>();
    const memberDefs = config.defs || {};

    // Process all members from the value
    for (const key in value) {
      const memberConfig = memberDefs[key];

      if (!memberConfig) {
        // Unknown member - check if open schema
        if (!config.open) {
          throw new IOValidationError(
            ErrorCodes.unknownMember,
            `Unknown member '${key}'`,
            undefined
          );
        }

        // Process as additional property
        const additionalConfig = typeof config.open === 'object' ? config.open : { type: 'any' };
        const memberValue = this.loadMember(value[key], additionalConfig, defs);
        if (memberValue !== undefined) {
          result[key] = memberValue;
        }
      } else {
        // Known member
        const memberValue = this.loadMember(value[key], memberConfig, defs);
        if (memberValue !== undefined) {
          result[key] = memberValue;
        }
        processedNames.add(key);
      }
    }

    // Check for missing required members and apply defaults
    for (const name in memberDefs) {
      if (processedNames.has(name)) continue;

      const memberConfig = memberDefs[name];

      // Check if optional or has default
      if (!memberConfig.optional && memberConfig.default === undefined) {
        throw new IOValidationError(
          ErrorCodes.valueRequired,
          `Required member '${name}' is missing`,
          undefined
        );
      }

      if (memberConfig.default !== undefined) {
        result[name] = memberConfig.default;
      }
    }

    return this.validate(result, config, undefined, defs);
  }

  /**
   * Validate an object value (common validation logic)
   *
   * This is the core validation logic shared by both parse() and load().
   *
   * @param value - The object value to validate
   * @param config - Configuration for validation
   * @param node - Optional AST node for error reporting
   * @param defs - Optional definitions for resolution
   * @returns Validated object value
   * @throws IOValidationError if validation fails
   */
  validate(value: Record<string, any>, config: ObjectConfig, node?: Node, defs?: Definitions): Record<string, any> {
    // Additional object-level validation can be added here
    // For now, member validation is done during parse/load
    return value;
  }

  /**
   * Stringify an object to IO format (serialization)
   *
   * @param value - The object value to stringify
   * @param config - Configuration for serialization
   * @returns IO format string representation
   *
   * @example
   * ```typescript
   * const personSchema = new ObjectTypeSchema({
   *   defs: {
   *     name: { type: stringType },
   *     age: { type: numberType }
   *   },
   *   names: ['name', 'age']
   * });
   *
   * personSchema.stringify({ name: "John", age: 30 }, config);
   * // Returns: "{John, 30}" (positional)
   *
   * personSchema.stringify({ name: "John" }, config);
   * // Returns: "{name: John}" (keyed, missing age)
   * ```
   */
  stringify(value: Record<string, any>, config: ObjectConfig): string {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Cannot stringify non-object value');
    }

    const memberDefs = config.defs || {};
    const orderedNames = config.names || [];
    const parts: string[] = [];

    // Determine if we should use positional or keyed format
    // Use positional if all ordered members are present and in order
    const usePositional = orderedNames.length > 0 &&
      orderedNames.every(name => value.hasOwnProperty(name));

    if (usePositional) {
      // Positional format
      for (const name of orderedNames) {
        const memberConfig = memberDefs[name];
        const memberValue = value[name];

        if (memberValue === undefined) {
          parts.push('');
        } else if (memberValue === null) {
          parts.push('N');
        } else if (typeof memberConfig?.type === 'object' && 'stringify' in memberConfig.type) {
          parts.push(memberConfig.type.stringify(memberValue, {}));
        } else {
          parts.push(this.stringifyValue(memberValue));
        }
      }

      // Add any additional properties if open schema
      if (config.open) {
        for (const key in value) {
          if (!orderedNames.includes(key)) {
            parts.push(`${key}: ${this.stringifyValue(value[key])}`);
          }
        }
      }
    } else {
      // Keyed format
      for (const key in value) {
        const memberConfig = memberDefs[key];
        const memberValue = value[key];

        if (memberValue === undefined) continue;

        let stringValue: string;
        if (memberValue === null) {
          stringValue = 'N';
        } else if (typeof memberConfig?.type === 'object' && 'stringify' in memberConfig.type) {
          stringValue = memberConfig.type.stringify(memberValue, {});
        } else {
          stringValue = this.stringifyValue(memberValue);
        }

        parts.push(`${key}: ${stringValue}`);
      }
    }

    return `{${parts.join(', ')}}`;
  }

  /**
   * Process a single member from an ObjectNode
   */
  private processMember(memberNode: MemberNode | undefined, config: MemberConfig, defs?: Definitions): any {
    if (!memberNode || !memberNode.value) {
      // Missing member - check if optional or has default
      if (config.default !== undefined) {
        return config.default;
      }
      if (config.optional) {
        return undefined;
      }
      throw new IOValidationError(
        ErrorCodes.valueRequired,
        `Required member '${config.path || 'unknown'}' is missing`,
        memberNode
      );
    }

    const typeSchema = config.type;

    if (typeof typeSchema === 'string') {
      // Type name string - need to resolve from registry
      // For now, just convert to value
      return memberNode.value.toValue ? memberNode.value.toValue(defs) : memberNode.value;
    }

    // TypeSchema object - use parse method
    return typeSchema.parse(memberNode.value, {}, defs);
  }

  /**
   * Load a single member from a JS value
   */
  private loadMember(value: any, config: MemberConfig, defs?: Definitions): any {
    if (value === undefined) {
      // Missing member - check if optional or has default
      if (config.default !== undefined) {
        return config.default;
      }
      if (config.optional) {
        return undefined;
      }
      throw new IOValidationError(
        ErrorCodes.valueRequired,
        `Required member '${config.path || 'unknown'}' is missing`,
        undefined
      );
    }

    const typeSchema = config.type;

    if (typeof typeSchema === 'string') {
      // Type name string - for now just return value
      return value;
    }

    // TypeSchema object - use load method
    return typeSchema.load(value, {}, defs);
  }

  /**
   * Stringify a value (helper for primitive types)
   */
  private stringifyValue(value: any): string {
    if (value === null) return 'N';
    if (value === undefined) return '';
    if (typeof value === 'string') {
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      return escaped.includes(',') || escaped.includes(' ') || escaped.includes(':')
        ? `"${escaped}"`
        : escaped;
    }
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'T' : 'F';
    if (Array.isArray(value)) {
      // Nested array - simple stringify
      return `[${value.map(v => this.stringifyValue(v)).join(', ')}]`;
    }
    if (typeof value === 'object') {
      // Nested object - recursive stringify
      return this.stringify(value, {});
    }
    return String(value);
  }
}
