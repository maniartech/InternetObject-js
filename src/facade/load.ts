import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import Collection from '../core/collection';
import Schema from '../schema/schema';
import { loadObject, loadCollection } from '../schema/load-processor';
import { compileSchema } from '../schema';

/**
 * Load and validate plain JavaScript data according to an Internet Object schema.
 *
 * This is the high-level API for validating external data (from APIs, databases, etc.)
 * using Internet Object schemas. Unlike parse(), which processes IO text,
 * load() validates plain JavaScript objects.
 *
 * @param data - Plain JavaScript object or array to validate
 * @param schema - Schema definition (IO text, Schema object, or schema name from defs)
 * @param defs - Optional definitions for variable resolution and schema lookup
 * @param errorCollector - Optional array to collect validation errors (for collections)
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
 * const result = load(usersWithErrors, schema, undefined, errors);
 * console.log(errors.length); // Number of validation errors
 *
 * // Load with schema reference from definitions
 * const defs = new Definitions();
 * defs.set('User', compileSchema('User', '{ name: string, age: number }'));
 * const user = load(data, 'User', defs);
 * ```
 */
export function load(
  data: any,
  schema: string | Schema,
  defs?: Definitions,
  errorCollector?: Error[]
): InternetObject | Collection<InternetObject> {
  // Compile schema if it's a string (and not a reference)
  let resolvedSchema: Schema;

  if (typeof schema === 'string') {
    // Check if it's a schema reference (simple identifier)
    if (defs && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(schema)) {
      // Try to resolve as schema reference
      const schemaFromDefs = defs.getV(schema);
      if (schemaFromDefs instanceof Schema) {
        resolvedSchema = schemaFromDefs;
      } else {
        // Not found or not a schema - compile as IO text
        resolvedSchema = compileSchema('_temp', schema);
      }
    } else {
      // Compile as IO text
      resolvedSchema = compileSchema('_temp', schema);
    }
  } else {
    resolvedSchema = schema;
  }

  // Determine if data is an array (collection) or object
  if (Array.isArray(data)) {
    return loadCollection(data, resolvedSchema, defs, errorCollector);
  } else {
    return loadObject(data, resolvedSchema, defs);
  }
}
