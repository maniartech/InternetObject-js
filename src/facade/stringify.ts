import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import Collection from '../core/collection';
import Document from '../core/document';
import Schema from '../schema/schema';
import MemberDef from '../schema/types/memberdef';
import TypedefRegistry from '../schema/typedef-registry';
import { quoteExtraPropertyString } from '../utils/string-formatter';
import { IO_MARKERS } from './serialization-constants';
import { stringifyDocument } from './stringify-document';

/**
 * Stringify options for controlling output format
 */
export interface StringifyOptions {
  /**
   * The name of the schema to use from definitions.
   * If provided, the schema will be looked up by this name in the definitions.
   * If not provided, uses `defs.defaultSchema` (`$schema`).
   *
   * @example
   * ```typescript
   * const io = stringify(user, defs, { schemaName: '$User' });
   * ```
   */
  schemaName?: string;

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

  /**
   * Include header section with definitions (for Document only)
   * Default: false (data only)
   */
  includeHeader?: boolean;
}

/**
 * Serialize an InternetObject, Collection, or Document to Internet Object text format.
 *
 * This is the high-level API for converting validated data back to IO format.
 * Uses TypeDef.stringify() methods to serialize each field according to type rules.
 *
 * ## Overload Patterns
 *
 * 1. `stringify(value)` - Schema-less serialization (no validation)
 * 2. `stringify(value, defs)` - Uses `defs.defaultSchema` ($schema) for type info
 * 3. `stringify(value, options)` - Schema-less with formatting options
 * 4. `stringify(value, defs, options)` - Full control with schema from defs
 *
 * ## Schema Resolution
 *
 * When `defs` is provided, the schema is resolved in this order:
 * 1. `options.schemaName` → `defs.get(schemaName)` (pick specific schema)
 * 2. `defs.defaultSchema` → Uses `$schema` from definitions
 * 3. No schema → Schema-less mode (values only, no validation)
 *
 * @param value - InternetObject, Collection, or Document to serialize
 * @param defs - Optional definitions for schema and variable resolution
 * @param options - Optional formatting options (includes `schemaName` to pick specific schema)
 * @returns Internet Object text representation
 *
 * @example
 * ```typescript
 * // Schema-less stringify
 * const obj = new InternetObject();
 * obj.set('name', 'Alice');
 * obj.set('age', 28);
 * const text = stringify(obj);
 * // Output: "Alice, 28"
 *
 * // Stringify with definitions (uses $schema)
 * const defs = new Definitions();
 * defs.set('$schema', userSchema);
 * const text = stringify(obj, defs);
 *
 * // Stringify with specific schema from defs
 * const text = stringify(obj, defs, { schemaName: '$Address' });
 *
 * // Stringify a document
 * const doc = parse(ioText, null);
 * const text = stringify(doc);
 *
 * // Stringify with pretty printing
 * const text = stringify(obj, defs, { indent: 2 });
 *
 * // Stringify a collection
 * const collection = new Collection([obj1, obj2, obj3]);
 * const text = stringify(collection, defs);
 * ```
 */
// Overload 1: Schema-less serialization
export function stringify(value: InternetObject | Collection<InternetObject> | Document | any): string;
// Overload 2: With definitions (uses defs.defaultSchema)
export function stringify(value: InternetObject | Collection<InternetObject> | Document | any, defs: Definitions): string;
// Overload 3: Schema-less with options
export function stringify(value: InternetObject | Collection<InternetObject> | Document | any, options: StringifyOptions): string;
// Overload 4: Full control with definitions and options
export function stringify(value: InternetObject | Collection<InternetObject> | Document | any, defs: Definitions, options: StringifyOptions): string;
export function stringify(
  value: InternetObject | Collection<InternetObject> | Document | any,
  defsOrOptions?: Definitions | StringifyOptions,
  options?: StringifyOptions
): string {
  // Resolve arguments
  let defs: Definitions | undefined;
  let opts: StringifyOptions | undefined;

  if (defsOrOptions instanceof Definitions) {
    defs = defsOrOptions;
    opts = options;
  } else if (defsOrOptions && typeof defsOrOptions === 'object') {
    // It's options (StringifyOptions)
    opts = defsOrOptions as StringifyOptions;
  }

  // Handle Document (IODocument) - delegate to stringifyDocument
  if (value instanceof Document) {

    // Build document options
    let docOptions: any = opts ? { ...opts } : {};

    // Default behavior: if includeHeader is not specified, use includeTypes to determine
    if (docOptions.includeHeader === undefined) {
      docOptions.includeHeader = docOptions.includeTypes ?? false;
    }

    return stringifyDocument(value, docOptions);
  }

  // Resolve schema from definitions
  // Priority: options.schemaName → defs.defaultSchema → no schema
  let schema: Schema | undefined;
  if (defs) {
    if (opts?.schemaName) {
      const namedSchema = defs.getV(opts.schemaName);
      if (namedSchema instanceof Schema) {
        schema = namedSchema;
      }
    } else if (defs.defaultSchema) {
      schema = defs.defaultSchema;
    }
  }

  // Handle Collection
  if (value instanceof Collection) {
    return stringifyCollection(value, schema, defs, opts);
  }

  // Handle InternetObject
  if (value instanceof InternetObject) {
    return stringifyObject(value, schema, defs, opts);
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
      return boolDef.stringify(val, { type: 'bool', path: '', optional: false, null: false } as any) ?? (val ? IO_MARKERS.TRUE : IO_MARKERS.FALSE);
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
      return stringDef.stringify(val, memberDef) ?? val;
    }
    return val;
  }

  // Handle Date - check if it's date-only or datetime
  if (val instanceof Date) {
    const dateDef = TypedefRegistry.get('date');
    if (dateDef && 'stringify' in dateDef && typeof dateDef.stringify === 'function') {
      return (dateDef.stringify as any)(val) ?? val.toISOString();
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
 * Stringify an InternetObject to IO text format.
 * @internal Used by stringifyDocument for section serialization.
 */
export function stringifyObject(
  obj: InternetObject,
  schema?: Schema,
  defs?: Definitions,
  options?: StringifyOptions
): string {
  const parts: string[] = [];
  const indent = options?.indent;
  const includeTypes = options?.includeTypes ?? false;
  if (schema) {
    // First output members in schema order regardless of insertion order.
    const handled = new Set<string>();
    for (const name of schema.names) {
      const memberDef: MemberDef | undefined = schema.defs[name];
      const hasValue = obj.has(name);
      if (hasValue) {
        const val = obj.get(name);
        const typeDef = memberDef ? TypedefRegistry.get(memberDef.type) : undefined;
        let strValue: string | undefined;
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
        // undefined means "skip this field" - use empty placeholder for positional format
        if (includeTypes) {
          if (strValue !== undefined) {
            parts.push(`${name}: ${strValue}`);
          }
        } else {
          parts.push(strValue ?? '');
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

    // Trim trailing empty values (missing optional fields at the end)
    while (parts.length > 0 && parts[parts.length - 1] === '') {
      parts.pop();
    }

    // Append any additional properties (wildcard or open schema extras) in original insertion order after core schema fields.
    for (const [key, val] of obj.entries()) {
      if (!key) continue;
      if (handled.has(key)) continue; // already output
      const memberDef: MemberDef | undefined = schema.defs[key];
      // For extras there is typically no memberDef (unless explicit definition outside names array)
      const typeDef = memberDef ? TypedefRegistry.get(memberDef.type) : undefined;
      let strValue: string | undefined;
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
      // Skip if undefined (missing optional)
      if (strValue !== undefined) {
        parts.push(`${key}: ${strValue}`);
      }
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
 * Stringify a Collection to IO text format.
 * @internal Used by stringifyDocument for section serialization.
 */
export function stringifyCollection(
  collection: Collection<InternetObject>,
  schema?: Schema,
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

// Note: resolveSchema helper is no longer needed - schema resolution is done in the main stringify function
