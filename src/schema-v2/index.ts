/**
 * Schema V2 - Internet Object Type System
 *
 * This is the next-generation schema system that provides:
 * - Static config validation using V1 Schema class
 * - Three-method pattern: parse/load/stringify + validate core
 * - Type-safe schema definitions
 * - Integration with existing V1 parser
 *
 * @example Basic usage
 * ```typescript
 * import {
 *   parse,
 *   stringify,
 *   ObjectTypeSchema,
 *   StringTypeSchema,
 *   NumberTypeSchema
 * } from './schema-v2';
 *
 * // Define schema
 * const personSchema = new ObjectTypeSchema({
 *   defs: {
 *     name: { type: new StringTypeSchema({ minLength: 1 }) },
 *     age: { type: new NumberTypeSchema({ min: 0, max: 150 }) }
 *   },
 *   names: ['name', 'age']
 * });
 *
 * // Parse IO string
 * const person = parse('John, 30', personSchema);
 *
 * // Serialize back
 * const ioString = stringify(person, personSchema);
 * ```
 */

// Integration functions (V1 Parser → V2 Schema)
export { parse, parseCollection, stringify, roundTrip, getASTNode } from './integration';

// Type schemas
export { TypeSchema } from './types/type-schema';
export { StringTypeSchema } from './types/string-type';
export { NumberTypeSchema } from './types/number-type';
export { BooleanTypeSchema } from './types/boolean-type';
export { ArrayTypeSchema } from './types/array-type';
export { ObjectTypeSchema } from './types/object-type';
