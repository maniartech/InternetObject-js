import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import Collection from '../core/collection';
import Schema from '../schema/schema';
import { loadObject, loadCollection } from '../schema/load-processor';
import { compileSchema } from '../schema';

export interface LoadOptions {
  // Future options can be added here
}

/**
 * Load and validate plain JavaScript data according to an Internet Object schema.
 *
 * This is the high-level API for validating external data (from APIs, databases, etc.)
 * using Internet Object schemas. Unlike parse(), which processes IO text,
 * load() validates plain JavaScript objects.
 *
 * @param data - Plain JavaScript object or array to validate
 * @param defs - Schema definition (IO text, Schema object, or schema name from defs) or Definitions object
 * @param errorCollector - Optional array to collect validation errors (for collections)
 * @param options - Optional load options
 * @returns Validated InternetObject or Collection
 * @throws ValidationError if data doesn't conform to schema
 *
 * @example
 * ```typescript
 * // Load a single object
 * const data = { name: 'Alice', age: 28 };
 * const obj = load(data, '{ name: string, age: number }');
 * console.log(obj.get('name')); // 'Alice'
 *
 * // Load a collection
 * const users = [
 *   { name: 'Alice', age: 28 },
 *   { name: 'Bob', age: 35 }
 * ];
 * const collection = load(users, '{ name: string, age: number }');
 * console.log(collection.length); // 2
 *
 * // Load with error collection
 * const errors: Error[] = [];
 * const result = load(usersWithErrors, schema, errors);
 * console.log(errors.length); // Number of validation errors
 *
 * // Load with schema reference from definitions
 * const defs = new Definitions();
 * defs.set('User', compileSchema('User', '{ name: string, age: number }'));
 * const user = load(data, defs); // Uses default schema if available, or pass schema name
 * ```
 */
export function load(data: any, schema: string | Schema, defs?: Definitions, errorCollector?: Error[]): InternetObject | Collection<InternetObject>;
export function load(data: any, defs?: Definitions | Schema | string, errorCollector?: Error[], options?: LoadOptions): InternetObject | Collection<InternetObject>;
export function load(
  data: any,
  defs?: Definitions | Schema | string,
  errorCollector?: Error[] | Definitions,
  options?: LoadOptions | Error[]
): InternetObject | Collection<InternetObject> {
  let resolvedSchema: Schema | undefined;
  let definitions: Definitions | undefined;
  let errors: Error[] | undefined;

  // Argument shifting for backward compatibility
  // load(data, schema, defs, errorCollector)
  if (defs instanceof Schema || typeof defs === 'string') {
    // If 2nd arg is Schema/string, it's the schema
    // Check if 3rd arg is Definitions
    if (errorCollector instanceof Definitions) {
      definitions = errorCollector;
      // Check if 4th arg is Error[]
      if (Array.isArray(options)) {
        errors = options as Error[];
      }
    } else {
      // New signature: load(data, schema, errorCollector, options)
      if (Array.isArray(errorCollector)) {
        errors = errorCollector;
      } else if (!errorCollector && Array.isArray(options)) {
        // Handle case: load(data, schema, undefined, errors)
        // This supports the legacy signature where defs is undefined
        errors = options as Error[];
      }
    }
  } else if (defs instanceof Definitions) {
    definitions = defs;
    if (Array.isArray(errorCollector)) {
      errors = errorCollector;
    }
  }

  // Resolve schema
  if (typeof defs === 'string') {
    // Check if it's a schema reference (simple identifier)
    if (definitions && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(defs)) {
      // Try to resolve as schema reference
      const schemaFromDefs = definitions.getV(defs);
      if (schemaFromDefs instanceof Schema) {
        resolvedSchema = schemaFromDefs;
      } else {
        // Not found or not a schema - compile as IO text
        resolvedSchema = compileSchema('_temp', defs);
      }
    } else {
      // Compile as IO text
      resolvedSchema = compileSchema('_temp', defs);
    }
  } else if (defs instanceof Schema) {
    resolvedSchema = defs;
  } else if (defs instanceof Definitions) {
    // If defs is Definitions, try to get default schema
    resolvedSchema = defs.defaultSchema || undefined;
  }

  if (!resolvedSchema) {
    // If no schema found, maybe we can infer or just load without validation?
    // loadObject/loadCollection require schema.
    // If defs is Definitions and no default schema, we can't proceed unless we allow schema-less load?
    // But load() implies validation.
    // Let's throw error if no schema resolved
    throw new Error("No schema provided or found in definitions.");
  }

  // Determine if data is an array (collection) or object
  if (Array.isArray(data)) {
    return loadCollection(data, resolvedSchema, definitions, errors);
  } else {
    return loadObject(data, resolvedSchema, definitions);
  }
}
