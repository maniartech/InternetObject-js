import Collection from '../core/collection';
import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import ErrorCodes from '../errors/io-error-codes';
import ValidationError from '../errors/io-validation-error';
import Schema from './schema';
import MemberDef from './types/memberdef';
import TypedefRegistry from './typedef-registry';
import TokenNode from '../parser/nodes/tokens';

/**
 * Resolves variable references in memberDef fields like default, min, max, choices.
 * Variables are strings starting with @ that reference definitions.
 */
function _resolveMemberDefVariables(memberDef: MemberDef, defs?: Definitions): MemberDef {
  if (!memberDef || !defs) return memberDef;

  const resolved = { ...memberDef };

  // Resolve default value if it's a variable reference
  if (typeof resolved.default === 'string' && resolved.default.startsWith('@')) {
    resolved.default = defs.getV(resolved.default);
    // Unwrap TokenNode if needed
    if (resolved.default instanceof TokenNode) {
      resolved.default = resolved.default.value;
    }
  }

  // Resolve choices if they contain variable references
  if (Array.isArray(resolved.choices)) {
    resolved.choices = resolved.choices.map(choice => {
      if (typeof choice === 'string' && choice.startsWith('@')) {
        let resolved = defs.getV(choice);
        return resolved instanceof TokenNode ? resolved.value : resolved;
      }
      return choice;
    });
  }

  // Resolve min/max if they're variable references
  if (typeof resolved.min === 'string' && resolved.min.startsWith('@')) {
    resolved.min = defs.getV(resolved.min);
    if (resolved.min instanceof TokenNode) {
      resolved.min = resolved.min.value;
    }
  }
  if (typeof resolved.max === 'string' && resolved.max.startsWith('@')) {
    resolved.max = defs.getV(resolved.max);
    if (resolved.max instanceof TokenNode) {
      resolved.max = resolved.max.value;
    }
  }

  return resolved;
}

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
  // Resolve schema if it's a string reference
  if (typeof schema === 'string') {
    if (!defs) {
      throw new Error(`Schema reference '${schema}' requires definitions`);
    }
    const resolvedSchema = defs.getV(schema);
    if (!(resolvedSchema instanceof Schema)) {
      throw new Error(`Schema '${schema}' not found or invalid`);
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
 * Internal helper to load an object with resolved schema
 */
function _loadObject(data: any, schema: Schema, defs?: Definitions): InternetObject {
  const result = new InternetObject();
  const processedNames = new Set<string>();

  // Process schema-defined members
  for (const name of schema.names) {
    const memberDef = _resolveMemberDefVariables(schema.defs[name], defs);
    const value = data[name];

    const typeDef = TypedefRegistry.get(memberDef.type);
    if (!typeDef) {
      throw new Error(`Type ${memberDef.type} is not registered.`);
    }

    // Use load() method if available
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
      // Fallback for types without load() - use value as-is if present
      if (value !== undefined) {
        result.set(name, value);
      } else if (memberDef.default !== undefined) {
        result.set(name, memberDef.default);
      } else if (!memberDef.optional) {
        throw new ValidationError(
          ErrorCodes.valueRequired,
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

        // Use schema.open constraints if it's a MemberDef, otherwise type 'any'
        if (typeof schema.open === 'object' && schema.open.type) {
          memberDef = { ...schema.open, path: key };
        } else {
          memberDef = { type: 'any', path: key };
        }

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
  // Resolve schema if it's a string reference
  if (typeof schema === 'string') {
    if (!defs) {
      throw new Error(`Schema reference '${schema}' requires definitions`);
    }
    const resolvedSchema = defs.getV(schema);
    if (!(resolvedSchema instanceof Schema)) {
      throw new Error(`Schema '${schema}' not found or invalid`);
    }
    schema = resolvedSchema;
  }

  // Type check
  if (!Array.isArray(dataArray)) {
    throw new ValidationError(
      ErrorCodes.notAnArray,
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
          category: error instanceof ValidationError ? 'validation' : 'runtime',
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
