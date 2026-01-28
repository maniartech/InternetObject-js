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
import { inferDefs } from '../schema/utils/defs-inferrer';
import { loadObject as processObject, loadCollection as processCollection } from '../schema/load-processor';

/**
 * Options for loadInferred function
 */
export interface LoadInferredOptions {
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
  // Infer definitions from the data structure
  const { definitions, rootSchema } = inferDefs(data);

  // Create header with inferred definitions
  const header = new Header();
  header.definitions.merge(definitions, true);
  header.schema = rootSchema;

  // Load the data using the inferred schema
  let loadedData: InternetObject | Collection<InternetObject>;

  if (Array.isArray(data)) {
    loadedData = processCollection(data, rootSchema, definitions, options?.errorCollector);
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
