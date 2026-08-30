import Collection from '../core/collection';
import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import ErrorCodes from '../errors/io-error-codes';
import IOError from '../errors/io-error';
import ValidationError from '../errors/io-validation-error';
import Schema from './schema';
import MemberDef from './types/memberdef';
import TypedefRegistry from './typedef-registry';
import registerTypes from './types';
import TokenNode from '../parser/nodes/tokens';
import { undeclaredMemberDef } from './utils/member-utils';
import { unusableTypeCode } from './types/common-number'
import resolveMemberDefVariables from './resolve-member-vars';

/**
 * Loads and validates a plain JavaScript object according to schema.
 * Uses TypeDef.load() methods to validate each field.
 *
 * @param data - Plain JavaScript object to validate
 * @param schema - Schema to validate against (or schema name if defs provided)
 * @param defs - Optional definitions for variable resolution and schema lookup
 * @returns InternetObject with validated data
 * @throws ValidationError if data doesn't conform to schema
 *
 * @example
 * ```typescript
 * const schema = compileSchema('person', '{ name: string, age: number }')
 * const data = { name: 'Alice', age: 28 }
 * const obj = loadObject(data, schema)
 * ```
 */
export function loadObject(
  data: any,
  schema: Schema | string,
  defs?: Definitions
): InternetObject {
  // Ensure built-in types are registered. Registration is otherwise only triggered as an import
  // side effect of `facade.ts`, which bundlers drop under `sideEffects: false` — leaving the
  // registry empty and `TypedefRegistry.get('string')` throwing 'not registered'. Idempotent.
  registerTypes();

  // Resolve schema if it's a string reference
  if (typeof schema === 'string') {
    if (!defs) {
      throw new ValidationError(ErrorCodes.missingDefinitions, `Schema reference '${schema}' requires definitions`);
    }
    const resolvedSchema = defs.getV(schema);
    if (!(resolvedSchema instanceof Schema)) {
      throw new ValidationError(ErrorCodes.undefinedSchema, `Schema '${schema}' not found or invalid`);
    }
    schema = resolvedSchema;
  }

  // Type check
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ValidationError(
      ErrorCodes.invalidObject,
      `Expecting an object value but found ${Array.isArray(data) ? 'array' : typeof data}`
    );
  }

  return _loadObject(data, schema, defs);
}

/**
 * Internal helper to loadObject an object with resolved schema
 */
function _loadObject(data: any, schema: Schema, defs?: Definitions): InternetObject {
  const result = new InternetObject();
  // Declaring the shape is what makes member position a property of the SCHEMA rather than of
  // the order the data happened to arrive in. The loop below already walks `schema.names`, so
  // nothing moves here today -- it is later writes, and the parse route, that need the rule to
  // exist at all.
  result.attachSchema(schema);
  const processedNames = new Set<string>();

  // Process schema-defined members
  for (const name of schema.names) {
    const memberDef = resolveMemberDefVariables(schema.defs[name], defs);
    const value = data[name];

    const typeDef = TypedefRegistry.get(memberDef.type);
    if (!typeDef) {
      throw new ValidationError(unusableTypeCode(memberDef.type), `Type '${memberDef.type}' is not registered.`);
    }

    // Use loadObject() method if available
    if ('load' in typeDef && typeDef.load) {
      try {
        const loadedValue = typeDef.load(value, memberDef, defs);
        if (loadedValue !== undefined) {
          result.set(name, loadedValue);
        }
      } catch (error) {
        // Add context to validation errors
        if (error instanceof ValidationError) {
          // Enhance error message with field name if not already present
          if (!error.message.includes(name)) {
            error.message = `Error in field '${name}': ${error.message}`;
          }
        }
        throw error;
      }
    } else {
      // Fallback for types without loadObject() - use value as-is if present
      if (value !== undefined) {
        result.set(name, value);
      } else if (memberDef.default !== undefined) {
        result.set(name, memberDef.default);
      } else if (!memberDef.optional) {
        throw new ValidationError(
          ErrorCodes.missingValue,
          `Value required for field '${name}'`
        );
      }
    }

    processedNames.add(name);
  }

  // Handle additional properties if schema is open
  if (schema.open) {
    for (const key in data) {
      if (!processedNames.has(key)) {
        let memberDef: MemberDef;

        memberDef = undeclaredMemberDef(key, schema.open);

        const typeDef = TypedefRegistry.get(memberDef.type);
        if (typeDef && 'load' in typeDef && typeDef.load) {
          const loadedValue = typeDef.load(data[key], memberDef, defs);
          if (loadedValue !== undefined) {
            result.set(key, loadedValue);
          }
        } else {
          result.set(key, data[key]);
        }
      }
    }
  } else {
    // Check for unexpected properties in closed schemas
    for (const key in data) {
      if (!processedNames.has(key)) {
        throw new ValidationError(
          ErrorCodes.unknownMember,
          `The ${schema.name ? `${schema.name} ` : ''}schema does not define a member named '${key}'.`
        );
      }
    }
  }

  return result;
}

/**
 * Loads and validates an array of JavaScript objects as a collection.
 * Collects validation errors for individual items while continuing to process the rest.
 *
 * @param dataArray - Array of plain JavaScript objects to validate
 * @param schema - Schema to validate each item against
 * @param defs - Optional definitions for variable resolution
 * @param errorCollector - Optional array to collect validation errors
 * @returns Collection with validated InternetObjects and error objects
 *
 * @example
 * ```typescript
 * const schema = compileSchema('person', '{ name: string, age: number }')
 * const data = [
 *   { name: 'Alice', age: 28 },
 *   { name: 'Bob', age: 'invalid' }  // Will create error object
 * ]
 * const errors: Error[] = []
 * const collection = loadCollection(data, schema, undefined, errors)
 * // collection[0] is valid InternetObject
 * // collection[1] is error object with collectionIndex: 1
 * // errors[0] contains the validation error details
 * ```
 */
export function loadCollection(
  dataArray: any[],
  schema: Schema | string,
  defs?: Definitions,
  errorCollector?: Error[]
): Collection<InternetObject> {
  // Ensure built-in types are registered (see loadObject). Idempotent.
  registerTypes();

  // Resolve schema if it's a string reference
  if (typeof schema === 'string') {
    if (!defs) {
      throw new ValidationError(ErrorCodes.missingDefinitions, `Schema reference '${schema}' requires definitions`);
    }
    const resolvedSchema = defs.getV(schema);
    if (!(resolvedSchema instanceof Schema)) {
      throw new ValidationError(ErrorCodes.undefinedSchema, `Schema '${schema}' not found or invalid`);
    }
    schema = resolvedSchema;
  }

  // Type check
  if (!Array.isArray(dataArray)) {
    throw new ValidationError(
      ErrorCodes.expectedArray,
      `Expecting an array but found ${typeof dataArray}`
    );
  }

  const collection = new Collection<InternetObject>();

  for (let i = 0; i < dataArray.length; i++) {
    try {
      const item = loadObject(dataArray[i], schema, defs);
      collection.push(item);
    } catch (error) {
      if (error instanceof Error) {
        // Attach collectionIndex for boundary context
        (error as any).collectionIndex = i;

        // Add to error collector if provided
        if (errorCollector) {
          errorCollector.push(error);
        }

        // Add to collection's internal error list
        collection.errors.push(error);

        // Create error object to maintain collection structure
        // This allows downstream code to know which items failed
        const errorObj = {
          __error: true,
          category: error instanceof ValidationError ? 'validation' : 'general',
          message: error.message,
          collectionIndex: i
        };

        collection.push(errorObj as any);
      } else {
        // Re-throw non-Error exceptions
        throw error;
      }
    }
  }

  return collection;
}
