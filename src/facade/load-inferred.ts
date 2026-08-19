/**
 * Load JS data with inferred schema into Document
 *
 * This module provides the `loadInferred` function that automatically infers
 * schema definitions from plain JavaScript data and creates a complete Document.
 *
 * Unlike `load()` which requires explicit schema definitions, `loadInferred()`
 * analyzes the structure and types of your data to generate appropriate schemas.
 *
 * @module facade/load-inferred
 */

import Document from '../core/document';
import Header from '../core/header';
import Section from '../core/section';
import SectionCollection from '../core/section-collection';
import InternetObject from '../core/internet-object';
import Collection from '../core/collection';
import { inferDefs, inferMultiSectionDefs, isMultiSectionShape, isRecordCollection, ROOT_VALUE_MEMBER } from '../schema/utils/defs-inferrer';
import { loadObject as processObject, loadCollection as processCollection } from '../schema/load-processor';
import { IOCommonOptions } from './options';

/**
 * Options for `loadInferred` — the shared options minus `schemaName` (inference derives its own schema).
 * See {@link IOCommonOptions} (shared, declared once — R8).
 */
export type LoadInferredOptions = Omit<IOCommonOptions, 'schemaName'>;

/**
 * Load plain JavaScript data with **inferred schema** into a Document.
 *
 * This function analyzes the structure of your data and automatically generates
 * appropriate schema definitions. The resulting Document includes:
 * - A header with inferred `$schema` and nested schema definitions
 * - Validated data loaded according to the inferred schema
 *
 * ## When to use `loadInferred()`
 *
 * Use this function when:
 * - You have plain JS data and want schema inference
 * - You don't have pre-defined schema definitions
 * - You want to generate IO format with proper type hints
 *
 * ## When to use `load()` instead
 *
 * Use `load()` when:
 * - You have explicit schema definitions
 * - You need to validate against a specific schema
 * - You want to use a named schema from definitions
 *
 * @param data - Plain JavaScript object or array to load
 * @param options - Optional LoadInferredOptions (strict, errorCollector)
 * @returns Complete Document with header containing inferred definitions
 *
 * @example
 * ```typescript
 * // Simple - infer schema from data
 * const data = { name: 'Alice', age: 28 };
 * const doc = loadInferred(data);
 * // doc.header.schema has inferred schema { name: string, age: int }
 * // doc.header.definitions contains $schema
 *
 * // With nested objects
 * const data = {
 *   name: 'Alice',
 *   address: { city: 'NYC', zip: '10001' }
 * };
 * const doc = loadInferred(data);
 * // doc.header.definitions contains $schema and $address
 *
 * // Load array data
 * const users = [
 *   { name: 'Alice', age: 28 },
 *   { name: 'Bob', age: 35 }
 * ];
 * const doc = loadInferred(users);
 *
 * // With error collection
 * const errors: Error[] = [];
 * const doc = loadInferred(data, { errorCollector: errors });
 * ```
 */
// Overload 1: Simple call with data only
export function loadInferred(data: any): Document;
// Overload 2: With options
export function loadInferred(data: any, options: LoadInferredOptions): Document;
export function loadInferred(
  data: any,
  options?: LoadInferredOptions
): Document {
  // Multi-section shape ({accounting: [...], sales: [...]}): infer one named, schema-bound
  // section per top-level key (`--- accounting: $accounting`) — IO's native form for grouped
  // record sets — instead of nesting everything into one section. Document.toObject keys
  // multi-section data by section name, so the value model round-trips unchanged.
  if (isMultiSectionShape(data)) {
    const { definitions, sectionSchemas } = inferMultiSectionDefs(data);
    const header = new Header();
    header.definitions.merge(definitions, true);

    const sections = new SectionCollection();
    for (const [key, arr] of Object.entries(data as Record<string, any[]>)) {
      const schemaName = sectionSchemas.get(key)!;
      const schema = definitions.getV(schemaName);
      const collection = processCollection(arr, schema, definitions, options?.errorCollector);
      sections.push(new Section(collection, key, schemaName));
    }
    return new Document(header, sections);
  }

  // Infer definitions from the data structure
  const { definitions, rootSchema } = inferDefs(data);

  // Create header with inferred definitions
  const header = new Header();
  header.definitions.merge(definitions, true);
  header.schema = rootSchema;

  // Load the data using the inferred schema
  let loadedData: InternetObject | Collection<InternetObject>;

  // The loader must read the data the same way inference described it. A root array is a
  // COLLECTION only when its items are records; an array of scalars or of arrays is instead
  // wrapped in a single `value` member, and must be handed to the object loader wrapped the same
  // way. Collection-processing it validated each ELEMENT against a schema meant for the whole
  // array, which put one error object per element into the document.
  if (isRecordCollection(data)) {
    loadedData = processCollection(data as any[], rootSchema, definitions, options?.errorCollector);
  } else if (Array.isArray(data)) {
    loadedData = processObject({ [ROOT_VALUE_MEMBER]: data }, rootSchema, definitions);
  } else {
    loadedData = processObject(data, rootSchema, definitions);
  }

  // Create section
  const section = new Section(loadedData, undefined, '$schema');
  const sections = new SectionCollection();
  sections.push(section);

  // Create and return document
  return new Document(header, sections);
}

export default loadInferred;
