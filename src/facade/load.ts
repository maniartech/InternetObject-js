import Definitions from '../core/definitions';
import Document from '../core/document';
import Header from '../core/header';
import Section from '../core/section';
import SectionCollection from '../core/section-collection';
import InternetObject from '../core/internet-object';
import Collection from '../core/collection';
import Schema from '../schema/schema';
import { loadObject as processObject, loadCollection as processCollection } from '../schema/load-processor';
import IOError from '../errors/io-error';
import ErrorCodes from '../errors/io-error-codes';

/**
 * Creates an InternetObject from plain data without schema validation.
 * Used for schema-less loading mode.
 */
function createSchemalessObject(data: any): InternetObject {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    // For non-object values, wrap in IOObject with a value key
    const obj = new InternetObject();
    obj.push(data);
    return obj;
  }
  return new InternetObject(data);
}

/**
 * Creates a Collection of InternetObjects from plain array data without schema validation.
 * Used for schema-less loading mode.
 */
function createSchemalessCollection(dataArray: any[]): Collection<InternetObject> {
  const collection = new Collection<InternetObject>();
  for (const item of dataArray) {
    collection.push(createSchemalessObject(item));
  }
  return collection;
}

export interface LoadObjectOptions {
  /**
   * The name of the schema to use from definitions.
   * If provided, the schema will be looked up by this name in the definitions.
   * If not provided, uses `defs.defaultSchema` (`$schema`).
   *
   * @example
   * ```typescript
   * const defs = parseDefinitions('~ $User: { name, age }');
   * const obj = loadObject(data, defs, { schemaName: '$User' });
   * ```
   */
  schemaName?: string;

  /**
   * When true, throws on first validation error.
   * When false (default), continues processing and collects errors.
   * @default false
   */
  strict?: boolean;

  /**
   * Array to collect validation errors instead of throwing.
   * Useful for processing collections where some items may be invalid.
   */
  errorCollector?: Error[];
}

/**
 * Load and validate plain JavaScript data according to an Internet Object schema.
 *
 * This is the high-level API for validating external data (from APIs, databases, etc.)
 * using Internet Object schemas. Unlike parse(), which processes IO text,
 * loadObject() validates plain JavaScript objects.
 *
 * @param data - Plain JavaScript object or array to validate
 * @param defs - Definitions object containing schemas
 * @param options - LoadObjectOptions (schemaName, strict, errorCollector)
 * @returns Validated InternetObject or Collection
 * @throws ValidationError if data doesn't conform to schema
 *
 * @example
 * ```typescript
 * // Schema-less (no validation, just wrap in InternetObject)
 * const obj = loadObject({ name: 'Alice', age: 28 });
 *
 * // Load with definitions (uses $schema as default)
 * const defs = parseDefinitions('~ $schema: { name: string, age: int }');
 * const obj = loadObject(data, defs);
 *
 * // Load with specific schema name from definitions
 * const defs = parseDefinitions('~ $User: { name, age }');
 * const obj = loadObject(data, defs, { schemaName: '$User' });
 * ```
 */
// Overloads for loadObject
export function loadObject(data: object): InternetObject;
export function loadObject(data: object, defs: Definitions): InternetObject;
export function loadObject(data: object, options: LoadObjectOptions): InternetObject;
export function loadObject(data: object, defs: Definitions, options: LoadObjectOptions): InternetObject;
export function loadObject(
  data: object,
  defsOrOptions?: Definitions | LoadObjectOptions,
  options?: LoadObjectOptions
): InternetObject {
  let resolvedSchema: Schema | undefined;
  let definitions: Definitions | undefined;
  let resolvedOptions: LoadObjectOptions | undefined;

  // Parse arguments: handle (data), (data, defs), (data, options), (data, defs, options)
  if (defsOrOptions instanceof Definitions) {
    definitions = defsOrOptions;
    resolvedOptions = options;
  } else if (defsOrOptions && typeof defsOrOptions === 'object') {
    // Second param is options
    resolvedOptions = defsOrOptions as LoadObjectOptions;
  }

  // Resolve schema: by name from options, or default from definitions
  if (definitions) {
    if (resolvedOptions?.schemaName) {
      resolvedSchema = definitions.get(resolvedOptions.schemaName) as Schema | undefined;
      if (!resolvedSchema) {
        throw new IOError(ErrorCodes.schemaNotFound, `Schema '${resolvedOptions.schemaName}' not found in definitions.`);
      }
    } else {
      resolvedSchema = definitions.defaultSchema || undefined;
    }
  }

  // Validate that data is an object, not an array
  if (Array.isArray(data)) {
    throw new IOError(ErrorCodes.expectedObject, `loadObject expects an object, not an array. Use loadCollection for arrays.`);
  }

  // Schema-less mode: if no schema, load without validation
  if (!resolvedSchema) {
    return createSchemalessObject(data);
  }

  return processObject(data, resolvedSchema, definitions);
}

/**
 * Options for loadCollection function (same as LoadOptions)
 */
export type LoadCollectionOptions = LoadOptions;

/**
 * Load JS array (no Document wrapper).
 *
 * @param data - Array of plain JavaScript objects to validate
 * @param defs - Definitions object containing schemas
 * @param options - LoadCollectionOptions (schemaName, strict, errorCollector)
 * @returns Collection of validated InternetObjects
 *
 * @example
 * ```typescript
 * // Schema-less (no validation)
 * const col = loadCollection([{ name: 'Alice' }, { name: 'Bob' }]);
 *
 * // With definitions (validates each item against $schema)
 * const col = loadCollection(data, defs);
 *
 * // With specific schema from definitions
 * const col = loadCollection(users, defs, { schemaName: '$User' });
 * ```
 */
// Overloads for loadCollection
export function loadCollection(data: any[]): Collection<InternetObject>;
export function loadCollection(data: any[], defs: Definitions): Collection<InternetObject>;
export function loadCollection(data: any[], options: LoadCollectionOptions): Collection<InternetObject>;
export function loadCollection(data: any[], defs: Definitions, options: LoadCollectionOptions): Collection<InternetObject>;
export function loadCollection(
  data: any[],
  defsOrOptions?: Definitions | LoadCollectionOptions,
  options?: LoadCollectionOptions
): Collection<InternetObject> {
  let resolvedSchema: Schema | undefined;
  let definitions: Definitions | undefined;
  let resolvedOptions: LoadCollectionOptions | undefined;

  // Parse arguments: handle (data), (data, defs), (data, options), (data, defs, options)
  if (defsOrOptions instanceof Definitions) {
    definitions = defsOrOptions;
    resolvedOptions = options;
  } else if (defsOrOptions && typeof defsOrOptions === 'object') {
    // Second param is options
    resolvedOptions = defsOrOptions as LoadCollectionOptions;
  }

  // Validate that data is an array
  if (!Array.isArray(data)) {
    throw new IOError(ErrorCodes.expectedArray, `loadCollection expects an array. Use loadObject for single objects.`);
  }

  // Resolve schema: by name from options, or default from definitions
  if (definitions) {
    if (resolvedOptions?.schemaName) {
      resolvedSchema = definitions.get(resolvedOptions.schemaName) as Schema | undefined;
      if (!resolvedSchema) {
        throw new IOError(ErrorCodes.schemaNotFound, `Schema '${resolvedOptions.schemaName}' not found in definitions.`);
      }
    } else {
      resolvedSchema = definitions.defaultSchema || undefined;
    }
  }

  // Schema-less mode: if no schema, load without validation
  if (!resolvedSchema) {
    return createSchemalessCollection(data);
  }

  return processCollection(data, resolvedSchema, definitions, resolvedOptions?.errorCollector);
}

/**
 * Options for load function
 */
export interface LoadOptions {
  /**
   * The name of the schema to use from definitions.
   * If provided, the schema will be looked up by this name in the definitions.
   * If not provided, uses `defs.defaultSchema` (`$schema`).
   *
   * @example
   * ```typescript
   * const defs = parseDefinitions('~ $User: { name, age }');
   * const doc = load(data, defs, { schemaName: '$User' });
   * ```
   */
  schemaName?: string;

  /**
   * When true, throws on first validation error.
   * When false (default), continues processing and collects errors.
   * @default false
   */
  strict?: boolean;

  /**
   * Array to collect validation errors instead of throwing.
   * Useful for processing collections where some items may be invalid.
   */
  errorCollector?: Error[];
}

/**
 * Load plain JavaScript data into a complete IODocument with header and sections.
 *
 * This function creates a full document structure that can be stringified with
 * schema definitions in the header. Use this when you need the complete IO format
 * with definitions output.
 *
 * @param data - Plain JavaScript object or array to load
 * @param defs - Definitions object containing schemas
 * @param options - LoadOptions (schemaName, strict, errorCollector)
 * @returns Complete IODocument with header containing definitions
 *
 * @example
 * ```typescript
 * // Schema-less (no validation)
 * const doc = load(data);
 *
 * // Load with definitions (uses $schema as default)
 * const defs = parseDefinitions('~ $schema: { name, age, address: $address }');
 * const doc = load(data, defs);
 *
 * // Load with specific schema name
 * const defs = parseDefinitions('~ $User: { name, age }');
 * const doc = load(data, defs, { schemaName: '$User' });
 * ```
 */
// Overloads for load
export function load(data: any): Document;
export function load(data: any, defs: Definitions): Document;
export function load(data: any, options: LoadOptions): Document;
export function load(data: any, defs: Definitions, options: LoadOptions): Document;
export function load(
  data: any,
  defsOrOptions?: Definitions | LoadOptions,
  options?: LoadOptions
): Document {
  let resolvedSchema: Schema | undefined;
  let definitions: Definitions | undefined;
  let resolvedOptions: LoadOptions | undefined;

  // Parse arguments: handle (data), (data, defs), (data, options), (data, defs, options)
  if (defsOrOptions instanceof Definitions) {
    definitions = defsOrOptions;
    resolvedOptions = options;
  } else if (defsOrOptions && typeof defsOrOptions === 'object') {
    // Second param is options
    resolvedOptions = defsOrOptions as LoadOptions;
  }

  // Resolve schema: by name from options, or default from definitions
  if (definitions) {
    if (resolvedOptions?.schemaName) {
      resolvedSchema = definitions.get(resolvedOptions.schemaName) as Schema | undefined;
      if (!resolvedSchema) {
        throw new IOError(ErrorCodes.schemaNotFound, `Schema '${resolvedOptions.schemaName}' not found in definitions.`);
      }
    } else {
      resolvedSchema = definitions.defaultSchema || undefined;
    }
  }

  // Create header with definitions (if available)
  const header = new Header();
  if (definitions) {
    header.definitions.merge(definitions, true);
  }
  if (resolvedSchema) {
    header.schema = resolvedSchema;
  }

  // Load the data
  let loadedData: InternetObject | Collection<InternetObject>;
  if (!resolvedSchema) {
    // Schema-less mode: load without validation
    if (Array.isArray(data)) {
      loadedData = createSchemalessCollection(data);
    } else {
      loadedData = createSchemalessObject(data);
    }
  } else if (Array.isArray(data)) {
    loadedData = processCollection(data, resolvedSchema, definitions, resolvedOptions?.errorCollector);
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
