import Document from '../core/document';
import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import Collection from '../core/collection';
import Section from '../core/section';
import { stringify } from './stringify';
import { StringifyOptions } from './stringify';

/**
 * Options for stringifying documents
 */
export interface StringifyDocumentOptions extends StringifyOptions {
  /**
   * Include header section with definitions
   * Default: true (includes if header has definitions)
   */
  includeHeader?: boolean;

  /**
   * Include section names/separators
   * Default: true
   */
  includeSectionNames?: boolean;

  /**
   * Section separator string
   * Default: '---'
   */
  sectionSeparator?: string;

  /**
   * Header separator string
   * Default: '---'
   */
  headerSeparator?: string;

  /**
   * Include only specific sections (by name)
   * If not provided, includes all sections
   */
  sectionsFilter?: string[];

  /**
   * Format for definitions in header
   * - 'io': Internet Object format (~ key: value)
   * - 'json': JSON format
   * Default: 'io'
   */
  definitionsFormat?: 'io' | 'json';
}

/**
 * Stringify a complete IODocument to Internet Object text format.
 *
 * This function serializes the entire document structure including:
 * - Header with definitions and schema
 * - All data sections
 * - Section separators and names
 *
 * @param doc - IODocument to stringify
 * @param options - Formatting and filtering options
 * @returns Internet Object text representation
 *
 * @example
 * ```typescript
 * // Stringify document with default options
 * const text = stringifyDocument(doc);
 * // Output:
 * // ~ appName: MyApp, ~ version: 1.0
 * // ---
 * // Alice, 28
 * // Bob, 35
 *
 * // Stringify with pretty printing
 * const text = stringifyDocument(doc, { indent: 2 });
 *
 * // Stringify specific sections only
 * const text = stringifyDocument(doc, {
 *   sectionsFilter: ['users', 'products']
 * });
 *
 * // Stringify without header
 * const text = stringifyDocument(doc, { includeHeader: false });
 * ```
 */
export function stringifyDocument(
  doc: Document,
  options: StringifyDocumentOptions = {}
): string {
  const parts: string[] = [];
  const includeHeader = options.includeHeader ?? true;
  const includeSectionNames = options.includeSectionNames ?? true;
  const sectionSeparator = options.sectionSeparator ?? '---';
  const headerSeparator = options.headerSeparator ?? '---';
  const defFormat = options.definitionsFormat ?? 'io';

  // Stringify header if requested and has content
  if (includeHeader && doc.header) {
    const headerText = stringifyHeader(doc.header, defFormat, options);
    if (headerText) {
      parts.push(headerText);
      parts.push(headerSeparator);
    }
  }

  // Stringify sections
  if (doc.sections) {
    const sectionCount = doc.sections.length;
    const sectionsFilter = options.sectionsFilter;

    for (let i = 0; i < sectionCount; i++) {
      const section = doc.sections.get(i);
      if (!section) continue;

      // Apply section filter if provided
      if (sectionsFilter && section.name) {
        if (!sectionsFilter.includes(section.name)) {
          continue;
        }
      }

      // Add section name if named and requested
      if (includeSectionNames && section.name) {
        parts.push(`# ${section.name}`);
      }

      // Stringify section data
      const sectionText = stringifySection(section, doc.header.definitions, options);
      if (sectionText) {
        parts.push(sectionText);
      }

      // Add section separator between sections (but not after the last one)
      if (i < sectionCount - 1) {
        parts.push('');  // Empty line between sections
      }
    }
  }

  return parts.join('\n');
}

/**
 * Stringify document header with definitions
 */
function stringifyHeader(
  header: any,
  format: 'io' | 'json',
  options: StringifyOptions
): string {
  if (!header.definitions) return '';

  const defs = header.definitions;
  const defParts: string[] = [];

  // Iterate through definitions
  for (const [key, defValue] of defs.entries()) {
    // Skip schemas and variables in header output (they're internal)
    if (defValue.isSchema || defValue.isVariable) {
      continue;
    }

    if (format === 'io') {
      // IO format: ~ key: value
      const value = stringifyValue(defValue.value, options);
      defParts.push(`~ ${key}: ${value}`);
    } else {
      // JSON format: "key": value
      defParts.push(`"${key}": ${JSON.stringify(defValue.value)}`);
    }
  }

  if (defParts.length === 0) return '';

  if (format === 'json') {
    return '{' + defParts.join(', ') + '}';
  }

  return defParts.join(', ');
}

/**
 * Stringify a section's data
 */
function stringifySection(
  section: Section,
  defs: Definitions,
  options: StringifyOptions
): string {
  const data = section.data;

  if (!data) return '';

  // Get schema for this section
  const schemaName = section.schemaName;
  const schema = schemaName ? defs.getV(schemaName) : defs.defaultSchema;

  // Use main stringify function
  return stringify(data, schema, defs, options);
}

/**
 * Helper to stringify a value
 */
function stringifyValue(value: any, options: StringifyOptions): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'T' : 'F';
  if (value instanceof Date) return value.toISOString();

  // For complex objects, use JSON
  return JSON.stringify(value);
}

/**
 * Convert document to plain JavaScript object (for JSON serialization)
 *
 * @param doc - IODocument to convert
 * @param options - Conversion options
 * @returns Plain JavaScript object
 *
 * @example
 * ```typescript
 * const obj = documentToObject(doc, { skipErrors: true });
 * const json = JSON.stringify(obj, null, 2);
 * ```
 */
export function documentToObject(
  doc: Document,
  options?: { skipErrors?: boolean }
): any {
  return doc.toJSON(options);
}

/**
 * Create document from plain JavaScript object
 * Alias for loadDocument for consistency
 *
 * @param data - Plain JavaScript object
 * @param options - Load options
 * @returns IODocument
 */
export { loadDocument as documentFromObject } from './load-document';
