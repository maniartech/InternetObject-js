/**
 * Integration Bridge: V1 Parser → V2 TypeSchema
 *
 * This module provides the integration layer between the existing V1 parser
 * (Tokenizer + ASTParser) and the new V2 TypeSchema system. It enables parsing
 * and serialization without modifying core/parser/errors packages.
 *
 * **Core Flow**:
 * 1. Tokenizer: IO string → Token[]
 * 2. ASTParser: Token[] → DocumentNode (AST)
 * 3. TypeSchema.parse: AST Node → Validated JavaScript value
 *
 * @example Basic usage
 * ```typescript
 * import { parse, stringify } from './schema-v2/integration';
 * import { ObjectTypeSchema, StringTypeSchema, NumberTypeSchema } from './schema-v2/types';
 *
 * const personSchema = new ObjectTypeSchema({
 *   defs: {
 *     name: { type: new StringTypeSchema() },
 *     age: { type: new NumberTypeSchema() }
 *   },
 *   names: ['name', 'age']
 * });
 *
 * // Parse IO string
 * const person = parse('John, 30', personSchema);
 * // { name: 'John', age: 30 }
 *
 * // Serialize back to IO
 * const ioString = stringify(person, personSchema);
 * // "John, 30"
 * ```
 */

import Tokenizer from '../parser/tokenizer';
import ASTParser from '../parser/ast-parser';
import type { TypeSchema } from './types/type-schema';
import type Node from '../parser/nodes/nodes';
import type Definitions from '../core/definitions';
import CollectionNode from '../parser/nodes/collections';
// Type schema classes for header generation
import { StringTypeSchema } from './types/string-type';
import { NumberTypeSchema } from './types/number-type';
import { BooleanTypeSchema } from './types/boolean-type';
import { ArrayTypeSchema } from './types/array-type';
import { ObjectTypeSchema } from './types/object-type';
// V1 parser & schema processing (authoritative logic)
import parseV1 from '../parser/index';
import processSchema from '../schema/processor';
import compileObject from '../schema/compile-object';
import Schema from '../schema/schema';
import DefinitionsClass from '../core/definitions';
import ObjectNode from '../parser/nodes/objects';
import CollectionNodeAst from '../parser/nodes/collections';
import SectionNode from '../parser/nodes/section';
import DocumentNode from '../parser/nodes/document';

/**
 * Parse an IO string using a V2 TypeSchema
 *
 * This is the main integration function that bridges V1 parser output
 * with V2 schema validation.
 *
 * @param ioString - Internet Object format string
 * @param schema - V2 TypeSchema for validation and conversion
 * @param defs - Optional Definitions for @var/$schema resolution
 * @returns Validated JavaScript value
 * @throws {IOValidationError} If validation fails
 *
 * @example Parse a simple object
 * ```typescript
 * const schema = new ObjectTypeSchema({
 *   defs: {
 *     name: { type: new StringTypeSchema() },
 *     age: { type: new NumberTypeSchema({ min: 0 }) }
 *   },
 *   names: ['name', 'age']
 * });
 *
 * const result = parse('John, 30', schema);
 * // { name: 'John', age: 30 }
 * ```
 *
 * @example Parse an array
 * ```typescript
 * const schema = new ArrayTypeSchema({
 *   of: new StringTypeSchema(),
 *   minLen: 1
 * });
 *
 * const result = parse('[hello, world]', schema);
 * // ['hello', 'world']
 * ```
 *
 * @example Parse with definitions
 * ```typescript
 * const ioString = `
 *   @name = John
 *   ---
 *   $name, 30
 * `;
 *
 * const defs = new Definitions();
 * const result = parse(ioString, personSchema, defs);
 * // { name: 'John', age: 30 }
 * ```
 */
// Overloads: inline schema/header parsing OR explicit V2 TypeSchema
export function parse(ioString: string): any;
export function parse<TValue = any>(ioString: string, schema: TypeSchema<any, TValue>, defs?: Definitions): TValue;
export function parse<TValue = any>(ioString: string, schema?: TypeSchema<any, TValue>, defs?: Definitions): any {
  // If schema provided, use direct V2 bridging (original behavior)
  if (schema) {
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

  // Inline parse path: delegate to authoritative V1 logic (compile/process) then normalize result.
  return parseInlineWithV1(ioString);
}

/**
 * Parse a collection (multiple items) from IO string
 *
 * Handles the common pattern of parsing multiple objects/values:
 * ```
 * ~ John, 30
 * ~ Jane, 25
 * ```
 *
 * @param ioString - IO format collection string
 * @param itemSchema - Schema for each item
 * @param defs - Optional Definitions
 * @returns Array of validated items
 *
 * @example Parse multiple objects
 * ```typescript
 * const personSchema = new ObjectTypeSchema({
 *   defs: {
 *     name: { type: new StringTypeSchema() },
 *     age: { type: new NumberTypeSchema() }
 *   },
 *   names: ['name', 'age']
 * });
 *
 * const ioString = `
 *   ~ John, 30
 *   ~ Jane, 25
 * `;
 *
 * const people = parseCollection(ioString, personSchema);
 * // [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }]
 * ```
 *
 * @example Parse array of primitives
 * ```typescript
 * const schema = new NumberTypeSchema();
 * const numbers = parseCollection('~ 1\n~ 2\n~ 3', schema);
 * // [1, 2, 3]
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
 * Stringify a JavaScript value to IO format using a V2 TypeSchema
 *
 * @param value - JavaScript value to serialize
 * @param schema - V2 TypeSchema for serialization
 * @returns IO format string
 *
 * @example Stringify an object
 * ```typescript
 * const schema = new ObjectTypeSchema({
 *   defs: {
 *     name: { type: new StringTypeSchema() },
 *     age: { type: new NumberTypeSchema() }
 *   },
 *   names: ['name', 'age']
 * });
 *
 * const ioString = stringify({ name: 'John', age: 30 }, schema);
 * // "John, 30"
 * ```
 *
 * @example Stringify an array
 * ```typescript
 * const schema = new ArrayTypeSchema({
 *   of: new StringTypeSchema()
 * });
 *
 * const ioString = stringify(['hello', 'world'], schema);
 * // "[hello, world]"
 * ```
 */
export function stringify<TValue = any>(
  value: TValue,
  schema: TypeSchema<any, TValue>,
  options?: { includeSchema?: boolean }
): string {
  const body = schema.stringify(value, {});
  if (!options?.includeSchema) return body;

  const header = buildSchemaHeader(schema);
  return header ? `${header}\n---\n${body}` : `---\n${body}`;
}

/**
 * Create a simple one-line schema header description from a TypeSchema.
 * Currently supports ObjectTypeSchema and ArrayTypeSchema. For other types,
 * returns the primitive type name.
 */
function buildSchemaHeader(schema: TypeSchema<any, any>): string {
  // Object schema: "name: string, age: number"
  if (schema instanceof ObjectTypeSchema) {
    const cfg: any = (schema as any).config || {};
    const defs: Record<string, any> = cfg.defs || {};
    const ordered: string[] = cfg.names && Array.isArray(cfg.names)
      ? cfg.names
      : Object.keys(defs);

    const parts: string[] = [];
    for (const name of ordered) {
      const mc = defs[name];
      if (!mc) continue;
      parts.push(`${name}: ${typeLabel(mc.type)}`);
    }
    return parts.join(', ');
  }

  // Array schema: "array: <type>"
  if (schema instanceof ArrayTypeSchema) {
    const cfg: any = (schema as any).config || {};
    const ofType = cfg.of ? typeLabel(cfg.of) : 'any';
    return `array: ${ofType}`;
  }

  // Primitive schemas
  if (schema instanceof StringTypeSchema) return 'string';
  if (schema instanceof NumberTypeSchema) return 'number';
  if (schema instanceof BooleanTypeSchema) return 'boolean';

  return '';
}

function typeLabel(t: any): string {
  if (typeof t === 'string') return t;
  if (t instanceof StringTypeSchema) return 'string';
  if (t instanceof NumberTypeSchema) return 'number';
  if (t instanceof BooleanTypeSchema) return 'boolean';
  if (t instanceof ArrayTypeSchema) {
    const cfg: any = (t as any).config || {};
    const inner = cfg.of ? typeLabel(cfg.of) : 'any';
    return `${inner}[]`;
  }
  if (t instanceof ObjectTypeSchema) return 'object';
  return 'any';
}

/**
 * Round-trip utility: parse then stringify
 *
 * Useful for testing data integrity and serialization consistency.
 *
 * @param ioString - Original IO format string
 * @param schema - Schema to use for both operations
 * @param defs - Optional Definitions
 * @returns Object with parsed value and stringified result
 *
 * @example Test round-trip integrity
 * ```typescript
 * const schema = new ArrayTypeSchema({
 *   of: new NumberTypeSchema()
 * });
 *
 * const { parsed, stringified } = roundTrip('[1, 2, 3]', schema);
 *
 * expect(parsed).toEqual([1, 2, 3]);
 * expect(stringified).toBe('[1, 2, 3]');
 * ```
 */
export function roundTrip<TValue = any>(
  ioString: string,
  schema: TypeSchema<any, TValue>,
  defs?: Definitions
): { parsed: TValue; stringified: string } {
  const parsed = parse(ioString, schema, defs);
  const stringified = stringify(parsed, schema);
  return { parsed, stringified };
}

/**
 * Get the raw AST node without schema validation
 *
 * Useful for debugging and understanding parser output.
 *
 * @param ioString - IO format string
 * @returns The first AST node, or undefined if empty
 *
 * @example Inspect AST structure
 * ```typescript
 * const node = getASTNode('John, 30');
 * console.log(node?.constructor.name); // 'ObjectNode'
 * ```
 */
export function getASTNode(ioString: string): Node | undefined {
  const tokenizer = new Tokenizer(ioString);
  const tokens = tokenizer.tokenize();
  const parser = new ASTParser(tokens);
  const docNode = parser.parse();

  const firstChild = docNode.firstChild;
  return firstChild ? (firstChild.child || firstChild) : undefined;
}

/**
 * Parse an IO string that contains an inline schema header before a --- separator.
 *
 * Supports object headers of the form:
 *   name:string, age:number
 * followed by either:
 *   John, 30                (single object positional)
 * or collection lines:
 *   ~ John, 30
 *   ~ Jane, 25
 *
 * @param ioString Full IO text with header + --- + body
 * @returns Parsed value (object or array of objects)
 *
 * @example
 * const io = `name:string, age:number\n---\n~ John, 30\n~ Jane, 25`;
 * const people = parseInline(io);
 * // [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }]
 */
export function parseInline(ioString: string): any {
  return parseInlineWithV1(ioString);
}

/**
 * Inline parsing using authoritative V1 AST + schema processing logic.
 * Mirrors parser/index.ts behavior: build DocumentNode, compile header schema/definitions,
 * then process each data section via processSchema. Returns plain JS value(s).
 */
function parseInlineWithV1(ioString: string): any {
  // Use V1 parser to get IODocument which already handles compiling header & processing sections.
  // We pass null external definitions to keep behavior localized.
  const doc = parseV1(ioString, null, {});
  const sections = doc.sections;
  const len = sections?.length || 0;

  if (len === 0) return null;
  if (len === 1) {
    // Single section: return its JSON representation (could be object or collection)
    // Note: skipErrors: false means error objects (with __error: true) are included in the output
    const single = sections?.get(0);
    const value = single?.toJSON({ skipErrors: false });
    return value;
  }

  // Multiple named sections: build object keyed by section name
  const result: Record<string, any> = {};
  for (let i = 0; i < len; i++) {
    const sec = sections?.get(i);
    if (!sec) continue;
    result[sec.name as string] = sec.toJSON({ skipErrors: false });
  }
  return result;
}

// Legacy helper retained for potential future dynamic header-to-V2 translation (currently unused)
function mapPrimitiveType(name: string): TypeSchema<any, any> {
  switch (name.toLowerCase()) {
    case 'string': return new StringTypeSchema();
    case 'number': return new NumberTypeSchema();
    case 'boolean': return new BooleanTypeSchema();
    default:
      return new StringTypeSchema();
  }
}
