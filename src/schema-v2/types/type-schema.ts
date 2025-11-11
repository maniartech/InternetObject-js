/**
 * Core TypeSchema interface for Internet Object Schema V2
 *
 * This is the foundation of the type system. Every type (String, Number, Boolean, etc.)
 * implements this interface to provide three core operations:
 *
 * **DESERIALIZATION (2 methods)**:
 * 1. parse() - From IO string format (receives AST Node with position info)
 * 2. load() - From JavaScript values (receives plain JS value)
 *
 * **SERIALIZATION (1 method)**:
 * 3. stringify() - To IO string format
 *
 * **CRITICAL: All methods follow V1 throw pattern**
 * - THROW IOValidationError on validation failure (no ValidationResult wrapper)
 * - Return validated value directly (no success/failure wrapper)
 * - Error recovery happens at collection boundary (collection processor catches)
 * - Common validation logic shared via validate() method
 *
 * @template TConfig - The configuration type for this schema (e.g., StringConfig, NumberConfig)
 * @template TValue - The TypeScript type of validated values (e.g., string, number, boolean)
 *
 * @example Complete implementation (V1 pattern)
 * ```typescript
 * class StringTypeSchema implements TypeSchema<StringConfig, string> {
 *   readonly typeName = 'string';
 *
 *   // Deserialization from IO format (AST Node)
 *   parse(node: Node, config: StringConfig, defs?: Definitions): string {
 *     const value = this.extractValue(node, defs); // Convert Node → JS value
 *     return this.validate(value, config, node, defs);
 *   }
 *
 *   // Deserialization from JS value
 *   load(value: unknown, config: StringConfig, defs?: Definitions): string {
 *     return this.validate(value, config, undefined, defs); // No node position
 *   }
 *
 *   // Common validation core (THROWS on failure)
 *   validate(value: unknown, config: StringConfig, node?: Node, defs?: Definitions): string {
 *     if (typeof value !== 'string') {
 *       throw new IOValidationError(ErrorCodes.notAString, message, node);
 *     }
 *     return value;
 *   }
 *
 *   // Serialization to IO format
 *   stringify(value: string, config: StringConfig): string {
 *     return value; // Escape and quote as needed
 *   }
 * }
 * ```
 */

import type Node from '../../parser/nodes/nodes';
import type Definitions from '../../core/definitions';

/**
 * Core interface that all type schemas must implement.
 *
 * **Architecture Pattern**:
 * - parse() + load() → validate() → return value or throw
 * - stringify() → serialize value to IO format
 * - Common validation logic in validate() method
 * - Error recovery at collection boundary (not in validators)
 *
 * Design Principles:
 * 1. **Three-phase processing**: parse (Node→value), load (JS→value), stringify (value→string)
 * 2. **Shared validation**: Common validate() method used by both parse() and load()
 * 3. **Position tracking**: parse() has Node for precise error locations, load() doesn't
 * 4. **Type-safe**: Generic types ensure correct value/config pairing
 * 5. **Deterministic**: Same input → same output (no hidden state)
 *
 * @template TConfig - Configuration object type (e.g., { minLength: number, maxLength: number })
 * @template TValue - TypeScript type of validated values (e.g., string, number, Date)
 */
export interface TypeSchema<TConfig = any, TValue = any> {
  /**
   * Unique identifier for this type (e.g., 'string', 'number', 'boolean').
   * Used for type resolution and error messages.
   *
   * @example 'string', 'number', 'boolean', 'date', 'array', 'object'
   */
  readonly typeName: string;

  /**
   * Schema describing valid configuration for this type.
   * This enables runtime validation of config objects following V1 pattern.
   *
   * **V1 Pattern**: Each type has a static schema that validates its config structure.
   * This ensures type-safe configuration at runtime, catching errors early.
   *
   * @example StringTypeSchema.schema
   * ```typescript
   * static readonly schema = new Schema(
   *   "string-config",
   *   { type:      { type: "string", optional: false, null: false, choices: ["string"] } },
   *   { minLength: { type: "number", optional: true,  null: false, min: 0 } },
   *   { maxLength: { type: "number", optional: true,  null: false, min: 0 } },
   *   { pattern:   { type: "string", optional: true,  null: false } },
   *   // ... more config fields
   * );
   * ```
   */
  readonly configSchema?: any; // TODO: Make required once all types have schemas

  /**
   * **DESERIALIZATION: Parse from IO string format (AST Node)**
   *
   * Converts an AST Node (from parser) into a validated JavaScript value.
   * This is called during string-to-IO processing.
   *
   * **Flow**:
   * 1. Extract JavaScript value from Node (handle TokenNode, variable refs, etc.)
   * 2. Call validate() with the extracted value
   * 3. Return validated value or throw IOValidationError
   *
   * **Position Tracking**: Node provides exact position info for IDE integration
   *
   * @param node - AST Node from parser (TokenNode, VarRefNode, etc.)
   * @param config - Type-specific configuration
   * @param defs - Optional Definitions for @var/@schema resolution
   *
   * @returns Validated TValue
   * @throws IOValidationError on validation failure
   *
   * @example
   * ```typescript
   * parse(node: Node, config: StringConfig, defs?: Definitions): string {
   *   // 1. Resolve variable references (if any)
   *   const resolvedNode = defs?.getV(node) || node;
   *
   *   // 2. Extract raw value from TokenNode
   *   if (!(resolvedNode instanceof TokenNode) || resolvedNode.type !== TokenType.STRING) {
   *     throw new IOValidationError(ErrorCodes.notAString, message, node);
   *   }
   *
   *   // 3. Validate using common validation core
   *   return this.validate(resolvedNode.value, config, node, defs);
   * }
   * ```
   */
  parse(
    node: Node,
    config: TConfig,
    defs?: Definitions
  ): TValue;

  /**
   * **DESERIALIZATION: Load from JavaScript value**
   *
   * Converts a plain JavaScript value into a validated IO value.
   * This is called during JS-to-IO processing (e.g., programmatic object creation).
   *
   * **Flow**:
   * 1. Receive plain JS value (string, number, boolean, etc.)
   * 2. Call validate() with the value
   * 3. Return validated value or throw IOValidationError
   *
   * **No Position Tracking**: Since there's no source text, node parameter is undefined
   *
   * @param value - Plain JavaScript value
   * @param config - Type-specific configuration
   * @param defs - Optional Definitions for @var/@schema resolution
   *
   * @returns Validated TValue
   * @throws IOValidationError on validation failure
   *
   * @example
   * ```typescript
   * load(value: unknown, config: StringConfig, defs?: Definitions): string {
   *   // Validate using common validation core (no node position)
   *   return this.validate(value, config, undefined, defs);
   * }
   * ```
   */
  load(
    value: unknown,
    config: TConfig,
    defs?: Definitions
  ): TValue;

  /**
   * **COMMON VALIDATION CORE**
   *
   * Shared validation logic used by both parse() and load().
   * This method contains all type-specific validation rules.
   *
   * **CRITICAL: Follows V1 throw pattern - THROWS IOValidationError on failure**
   * - Returns validated value directly (TValue) or throws IOValidationError
   * - No ValidationResult wrapper - collection processor handles error recovery
   * - Follow ERROR-HANDLING-GUIDELINES.md for error messages
   *
   * **V1 Lazy Resolution Pattern**:
   * - Use resolveVar(), resolveSchema(), resolveChoices() from lazy-resolution.ts
   * - Definitions parameter provides access to @var and $schema references
   *
   * **Performance**: This method is called millions of times. Keep it fast!
   * - Target: < 50µs for base types
   * - Use early returns for fast paths (default/optional/null)
   * - Minimize allocations
   *
   * **Error Handling**:
   * - THROW IOValidationError for invalid user data (V1 pattern)
   * - Pass node parameter for position tracking (IDE integration)
   * - Only throw Error for programmer errors (invariants, bugs)
   *
   * @param value - Value to validate (plain JS value, not Node)
   * @param config - Configuration object (type-specific options)
   * @param node - Optional Node for position tracking (from parse(), undefined for load())
   * @param defs - Optional Definitions for lazy resolution (@var, $schema)
   *
   * @returns Validated value (TValue) - only reached if all validations pass
   * @throws IOValidationError on first validation failure
   *
   * @example String validation (V1 pattern)
   * ```typescript
   * validate(value: unknown, config: StringConfig, node?: Node, defs?: Definitions): string {
   *   // 1. Common validation (may throw or early return)
   *   const { value: processedValue, changed } = doCommonValidation(value, config, node, defs);
   *   if (changed) return processedValue as string;
   *
   *   // 2. Type check - THROW immediately
   *   if (typeof value !== 'string') {
   *     throw new IOValidationError(
   *       ErrorCodes.notAString,
   *       `Expected string, got ${typeof value}`,
   *       node  // Position tracking (may be undefined)
   *     );
   *   }
   *
   *   // 3. Additional validations - THROW on each failure
   *   if (config.maxLength && value.length > config.maxLength) {
   *     throw new IOValidationError(ErrorCodes.outOfRange, message, node);
   *   }
   *
   *   return value;  // Only reached if all validations pass
   * }
   * ```
   */
  validate(
    value: unknown,
    config: TConfig,
    node?: Node,
    defs?: Definitions
  ): TValue;

  /**
   * **SERIALIZATION: Convert validated value to IO string format**
   *
   * Converts a validated JavaScript value back to Internet Object string representation.
   * This is called during serialization/stringification.
   *
   * **Round-trip guarantee**: parse → stringify → parse must preserve data.
   *
   * **Performance**: Keep serialization fast (target: < 100µs for simple types).
   *
   * @param value - Validated value (guaranteed to be TValue type)
   * @param config - Configuration object (same as used in validate)
   *
   * @returns String representation in Internet Object format
   *
   * @example String serialization
   * ```typescript
   * stringify(value: string, config: StringConfig): string {
   *   // Escape special characters, wrap in quotes if needed
   *   if (value.includes(',') || value.includes('\n')) {
   *     return `"${value.replace(/"/g, '\\"')}"`;
   *   }
   *   return value;
   * }
   * ```
   */
  stringify(
    value: TValue,
    config: TConfig
  ): string;

  /**
   * Optional: Compile configuration into optimized validator function.
   *
   * **Use case**: Repeated validation with same config (e.g., schema used 1000 times).
   * Compile once, validate many times fast!
   *
   * **Performance**: Compiled validators should be 2-5x faster than generic validate().
   *
   * @param config - Configuration to compile
   * @returns Compiled validator function (stateless, can be reused)
   *
   * @example Number range compilation (V1 pattern - throws)
   * ```typescript
   * compile(config: NumberConfig): CompiledValidator<number> {
   *   const { min, max } = config;
   *
   *   // Generate optimized validator function
   *   if (min !== undefined && max !== undefined) {
   *     return (value, node, defs) => {
   *       if (typeof value !== 'number' || value < min || value > max) {
   *         throw new IOValidationError(ErrorCodes.outOfRange, message, node);
   *       }
   *       return value;
   *     };
   *   }
   *
   *   // Fallback to generic validate
   *   return (value, node, defs) => this.validate(value, config, node, defs);
   * }
   * ```
   */
  compile?(config: TConfig): CompiledValidator<TValue>;

  /**
   * Optional: Get default value for this type when field is optional and missing.
   *
   * @param config - Configuration object
   * @returns Default value, or undefined if no default
   *
   * @example String with default
   * ```typescript
   * getDefaultValue(config: StringConfig): string | undefined {
   *   return config.default;
   * }
   * ```
   */
  getDefaultValue?(config: TConfig): TValue | undefined;
}

/**
 * Compiled validator function signature (V1 pattern - throws).
 *
 * Compiled validators are stateless, optimized functions generated from configuration.
 * They bypass generic validation logic for common cases.
 *
 * **CRITICAL: Follows V1 throw pattern**
 * - Returns TValue directly or throws IOValidationError
 * - No ValidationResult wrapper
 *
 * @template TValue - TypeScript type of validated values
 */
export type CompiledValidator<TValue> = (
  value: unknown,
  node?: Node,
  defs?: Definitions
) => TValue;

/**
 * Type guard to check if a value implements TypeSchema interface.
 *
 * @param value - Value to check
 * @returns true if value is a TypeSchema
 *
 * @example
 * ```typescript
 * if (isTypeSchema(someValue)) {
 *   const result = someValue.validate(data, config, ctx);
 * }
 * ```
 */
export function isTypeSchema(value: unknown): value is TypeSchema {
  return (
    typeof value === 'object' &&
    value !== null &&
    'typeName' in value &&
    'validate' in value &&
    'serialize' in value &&
    typeof (value as any).validate === 'function' &&
    typeof (value as any).serialize === 'function'
  );
}
