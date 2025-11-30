import Definitions from '../core/definitions';
import Document from '../core/document';
import Header from '../core/header';
import Section from '../core/section';
import SectionCollection from '../core/section-collection';
import InternetObject from '../core/internet-object';
import Collection from '../core/collection';
import Schema from '../schema/schema';
import { loadObject as processObject, loadCollection } from '../schema/load-processor';
import { compileSchema } from '../schema';
import { inferDefs } from '../schema/utils/defs-inferrer';

export interface LoadObjectOptions {
  /**
   * When true, infers definitions (schemas) from the input data structure.
   * This allows loading JSON data without explicitly providing a schema.
   *
   * The inferred definitions will include:
   * - `$schema` for the root object (default schema)
   * - Named schemas like `$borrowedBy`, `$membershipType` for nested objects
   *
   * @default false
   */
  inferDefs?: boolean;
}

/**
 * Load and validate plain JavaScript data according to an Internet Object schema.
 *
 * This is the high-level API for validating external data (from APIs, databases, etc.)
 * using Internet Object schemas. Unlike parse(), which processes IO text,
 * loadObject() validates plain JavaScript objects.
 *
 * @param data - Plain JavaScript object or array to validate
 * @param schema - Schema definition (IO text, Schema object, or schema name when used with definitions)
 * @param defsOrOptions - Definitions object or LoadObjectOptions
 * @param errors - Optional error collector array (deprecated, use Collection.errors instead)
 * @returns Validated InternetObject or Collection
 * @throws ValidationError if data doesn't conform to schema
 *
 * @example
 * ```typescript
 * // Load a single object with explicit schema
 * const data = { name: 'Alice', age: 28 };
 * const obj = loadObject(data, '{ name: string, age: number }');
 * console.log(obj.get('name')); // 'Alice'
 *
 * // Load a collection
 * const users = [
 *   { name: 'Alice', age: 28 },
 *   { name: 'Bob', age: 35 }
 * ];
 * const collection = loadObject(users, '{ name: string, age: number }');
 * console.log(collection.length); // 2
 *
 * // Load with schema from definitions
 * const defs = new Definitions();
 * defs.set('User', compileSchema('User', '{ name: string, age: number }'));
 * const obj = loadObject(data, 'User', defs);
 *
 * // Load with inferred definitions (no explicit schema required)
 * const jsonData = { name: 'Alice', age: 28 };
 * const obj = loadObject(jsonData, undefined, { inferDefs: true });
 * ```
 */
// Overloads for backward compatibility
export function loadObject(data: any, schema?: string | Schema | Definitions, options?: LoadObjectOptions): InternetObject | Collection<InternetObject>;
export function loadObject(data: any, schemaName: string, definitions: Definitions, errors?: Error[]): InternetObject | Collection<InternetObject>;
export function loadObject(data: any, schema: string | Schema, defsOrUndefined: undefined, errors: Error[]): InternetObject | Collection<InternetObject>;
export function loadObject(
  data: any,
  schema?: string | Schema | Definitions,
  defsOrOptions?: Definitions | LoadObjectOptions,
  errors?: Error[]
): InternetObject | Collection<InternetObject> {
  let resolvedSchema: Schema | undefined;
  let definitions: Definitions | undefined;
  let options: LoadObjectOptions | undefined;

  // Determine what the third parameter is
  if (defsOrOptions instanceof Definitions) {
    definitions = defsOrOptions;
  } else if (defsOrOptions && typeof defsOrOptions === 'object' && !(defsOrOptions instanceof Definitions)) {
    options = defsOrOptions as LoadObjectOptions;
  }

  // Resolve schema from explicit argument
  if (typeof schema === 'string') {
    // Check if it's a schema reference in definitions
    if (definitions && definitions.get(schema)) {
      resolvedSchema = definitions.get(schema) as Schema;
    } else {
      // Compile as IO text
      resolvedSchema = compileSchema('_temp', schema);
    }
  } else if (schema instanceof Schema) {
    resolvedSchema = schema;
  } else if (schema instanceof Definitions) {
    definitions = schema;
    // If schema is Definitions, try to get default schema
    resolvedSchema = schema.defaultSchema || undefined;
  }

  // If inferDefs option is set, infer definitions from data
  if (!resolvedSchema && options?.inferDefs) {
    const inferred = inferDefs(data);
    resolvedSchema = inferred.rootSchema;
    definitions = inferred.definitions;
  }

  if (!resolvedSchema) {
    throw new Error("No schema provided or found in definitions. Use { inferDefs: true } to infer definitions from data.");
  }

  // Determine if data is an array (collection) or object
  if (Array.isArray(data)) {
    return loadCollection(data, resolvedSchema, definitions, errors);
  } else {
    return processObject(data, resolvedSchema, definitions);
  }
}

/**
 * Options for loadDoc function
 */
export interface LoadDocOptions {
  /**
   * When true, infers definitions (schemas) from the input data structure.
   * This allows loading JSON data without explicitly providing a schema.
   *
   * The inferred definitions will include:
   * - `$schema` for the root object (default schema)
   * - Named schemas like `$borrowedBy`, `$membershipType` for nested objects
   *
   * @default false
   */
  inferDefs?: boolean;
}

/**
 * Load plain JavaScript data into a complete IODocument with header and sections.
 *
 * This function creates a full document structure that can be stringified with
 * schema definitions in the header. Use this when you need the complete IO format
 * with definitions output.
 *
 * @param data - Plain JavaScript object or array to loadObject
 * @param schema - Schema definition (IO text, Schema object, or Definitions object)
 * @param options - Optional loadObject options (including inferDefs)
 * @returns Complete IODocument with header containing definitions
 *
 * @example
 * ```typescript
 * // Load JSON with inferred definitions
 * const jsonData = { name: 'Alice', age: 28, address: { city: 'NYC' } };
 * const doc = loadDoc(jsonData, undefined, { inferDefs: true });
 * const ioText = stringify(doc);
 * // Output:
 * // ~ $address: {city: string}
 * // ~ $schema: {name: string, age: number, address: $address}
 * // ---
 * // ~ Alice, 28, {NYC}
 *
 * // Load with explicit schema
 * const doc = loadDoc(data, '{ name: string, age: number }');
 * ```
 */
export function loadDoc(data: any, schema?: string | Schema | Definitions, options?: LoadDocOptions): Document {
  let resolvedSchema: Schema | undefined;
  let definitions: Definitions | undefined;

  // Resolve schema from explicit argument
  if (typeof schema === 'string') {
    resolvedSchema = compileSchema('$schema', schema);
    definitions = new Definitions();
    definitions.push('$schema', resolvedSchema, true, false);
  } else if (schema instanceof Schema) {
    resolvedSchema = schema;
    definitions = new Definitions();
    definitions.push('$schema', resolvedSchema, true, false);
  } else if (schema instanceof Definitions) {
    definitions = schema;
    resolvedSchema = schema.defaultSchema || undefined;
  }

  // If inferDefs option is set, infer definitions from data
  if (!resolvedSchema && options?.inferDefs) {
    const inferred = inferDefs(data);
    resolvedSchema = inferred.rootSchema;
    definitions = inferred.definitions;
  }

  if (!resolvedSchema || !definitions) {
    throw new Error("No schema provided or found in definitions. Use { inferDefs: true } to infer definitions from data.");
  }

  // Create header with definitions
  const header = new Header();
  header.definitions.merge(definitions, true);
  header.schema = resolvedSchema;

  // Load the data
  let loadedData: InternetObject | Collection<InternetObject>;
  if (Array.isArray(data)) {
    loadedData = loadCollection(data, resolvedSchema, definitions);
  } else {
    loadedData = processObject(data, resolvedSchema, definitions);
  }

  // Create section
  const section = new Section(loadedData, undefined, '$schema');
  const sections = new SectionCollection();
  sections.push(section);

  // Create and return document
  return new Document(header, sections);
}
