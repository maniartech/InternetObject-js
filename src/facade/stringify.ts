import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import Collection from '../core/collection';
import Document from '../core/document';
import Schema from '../schema/schema';
import MemberDef from '../schema/types/memberdef';
import TypedefRegistry from '../schema/typedef-registry';
import { quoteExtraPropertyString } from '../utils/string-formatter';
import { IO_MARKERS } from './serialization-constants';

/**
 * Stringify options for controlling output format
 */
export interface StringifyOptions {
  /**
   * Indentation for pretty printing (number of spaces or string)
   * If omitted, output is compact (single line)
   */
  indent?: number | string;

  /**
   * Skip error objects in collections
   * Default: false (includes errors in output)
   */
  skipErrors?: boolean;

  /**
   * Include type annotations in output
   * Default: false (values only)
   */
  includeTypes?: boolean;
}

/**
 * Serialize an InternetObject, Collection, or Document to Internet Object text format.
 *
 * This is the high-level API for converting validated data back to IO format.
 * Uses TypeDef.stringify() methods to serialize each field according to type rules.
 *
 * @param value - InternetObject, Collection, or Document to serialize
 * @param schema - Optional schema for type information (uses value's schema if available)
 * @param defs - Optional definitions for variable resolution
 * @param options - Optional formatting options
 * @returns Internet Object text representation
 *
 * @example
 * ```typescript
 * // Stringify a simple object
 * const obj = new InternetObject();
 * obj.set('name', 'Alice');
 * obj.set('age', 28);
 * const text = stringify(obj, '{ name: string, age: number }');
 * // Output: "Alice, 28"
 *
 * // Stringify a document
 * const doc = parse(ioText, null);
 * const text = stringify(doc);
 * // Output: Full IO document with headers and sections
 *
 * // Stringify with pretty printing
 * const text = stringify(obj, schema, undefined, { indent: 2 });
 * // Output:
 * // {
 * //   name: Alice,
 * //   age: 28
 * // }
 *
 * // Stringify a collection
 * const collection = new Collection([obj1, obj2, obj3]);
 * const text = stringify(collection, schema);
 * // Output: "[Alice, 28], [Bob, 35], [Charlie, 42]"
 *
 * // Stringify with error skipping
 * const text = stringify(collectionWithErrors, schema, undefined, { skipErrors: true });
 * // Skips items that are error objects
 * ```
 */
export function stringify(value: any, schema?: string | Schema, defs?: Definitions, options?: StringifyOptions): string;
export function stringify(value: any, defs?: Definitions | Schema | string, errorCollector?: Error[], options?: StringifyOptions): string;
export function stringify(
  value: InternetObject | Collection<InternetObject> | Document | any,
  defs?: Definitions | Schema | string,
  errorCollector?: Error[] | Definitions,
  options?: StringifyOptions
): string {
  // Handle Document (IODocument) - delegate to stringifyDocument
  // Import here to avoid circular dependency
  if (value instanceof Document) {
    const { stringifyDocument } = require('./stringify-document');
    // If options is passed as 4th arg, use it.
    // If options is passed as 3rd arg (legacy), handle it below?
    // Document stringify usually takes (doc, options).
    // If we call stringify(doc, options), then defs=options.
    let docOptions: StringifyOptions | undefined;
    if (defs && typeof defs === 'object' && !Array.isArray(defs) && !(defs instanceof Schema) && !(defs instanceof Definitions)) {
      docOptions = defs as StringifyOptions;
    } else if (options) {
      docOptions = options;
    }
    return stringifyDocument(value, docOptions);
  }

  let schema: Schema | string | undefined;
  let definitions: Definitions | undefined;
  let opts: StringifyOptions | undefined = options;

  // Argument shifting for backward compatibility
  // stringify(value, schema, defs, options)
  if (defs instanceof Schema || typeof defs === 'string') {
    schema = defs;
    if (errorCollector instanceof Definitions) {
      definitions = errorCollector;
      // If 4th arg is options, use it
      if (options) {
        opts = options;
      }
    } else if (errorCollector && typeof errorCollector === 'object' && !Array.isArray(errorCollector)) {
      // stringify(value, schema, options)
      opts = errorCollector as StringifyOptions;
    }
  } else if (defs instanceof Definitions) {
    definitions = defs;
    if (defs.defaultSchema) {
      schema = defs.defaultSchema;
    }

    if (errorCollector && typeof errorCollector === 'object' && !Array.isArray(errorCollector)) {
       opts = errorCollector as StringifyOptions;
    }
  } else if (defs && typeof defs === 'object' && !Array.isArray(defs)) {
    // stringify(value, options)
    opts = defs as StringifyOptions;
  }

  // Handle Collection
  if (value instanceof Collection) {
    return stringifyCollection(value, schema, definitions, opts);
  }

  // Handle InternetObject
  if (value instanceof InternetObject) {
    return stringifyObject(value, schema, definitions, opts);
  }

  // Handle plain values
  return JSON.stringify(value);
}

/**
 * Stringify a value of 'any' type by inferring from its JavaScript type
 */
function stringifyAnyValue(val: any, defs?: Definitions): string {
  // Handle primitives first
  if (val === null) return IO_MARKERS.NULL;
  if (val === undefined) return IO_MARKERS.NULL;

  // Handle boolean
  if (typeof val === 'boolean') {
    const boolDef = TypedefRegistry.get('bool');
    if (boolDef && 'stringify' in boolDef && typeof boolDef.stringify === 'function') {
      return boolDef.stringify(val, { type: 'bool', path: '', optional: false, null: false } as any);
    }
    return val ? IO_MARKERS.TRUE : IO_MARKERS.FALSE;
  }

  // Handle number
  if (typeof val === 'number') {
    return String(val);
  }

  // Handle string - use auto format for smart quoting
  if (typeof val === 'string') {
    const stringDef = TypedefRegistry.get('string');
    if (stringDef && 'stringify' in stringDef && typeof stringDef.stringify === 'function') {
      const memberDef: MemberDef = {
        type: 'string',
        path: '',
        optional: false,
        null: false,
        format: 'auto',  // Use auto format for smart quoting (quotes ambiguous values like numbers, bools)
        escapeLines: false,
        encloser: '"'
      } as any;
      return stringDef.stringify(val, memberDef);
    }
    return val;
  }

  // Handle Date - check if it's date-only or datetime
  if (val instanceof Date) {
    const dateDef = TypedefRegistry.get('date');
    if (dateDef && 'stringify' in dateDef && typeof dateDef.stringify === 'function') {
      return (dateDef.stringify as any)(val);
    }
    // Fallback: format as date-only d"YYYY-MM-DD"
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `d"${year}-${month}-${day}"`;
  }

  // Handle array
  if (Array.isArray(val)) {
    const items = val.map(item => stringifyAnyValue(item, defs));
    return `[${items.join(', ')}]`;
  }

  // Handle object (including InternetObject)
  if (val instanceof InternetObject) {
    const objContent = stringifyObject(val, undefined, defs, {});
    return `{${objContent}}`;  // Wrap in braces
  }

  // Handle plain object - output values only in order, like {val1, val2, val3}
  if (typeof val === 'object') {
    const items: string[] = [];
    for (const k in val) {
      if (val.hasOwnProperty(k)) {
        items.push(stringifyAnyValue(val[k], defs));
      }
    }
    return `{${items.join(', ')}}`;
  }

  // Fallback
  return JSON.stringify(val);
}

/**
 * Internal helper to stringify an InternetObject
 */
function stringifyObject(
  obj: InternetObject,
  schema?: string | Schema,
  defs?: Definitions,
  options?: StringifyOptions
): string {
  // Get schema if not provided
  const resolvedSchema = resolveSchema(schema, defs);

  const parts: string[] = [];
  const indent = options?.indent;
  const includeTypes = options?.includeTypes ?? false;
  if (resolvedSchema) {
    // First output members in schema order regardless of insertion order.
    const handled = new Set<string>();
    for (const name of resolvedSchema.names) {
      const memberDef: MemberDef | undefined = resolvedSchema.defs[name];
      const hasValue = obj.has(name);
      if (hasValue) {
        const val = obj.get(name);
        const typeDef = memberDef ? TypedefRegistry.get(memberDef.type) : undefined;
        let strValue: string;
        if (memberDef && typeDef && 'stringify' in typeDef && typeof typeDef.stringify === 'function') {
          const effectiveMemberDef = { ...memberDef };
          if (memberDef.type === 'string' && !memberDef.format) {
            effectiveMemberDef.format = 'auto';  // Use auto for smart quoting (quotes numbers, bools, etc.)
          }
          strValue = (typeDef.stringify as any)(val, effectiveMemberDef, defs);
        } else if (memberDef && (memberDef.type === 'any' || memberDef.type === 'object')) {
          strValue = stringifyAnyValue(val, defs);
        } else {
          strValue = stringifyAnyValue(val, defs);
        }
        if (includeTypes) {
          parts.push(`${name}: ${strValue}`);
        } else {
          parts.push(strValue);
        }
      } else {
        // Missing optional member with no default: preserve positional placeholder by emitting empty slot when includeTypes is false.
        if (!includeTypes) {
          const md = memberDef as any;
          if (md?.optional && md?.default === undefined) {
            parts.push('');
          }
        }
      }
      handled.add(name);
    }
    // Append any additional properties (wildcard or open schema extras) in original insertion order after core schema fields.
    for (const [key, val] of obj.entries()) {
      if (!key) continue;
      if (handled.has(key)) continue; // already output
      const memberDef: MemberDef | undefined = resolvedSchema.defs[key];
      // For extras there is typically no memberDef (unless explicit definition outside names array)
      const typeDef = memberDef ? TypedefRegistry.get(memberDef.type) : undefined;
      let strValue: string;
      if (memberDef && typeDef && 'stringify' in typeDef && typeof typeDef.stringify === 'function') {
        const effectiveMemberDef = { ...memberDef };
        if (memberDef.type === 'string' && !memberDef.format) {
          effectiveMemberDef.format = 'auto';  // Use auto for smart quoting (quotes numbers, bools, etc.)
        }
        strValue = (typeDef.stringify as any)(val, effectiveMemberDef, defs);
      } else if (typeof val === 'string') {
        // Quote extra string properties using regular string format
        strValue = quoteExtraPropertyString(val);
      } else {
        strValue = stringifyAnyValue(val, defs);
      }
      // Extras should retain key label even when includeTypes is false (desired output for wildcard properties)
      parts.push(`${key}: ${strValue}`);
    }
  } else {
    // No schema: fall back to insertion order
    for (const [key, val] of obj.entries()) {
      if (!key) continue;
      const strValue = stringifyAnyValue(val, defs);
      if (includeTypes) {
        parts.push(`${key}: ${strValue}`);
      } else {
        parts.push(strValue);
      }
    }
  }

  // Format output
  if (typeof indent === 'number' && indent > 0) {
    const indentStr = ' '.repeat(indent);
    return '{\n' + parts.map(p => indentStr + p).join(',\n') + '\n}';
  } else if (typeof indent === 'string') {
    return '{\n' + parts.map(p => indent + p).join(',\n') + '\n}';
  } else {
    return parts.join(', ');
  }
}

/**
 * Internal helper to stringify a Collection
 */
function stringifyCollection(
  collection: Collection<InternetObject>,
  schema?: string | Schema,
  defs?: Definitions,
  options?: StringifyOptions
): string {
  const parts: string[] = [];
  const skipErrors = options?.skipErrors ?? false;

  for (const item of collection) {
    // Skip error objects if requested
    if (skipErrors && item && typeof item === 'object' && (item as any).__error === true) {
      continue;
    }

    if (item instanceof InternetObject) {
      parts.push(stringifyObject(item, schema, defs, options));
    } else {
      // Handle error objects or other items
      if (item && typeof item === 'object' && (item as any).__error === true) {
        parts.push(`<error: ${(item as any).message}>`);
      } else {
        parts.push(JSON.stringify(item));
      }
    }
  }

  // Format as collection
  if (options?.indent) {
    return '[\n  ' + parts.join(',\n  ') + '\n]';
  } else {
    return '[' + parts.join(', ') + ']';
  }
}

/**
 * Helper to resolve schema from string or Schema object
 */
function resolveSchema(schema: string | Schema | undefined, defs?: Definitions): Schema | undefined {
  if (!schema) return undefined;

  if (typeof schema === 'string') {
    if (defs && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(schema)) {
      const schemaFromDefs = defs.getV(schema);
      if (schemaFromDefs instanceof Schema) {
        return schemaFromDefs;
      }
    }
    // Can't compile schema here - would need to parse IO text
    return undefined;
  }

  return schema;
}
