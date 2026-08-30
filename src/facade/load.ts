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
import ValidationError from '../errors/io-validation-error';
import { IOCommonOptions } from './options';
import { resolveSchema } from './resolve-schema';
import { ErrorSink, isErrorSink, report, withSink } from './error-sink';

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


/**
 * Reads the trailing arguments of the load family: `(data, defs?, sink?, options?)`.
 *
 * §2.5 (ADR 0005) moved the sink into slot three, where `parse` has always had it. Before this,
 * slot three was an options object — so `load(data, defs, errors)` put the array where the options
 * were expected, found no `schemaName` on it, and reported nothing. Silently. That is the same
 * positional trap that made `parse(text, errorArray)` collect nothing, and it is worth closing on
 * both.
 *
 * **The old shape still works.** A sink is an array or a function and an options object is neither,
 * so an options object in slot three is unambiguous and is still read as options. It is deprecated,
 * not broken.
 */
function readArgs(
  a?: Definitions | ErrorSink | IOCommonOptions | null,
  b?: ErrorSink | IOCommonOptions,
  c?: IOCommonOptions
): { defs?: Definitions; sink?: ErrorSink; options?: IOCommonOptions } {
  let defs: Definitions | undefined;
  let sink: ErrorSink | undefined;
  let options: IOCommonOptions | undefined;

  if (a instanceof Definitions) defs = a;
  else if (isErrorSink(a)) sink = a as ErrorSink;
  else if (a && typeof a === 'object') options = a as IOCommonOptions;

  if (isErrorSink(b)) sink = b as ErrorSink;
  else if (b && typeof b === 'object') options = b as IOCommonOptions;   // deprecated slot

  if (c) options = c;

  // `errorCollector` was the option that did this job before there was a slot for it. The sink
  // wins where both are given; neither is silently ignored.
  if (!sink && options?.errorCollector) sink = options.errorCollector;

  return { defs, sink, options };
}

/** Options for `loadObject` — see {@link IOCommonOptions} (shared, declared once — R8). */
export type LoadObjectOptions = IOCommonOptions;

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
// Overloads for loadObject — (data, defs?, sink?, options?), like every sibling
export function loadObject(data: object): InternetObject;
export function loadObject(data: object, defs: Definitions | null): InternetObject;
export function loadObject(data: object, options: LoadObjectOptions): InternetObject;
export function loadObject(data: object, defs: Definitions | null, sink: ErrorSink): InternetObject;
export function loadObject(data: object, defs: Definitions | null, sink: ErrorSink, options: LoadObjectOptions): InternetObject;
/** @deprecated Options in slot three. Pass the sink there and options in slot four (§2.5). */
export function loadObject(data: object, defs: Definitions | null, options: LoadObjectOptions): InternetObject;
export function loadObject(
  data: object,
  defsOrSinkOrOptions?: Definitions | ErrorSink | LoadObjectOptions | null,
  sinkOrOptions?: ErrorSink | LoadObjectOptions,
  maybeOptions?: LoadObjectOptions
): InternetObject {
  const { defs: definitions, sink, options } = readArgs(defsOrSinkOrOptions, sinkOrOptions, maybeOptions);

  // Resolve schema uniformly — one primitive, one failure mode (R8).
  const resolvedSchema = resolveSchema(definitions, options?.schemaName);

  // Validate that data is an object, not an array
  if (Array.isArray(data)) {
    throw new ValidationError(ErrorCodes.expectedObject, `loadObject expects an object, not an array. Use loadCollection for arrays.`);
  }

  // Schema-less mode: if no schema, load without validation
  if (!resolvedSchema) {
    return createSchemalessObject(data);
  }

  if (!sink) return processObject(data, resolvedSchema, definitions);

  // With a sink, nothing throws. The object comes back EMPTY and carrying the error, rather than
  // carrying the data that failed: a schema-bearing object may not hold what its schema forbids
  // (B1), and handing back the raw input under an attached schema would be exactly that.
  return withSink(sink, () => {
    try {
      return processObject(data, resolvedSchema, definitions);
    } catch (error) {
      report(sink, error as Error);
      const failed = new InternetObject();
      failed.errors.push(error as Error);
      return failed;
    }
  });
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
// Overloads for loadCollection — (data, defs?, sink?, options?)
export function loadCollection(data: any[]): Collection<InternetObject>;
export function loadCollection(data: any[], defs: Definitions | null): Collection<InternetObject>;
export function loadCollection(data: any[], options: LoadCollectionOptions): Collection<InternetObject>;
export function loadCollection(data: any[], defs: Definitions | null, sink: ErrorSink): Collection<InternetObject>;
export function loadCollection(data: any[], defs: Definitions | null, sink: ErrorSink, options: LoadCollectionOptions): Collection<InternetObject>;
/** @deprecated Options in slot three. Pass the sink there and options in slot four (§2.5). */
export function loadCollection(data: any[], defs: Definitions | null, options: LoadCollectionOptions): Collection<InternetObject>;
export function loadCollection(
  data: any[],
  defsOrSinkOrOptions?: Definitions | ErrorSink | LoadCollectionOptions | null,
  sinkOrOptions?: ErrorSink | LoadCollectionOptions,
  maybeOptions?: LoadCollectionOptions
): Collection<InternetObject> {
  const { defs: definitions, sink, options } = readArgs(defsOrSinkOrOptions, sinkOrOptions, maybeOptions);

  // Validate that data is an array
  if (!Array.isArray(data)) {
    throw new ValidationError(ErrorCodes.expectedArray, `loadCollection expects an array. Use loadObject for single objects.`);
  }

  // Resolve schema uniformly — one primitive, one failure mode (R8).
  const resolvedSchema = resolveSchema(definitions, options?.schemaName);

  // Schema-less mode: if no schema, load without validation
  if (!resolvedSchema) {
    return createSchemalessCollection(data);
  }

  return withSink(sink, (bag) => processCollection(data, resolvedSchema, definitions, bag));
}

/** Options for `load` — see {@link IOCommonOptions} (shared, declared once — R8). */
export type LoadOptions = IOCommonOptions;

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
// Overloads for load — (data, defs?, sink?, options?)
export function load(data: any): Document;
export function load(data: any, defs: Definitions | null): Document;
export function load(data: any, options: LoadOptions): Document;
export function load(data: any, defs: Definitions | null, sink: ErrorSink): Document;
export function load(data: any, defs: Definitions | null, sink: ErrorSink, options: LoadOptions): Document;
/** @deprecated Options in slot three. Pass the sink there and options in slot four (§2.5). */
export function load(data: any, defs: Definitions | null, options: LoadOptions): Document;
export function load(
  data: any,
  defsOrSinkOrOptions?: Definitions | ErrorSink | LoadOptions | null,
  sinkOrOptions?: ErrorSink | LoadOptions,
  maybeOptions?: LoadOptions
): Document {
  const { defs: definitions, sink, options: resolvedOptions } = readArgs(defsOrSinkOrOptions, sinkOrOptions, maybeOptions);

  // Resolve schema uniformly — one primitive, one failure mode (R8).
  const resolvedSchema = resolveSchema(definitions, resolvedOptions?.schemaName);

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
    loadedData = withSink(sink, (bag) => processCollection(data, resolvedSchema, definitions, bag));
  } else if (!sink) {
    loadedData = processObject(data, resolvedSchema, definitions);
  } else {
    // Same rule as `loadObject`: with a sink nothing throws, and the failure is reported rather
    // than stored. The document then carries the error on itself, so `doc.errors` and the sink
    // agree — which is the C1a rule, reaching the load route.
    loadedData = withSink(sink, () => {
      try {
        return processObject(data, resolvedSchema, definitions);
      } catch (error) {
        report(sink, error as Error);
        const failed = new InternetObject();
        failed.errors.push(error as Error);
        return failed;
      }
    });
  }

  // Create section
  const section = new Section(loadedData, undefined, '$schema');
  const sections = new SectionCollection();
  sections.push(section);

  // Create and return document
  return new Document(header, sections);
}
