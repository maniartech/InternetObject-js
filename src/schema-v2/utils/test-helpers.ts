/**
 * Test Utilities for V2 Schema System
 *
 * These helpers bridge the existing V1 parser with V2 TypeSchema system,
 * enabling end-to-end testing without modifying core/parser/errors packages.
 *
 * **Usage Pattern**:
 * 1. Define your schema using V2 TypeSchema classes
 * 2. Use parseWithSchema() to parse IO strings
 * 3. Use stringifyWithSchema() to serialize back to IO
 *
 * @example
 * ```typescript
 * const personSchema = new ObjectTypeSchema({
 *   defs: {
 *     name: { type: new StringTypeSchema() },
 *     age: { type: new NumberTypeSchema() }
 *   },
 *   names: ['name', 'age']
 * });
 *
 * const result = parseWithSchema('John, 30', personSchema);
 * // result: { name: 'John', age: 30 }
 * ```
 */

import Tokenizer from '../../parser/tokenizer';
import ASTParser from '../../parser/ast-parser';
import type { TypeSchema } from '../types/type-schema';
import type Node from '../../parser/nodes/nodes';
import type Definitions from '../../core/definitions';
import ObjectNode from '../../parser/nodes/objects';
import ArrayNode from '../../parser/nodes/array';
import CollectionNode from '../../parser/nodes/collections';

/**
 * Parse an IO string using a V2 schema
 *
 * This is a simple integration bridge that:
 * 1. Uses V1 parser (Tokenizer → ASTParser) to get AST
 * 2. Uses V2 TypeSchema.parse() to validate and convert
 *
 * @param ioString - Internet Object format string
 * @param schema - V2 TypeSchema to use for validation
 * @param defs - Optional Definitions for @var/$schema resolution
 * @returns Validated JavaScript value
 *
 * @example Parse a simple object
 * ```typescript
 * const schema = new ObjectTypeSchema({
 *   defs: {
 *     name: { type: new StringTypeSchema() },
 *     age: { type: new NumberTypeSchema() }
 *   },
 *   names: ['name', 'age']
 * });
 *
 * const result = parseWithSchema('John, 30', schema);
 * // { name: 'John', age: 30 }
 * ```
 *
 * @example Parse an array
 * ```typescript
 * const schema = new ArrayTypeSchema({
 *   of: new StringTypeSchema()
 * });
 *
 * const result = parseWithSchema('[hello, world]', schema);
 * // ['hello', 'world']
 * ```
 */
export function parseWithSchema<TValue = any>(
  ioString: string,
  schema: TypeSchema<any, TValue>,
  defs?: Definitions
): TValue {
  // Step 1: Tokenize
  const tokenizer = new Tokenizer(ioString);
  const tokens = tokenizer.tokenize();

  // Step 2: Parse to AST
  const parser = new ASTParser(tokens);
  const docNode = parser.parse();

  // Step 3: Get the first data node
  // For simple test cases, we expect a single value at the root
  const firstChild = docNode.firstChild;

  if (!firstChild) {
    throw new Error('No data found in IO string');
  }

  // Step 4: Use V2 schema to parse the node
  const dataNode = firstChild.child || firstChild;
  return schema.parse(dataNode, {}, defs);
}

/**
 * Parse an object from IO string using V2 ObjectTypeSchema
 *
 * Convenience wrapper around parseWithSchema for objects.
 * Handles both single objects and collections.
 *
 * @param ioString - IO format string (e.g., "John, 30" or "{name: John, age: 30}")
 * @param schema - ObjectTypeSchema instance
 * @param defs - Optional Definitions
 * @returns Validated object
 *
 * @example Positional object
 * ```typescript
 * const result = parseObject('John, 30', personSchema);
 * // { name: 'John', age: 30 }
 * ```
 *
 * @example Keyed object
 * ```typescript
 * const result = parseObject('{name: John, age: 30}', personSchema);
 * // { name: 'John', age: 30 }
 * ```
 */
export function parseObject(
  ioString: string,
  schema: TypeSchema<any, Record<string, any>>,
  defs?: Definitions
): Record<string, any> {
  const tokenizer = new Tokenizer(ioString);
  const tokens = tokenizer.tokenize();
  const parser = new ASTParser(tokens);
  const docNode = parser.parse();

  const firstChild = docNode.firstChild;
  if (!firstChild) {
    throw new Error('No data found in IO string');
  }

  let dataNode: Node = firstChild.child || firstChild;

  // If we got a CollectionNode with a single child, unwrap it
  if (dataNode instanceof CollectionNode && dataNode.children.length === 1) {
    dataNode = dataNode.children[0] || dataNode;
  }

  return schema.parse(dataNode, {}, defs);
}

/**
 * Parse an array from IO string using V2 ArrayTypeSchema
 *
 * Convenience wrapper around parseWithSchema for arrays.
 *
 * @param ioString - IO format string (e.g., "[1, 2, 3]")
 * @param schema - ArrayTypeSchema instance
 * @param defs - Optional Definitions
 * @returns Validated array
 *
 * @example
 * ```typescript
 * const schema = new ArrayTypeSchema({
 *   of: new NumberTypeSchema(),
 *   minLen: 1
 * });
 *
 * const result = parseArray('[1, 2, 3]', schema);
 * // [1, 2, 3]
 * ```
 */
export function parseArray(
  ioString: string,
  schema: TypeSchema<any, any[]>,
  defs?: Definitions
): any[] {
  const tokenizer = new Tokenizer(ioString);
  const tokens = tokenizer.tokenize();
  const parser = new ASTParser(tokens);
  const docNode = parser.parse();

  const firstChild = docNode.firstChild;
  if (!firstChild) {
    throw new Error('No data found in IO string');
  }

  const dataNode = firstChild.child || firstChild;
  return schema.parse(dataNode, {}, defs);
}

/**
 * Parse a collection (array of objects) from IO string
 *
 * Handles the common pattern of parsing multiple objects:
 * ```
 * ~ John, 30
 * ~ Jane, 25
 * ```
 *
 * @param ioString - IO format collection string
 * @param itemSchema - Schema for each item in the collection
 * @param defs - Optional Definitions
 * @returns Array of validated objects
 *
 * @example
 * ```typescript
 * const personSchema = new ObjectTypeSchema({
 *   defs: {
 *     name: { type: new StringTypeSchema() },
 *     age: { type: new NumberTypeSchema() }
 *   },
 *   names: ['name', 'age']
 * });
 *
 * const result = parseCollection('~ John, 30\n~ Jane, 25', personSchema);
 * // [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }]
 * ```
 */
export function parseCollection<TValue = any>(
  ioString: string,
  itemSchema: TypeSchema<any, TValue>,
  defs?: Definitions
): TValue[] {
  const tokenizer = new Tokenizer(ioString);
  const tokens = tokenizer.tokenize();
  const parser = new ASTParser(tokens);
  const docNode = parser.parse();

  const firstChild = docNode.firstChild;
  if (!firstChild) {
    throw new Error('No data found in IO string');
  }

  const dataNode = firstChild.child || firstChild;

  // If it's a CollectionNode, parse each child
  if (dataNode instanceof CollectionNode) {
    const results: TValue[] = [];
    for (const child of dataNode.children) {
      if (child) {
        results.push(itemSchema.parse(child, {}, defs));
      }
    }
    return results;
  }

  // Single item - wrap in array
  return [itemSchema.parse(dataNode, {}, defs)];
}

/**
 * Stringify a value using a V2 schema
 *
 * @param value - JavaScript value to stringify
 * @param schema - V2 TypeSchema to use for serialization
 * @returns IO format string
 *
 * @example
 * ```typescript
 * const schema = new ObjectTypeSchema({
 *   defs: {
 *     name: { type: new StringTypeSchema() },
 *     age: { type: new NumberTypeSchema() }
 *   },
 *   names: ['name', 'age']
 * });
 *
 * const ioString = stringifyWithSchema({ name: 'John', age: 30 }, schema);
 * // "John, 30" or "{name: John, age: 30}"
 * ```
 */
export function stringifyWithSchema<TValue = any>(
  value: TValue,
  schema: TypeSchema<any, TValue>
): string {
  return schema.stringify(value, {});
}

/**
 * Round-trip test helper: parse then stringify
 *
 * Useful for testing that serialization preserves data integrity.
 *
 * @param ioString - Original IO string
 * @param schema - Schema to use
 * @param defs - Optional Definitions
 * @returns Object with parsed value and stringified result
 *
 * @example
 * ```typescript
 * const { parsed, stringified } = roundTrip('[1, 2, 3]', arraySchema);
 * expect(parsed).toEqual([1, 2, 3]);
 * expect(stringified).toBe('[1, 2, 3]');
 * ```
 */
export function roundTrip<TValue = any>(
  ioString: string,
  schema: TypeSchema<any, TValue>,
  defs?: Definitions
): { parsed: TValue; stringified: string } {
  const parsed = parseWithSchema(ioString, schema, defs);
  const stringified = stringifyWithSchema(parsed, schema);
  return { parsed, stringified };
}

/**
 * Get the raw AST node without schema validation
 *
 * Useful for debugging and understanding what the parser produces.
 *
 * @param ioString - IO format string
 * @returns The first AST node
 *
 * @example
 * ```typescript
 * const node = getRawNode('John, 30');
 * console.log(node.constructor.name); // 'ObjectNode'
 * ```
 */
export function getRawNode(ioString: string): Node | undefined {
  const tokenizer = new Tokenizer(ioString);
  const tokens = tokenizer.tokenize();
  const parser = new ASTParser(tokens);
  const docNode = parser.parse();

  const firstChild = docNode.firstChild;
  return firstChild ? (firstChild.child || firstChild) : undefined;
}
