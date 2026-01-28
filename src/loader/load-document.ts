import Document from '../core/document';
import Header from '../core/header';
import Section from '../core/section';
import SectionCollection from '../core/section-collection';
import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import Collection from '../core/collection';
import Schema from '../schema/schema';
import { loadObject, loadCollection } from '../schema/load-processor';
import { compileSchema } from '../schema';

/**
 * Options for loading documents
 */
export interface LoadDocumentOptions {
  /**
   * Schema to use for all sections (if not specified per section)
   */
  defaultSchema?: string | Schema;

  /**
   * Schema mapping for named sections
   * Example: { users: userSchema, products: productSchema }
   */
  sectionSchemas?: { [sectionName: string]: string | Schema };

  /**
   * External definitions to merge with document definitions
   */
  definitions?: Definitions;

  /**
   * Collect validation errors instead of throwing
   */
  errorCollector?: Error[];

  /**
   * Strict mode - throw on first error
   * Default: false (collect all errors)
   */
  strict?: boolean;
}

/**
 * Document data structure for loading
 */
export interface DocumentData {
  /**
   * Header definitions (variables, schemas, etc.)
   */
  header?: {
    definitions?: { [key: string]: any };
    schema?: string | Schema;
  };

  /**
   * Data sections - can be:
   * - Single unnamed section (data directly)
   * - Named sections ({ sectionName: data })
   */
  data?: any;

  /**
   * Alternative: explicitly named sections
   */
  sections?: { [name: string]: any };
}

/**
 * Load and validate a complete IODocument from plain JavaScript data.
 *
 * This function creates a full IODocument structure with header (definitions, schema)
 * and data sections, validating all data according to the provided schemas.
 *
 * @param data - Document data with header and sections
 * @param options - Loading options (schemas, definitions, error handling)
 * @returns Validated IODocument
 * @throws ValidationError if data doesn't conform to schemas (in strict mode)
 *
 * @example
 * ```typescript
 * // Load document with single section
 * const docData = {
 *   header: {
 *     definitions: { appName: 'MyApp', version: '1.0' }
 *   },
 *   data: [
 *     { name: 'Alice', age: 28 },
 *     { name: 'Bob', age: 35 }
 *   ]
 * };
 * const doc = loadDocument(docData, {
 *   defaultSchema: '{ name: string, age: number }'
 * });
 *
 * // Load document with multiple named sections
 * const docData = {
 *   header: {
 *     schema: userSchema
 *   },
 *   sections: {
 *     users: [{ name: 'Alice' }, { name: 'Bob' }],
 *     admins: [{ name: 'Admin' }]
 *   }
 * };
 * const doc = loadDocument(docData, {
 *   sectionSchemas: {
 *     users: userSchema,
 *     admins: adminSchema
 *   }
 * });
 *
 * // Load with error collection
 * const errors: Error[] = [];
 * const doc = loadDocument(docData, {
 *   defaultSchema: schema,
 *   errorCollector: errors,
 *   strict: false
 * });
 * console.log(`Loaded with ${errors.length} errors`);
 * ```
 */
export function loadDocument(
  data: DocumentData,
  options: LoadDocumentOptions = {}
): Document {
  const errors: Error[] = [];
  const errorCollector = options.errorCollector || errors;

  // Create header with definitions
  const header = new Header();

  // Process header definitions
  if (data.header?.definitions) {
    for (const [key, value] of Object.entries(data.header.definitions)) {
      const isSchema = key.startsWith('$');
      const isVariable = key.startsWith('@');

      // If it's a schema string, compile it
      if (isSchema && typeof value === 'string') {
        try {
          const schema = compileSchema(key, value);
          header.definitions.push(key, schema, true, false);
        } catch (error) {
          if (options.strict) throw error;
          if (error instanceof Error) errorCollector.push(error);
        }
      } else {
        header.definitions.push(key, value, isSchema, isVariable);
      }
    }
  }

  // Merge external definitions if provided
  if (options.definitions) {
    header.definitions.merge(options.definitions, false);
  }

  // Set default schema from header or options
  if (data.header?.schema) {
    const schema = resolveSchema(data.header.schema, header.definitions);
    if (schema) {
      header.schema = schema;
      header.definitions.push('$schema', schema, true, false);
    }
  } else if (options.defaultSchema) {
    const schema = resolveSchema(options.defaultSchema, header.definitions);
    if (schema) {
      header.schema = schema;
    }
  }

  // Create sections collection
  const sections = new SectionCollection();

  // Determine if we have single unnamed section or multiple named sections
  const sectionsData = data.sections || (data.data !== undefined ? { '': data.data } : {});

  // Process each section
  for (const [sectionName, sectionData] of Object.entries(sectionsData)) {
    try {
      // Determine schema for this section
      let sectionSchema: Schema | undefined;

      // 1. Try section-specific schema from options
      if (options.sectionSchemas?.[sectionName]) {
        sectionSchema = resolveSchema(options.sectionSchemas[sectionName], header.definitions);
      }

      // 2. Fall back to default schema
      if (!sectionSchema && header.schema) {
        sectionSchema = header.schema;
      }

      // 3. Try to infer from section name if it's a schema reference
      if (!sectionSchema && sectionName && sectionName.startsWith('$')) {
        sectionSchema = header.definitions.getV(sectionName);
      }

      if (!sectionSchema) {
        const error = new Error(`No schema found for section '${sectionName || 'unnamed'}'`);
        if (options.strict) throw error;
        errorCollector.push(error);
        continue;
      }

      // Load section data
      let loadedData: InternetObject | Collection<InternetObject>;

      if (Array.isArray(sectionData)) {
        loadedData = loadCollection(sectionData, sectionSchema, header.definitions, errorCollector);
      } else {
        loadedData = loadObject(sectionData, sectionSchema, header.definitions);
      }

      const section = new Section(
        loadedData,
        sectionName || undefined,
        sectionSchema.name
      );
      sections.push(section);

    } catch (error) {
      if (options.strict) throw error;
      if (error instanceof Error) errorCollector.push(error);
    }
  }

  // Create and return document
  const doc = new Document(header, sections, errors);
  return doc;
}

/**
 * Helper function to resolve schema from string or Schema object
 */
function resolveSchema(
  schema: string | Schema,
  defs: Definitions
): Schema | undefined {
  if (schema instanceof Schema) {
    return schema;
  }

  if (typeof schema === 'string') {
    // Check if it's a schema reference
    if (/^[$@][a-zA-Z_$][a-zA-Z0-9_$]*$/.test(schema)) {
      const resolved = defs.getV(schema);
      if (resolved instanceof Schema) {
        return resolved;
      }
    } else {
      // Try to compile as IO text
      try {
        return compileSchema('_temp', schema);
      } catch (error) {
        // If compilation fails, return undefined
        return undefined;
      }
    }
  }

  return undefined;
}
