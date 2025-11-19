import Document from '../core/document';
import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import Collection from '../core/collection';
import Section from '../core/section';
import TypedefRegistry from '../schema/typedef-registry';
import MemberDef from '../schema/types/memberdef';
import { stringifyMemberDef } from '../schema/types/memberdef-stringify';
import { stringify } from './stringify';
import { StringifyOptions } from './stringify';
import { IO_MARKERS, RESERVED_SECTION_NAMES, WILDCARD_KEY } from './serialization-constants';

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
   * Include section names after '---' (e.g., '--- users')
   * Default: true
   */
  includeSectionNames?: boolean;

  /**
   * Include only specific sections (by name)
   * If not provided, includes all sections
   */
  sectionsFilter?: string[];

  /**
   * Format for definitions in header
   * - 'io': Internet Object format (~ key: value)
   * Default: 'io'
   */
  definitionsFormat?: 'io';
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
  const defFormat = options.definitionsFormat ?? 'io';

  // Stringify header (includes definitions, schemas, variables)
  if (includeHeader && doc.header) {
    // Check if we're in schema-only mode (just $schema, no other definitions)
    const isSchemaOnlyMode = doc.header.definitions?.defaultSchemaOnly ?? false;

    if (isSchemaOnlyMode && doc.header.schema) {
      // Schema-only mode: output bare schema line (backward compatible)
      const schemaText = stringifySchema(doc.header.schema, { ...options, includeTypes: true });
      if (schemaText) {
        parts.push(schemaText);
      }
    } else if (doc.header.definitions && doc.header.definitions.length > 0) {
      // Definitions mode: output all definitions (schemas, variables, metadata) in ~ format
      const headerText = stringifyHeader(doc.header, defFormat, options);
      if (headerText) {
        parts.push(headerText);
      }
    } else if (doc.header.schema) {
      // No definitions but has schema: output bare schema line
      const schemaText = stringifySchema(doc.header.schema, { ...options, includeTypes: true });
      if (schemaText) {
        parts.push(schemaText);
      }
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

      // Add section separator with optional name and schema
      // Note: Don't output schema reference for default schema ($schema) - it's implicit from header
      const isDefaultSchema = section.schemaName === '$schema' || section.schemaName === 'schema';
      const hasNamedSchema = section.schemaName && !isDefaultSchema;
      // Treat reserved names as no name (parser defaults)
      const hasRealName = section.name && !RESERVED_SECTION_NAMES.has(section.name);

      if (includeSectionNames && hasRealName) {
        if (hasNamedSchema) {
          // Include schema reference if section has a named schema
          // Schema name might already start with $ - don't duplicate it
          const schemaRef = section.schemaName!.startsWith('$') ? section.schemaName : `$${section.schemaName}`;
          parts.push(`--- ${section.name}: ${schemaRef}`);
        } else {
          parts.push(`--- ${section.name}`);
        }
      } else if (hasNamedSchema) {
        // No section name but has named schema - output schema only
        const schemaRef = section.schemaName!.startsWith('$') ? section.schemaName : `$${section.schemaName}`;
        parts.push(`--- ${schemaRef}`);
      } else if (hasRealName) {
        // Has name but no schema - output just ---
        parts.push('---');
      } else {
        // No real name - output bare section separator
        parts.push('---');
      }

      // Stringify section data
      // Always suppress type annotations inside data rows (positional output), regardless of includeTypes
      const sectionText = stringifySection(section, doc.header.definitions, { ...options, includeTypes: false });
      if (sectionText) {
        parts.push(sectionText);
      }
    }
  }

  return parts.join('\n');
}

/**
 * Stringify a schema to IO format
 */
function stringifySchema(schema: any, options: StringifyOptions): string {
  if (!schema || !schema.names || schema.names.length === 0) return '';

  const includeTypes = options.includeTypes ?? false;
  const parts: string[] = [];

  for (const name of schema.names) {
    const memberDef: MemberDef = schema.defs[name];
    if (!memberDef) continue;

    // Build field definition starting with the name
    let fieldDef = name;

    // Add optional marker (?) if the field is optional
    if (memberDef.optional) {
      fieldDef += '?';
    }

    // Add null marker (*) if the field is nullable
    if (memberDef.null) {
      fieldDef += '*';
    }

    // Delegate to stringifyMemberDef for type annotation
    const typeAnnotation = stringifyMemberDef(memberDef, includeTypes);
    if (typeAnnotation) {
      fieldDef += `: ${typeAnnotation}`;
    }

    parts.push(fieldDef);
  }

  // Append wildcard open schema definition if present
  if (schema.defs && schema.defs[WILDCARD_KEY]) {
    const openDef: MemberDef = schema.defs[WILDCARD_KEY];
    let wildcard = WILDCARD_KEY;
    const typeAnnotation = stringifyMemberDef(openDef, includeTypes);
    if (typeAnnotation) {
      wildcard += `:${typeAnnotation}`;
    }
    parts.push(wildcard);
  }

  return parts.join(', ');
}

/**
 * Stringify document header with definitions
 */
function stringifyHeader(
  header: any,
  format: 'io',
  options: StringifyOptions
): string {
  if (!header.definitions) return '';

  const defs = header.definitions;
  const defParts: string[] = [];

  // Iterate through all definitions: schemas, variables, and metadata
  for (const [key, defValue] of defs.entries()) {
    let formattedValue: string;

    // Schema definitions: Format as ~ $schema: {name, age, address}
    if (defValue.isSchema) {
      const schemaValue = defValue.value;
      // Use stringifySchema to format the schema structure
      const schemaText = stringifySchema(schemaValue, { ...options, includeTypes: true });
      formattedValue = schemaText ? `{${schemaText}}` : '{}';
    }
    // Variables and regular definitions: Format as ~ key: value
    else {
      let value = defValue.value;
      // If value is a TokenNode, extract its actual value
      if (value && typeof value === 'object' && 'value' in value && 'type' in value) {
        value = value.value;
      }
      formattedValue = stringifyHeaderValue(value);
    }

    defParts.push(`~ ${key}: ${formattedValue}`);
  }

  if (defParts.length === 0) return '';

  return defParts.join('\n');
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

  // Collections should be serialized using IO '~' items for parser compatibility
  if (data instanceof Collection) {
    const lines: string[] = [];
    for (const item of data) {
      if (options.skipErrors && item && typeof item === 'object' && (item as any).__error === true) {
        continue;
      }
      if (item instanceof InternetObject) {
        const line = stringify(item, schema, defs, options);
        lines.push(`~ ${line}`);
      } else {
        // Fallback for non-IO items
        lines.push(`~ ${JSON.stringify(item)}`);
      }
    }
    return lines.join('\n');
  }

  // Single object/value: use main stringify
  return stringify(data, schema, defs, options);
}

/**
 * Infer the Internet Object type from a JavaScript value.
 * Maps JS types to IO type names for TypedefRegistry lookup.
 * Only handles JSON-compatible types plus Date.
 *
 * @throws Error for non-serializable types (bigint, symbol, function, etc.)
 */
function inferIOType(value: any): string {
  // null/undefined
  if (value === null || value === undefined) {
    throw new Error(`Cannot serialize null/undefined values in header definitions`);
  }

  // JSON primitive types
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`Cannot serialize non-finite number: ${value}`);
    }
    return 'number';
  }
  if (typeof value === 'string') return 'string';

  // Date/DateTime (IO extension to JSON)
  if (value instanceof Date) return 'date';

  // JSON array
  if (Array.isArray(value)) return 'array';

  // JSON object (plain objects only)
  if (typeof value === 'object' && value.constructor === Object) return 'object';

  // Non-serializable types
  const type = typeof value;
  if (type === 'bigint' || type === 'symbol' || type === 'function') {
    throw new Error(`Cannot serialize type '${type}' in header definitions`);
  }

  // Unknown object types (class instances, etc.)
  throw new Error(`Cannot serialize non-plain object of type '${value.constructor?.name || 'Unknown'}' in header definitions`);
}

/**
 * Stringify a header definition value using the type system.
 * Infers the IO type and delegates to the appropriate TypeDef.stringify().
 *
 * @throws Error for non-serializable types or unregistered types
 */
function stringifyHeaderValue(value: any): string {
  // Handle null/undefined - these are not allowed in header definitions
  // Use empty string or default value if needed
  if (value === null || value === undefined) {
    throw new Error(`Header definition values cannot be null or undefined`);
  }

  // Infer the IO type from the JS value (throws for non-serializable types)
  const ioType = inferIOType(value);

  // Check if type is registered and get the TypeDef
  if (!TypedefRegistry.isRegisteredType(ioType)) {
    throw new Error(`Type '${ioType}' is not registered in TypedefRegistry`);
  }

  const typeDef = TypedefRegistry.get(ioType);

  if (!typeDef || !('stringify' in typeDef) || typeof typeDef.stringify !== 'function') {
    throw new Error(`TypeDef for '${ioType}' does not have a stringify method`);
  }

  // Create a minimal MemberDef for the TypeDef.stringify() call
  const memberDef: MemberDef = {
    type: ioType,
    path: '',
    optional: false,
    null: false,
    // Use auto format for strings - will quote when needed to preserve type
    format: ioType === 'string' ? 'auto' : undefined,
    escapeLines: false,
    encloser: '"'
  } as any;

  return (typeDef.stringify as any)(value, memberDef);
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
