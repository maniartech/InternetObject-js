import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import Collection from '../core/collection';
import Schema from '../schema/schema';
import MemberDef from '../schema/types/memberdef';
import TypedefRegistry from '../schema/typedef-registry';

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
 * Serialize an InternetObject or Collection to Internet Object text format.
 *
 * This is the high-level API for converting validated data back to IO format.
 * Uses TypeDef.stringify() methods to serialize each field according to type rules.
 *
 * @param value - InternetObject or Collection to serialize
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
export function stringify(
  value: InternetObject | Collection<InternetObject> | any,
  schema?: string | Schema,
  defs?: Definitions,
  options?: StringifyOptions
): string {
  // Handle Collection
  if (value instanceof Collection) {
    return stringifyCollection(value, schema, defs, options);
  }

  // Handle InternetObject
  if (value instanceof InternetObject) {
    return stringifyObject(value, schema, defs, options);
  }

  // Handle plain values
  return JSON.stringify(value);
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

  // Iterate over object members
  for (const [key, val] of obj.entries()) {
    if (!key) continue;  // Skip undefined keys

    const memberDef: MemberDef | undefined = resolvedSchema?.defs[key];

    if (memberDef) {
      // Use typedef to stringify
      const typeDef = TypedefRegistry.get(memberDef.type);
      if (typeDef && 'stringify' in typeDef && typeDef.stringify) {
        const strValue = typeDef.stringify(val, memberDef, defs);
        if (includeTypes) {
          parts.push(`${key}: ${strValue}`);
        } else {
          parts.push(strValue);
        }
      } else {
        // Fallback to JSON stringify
        if (includeTypes) {
          parts.push(`${key}: ${JSON.stringify(val)}`);
        } else {
          parts.push(JSON.stringify(val));
        }
      }
    } else {
      // No schema - use JSON stringify
      if (includeTypes) {
        parts.push(`${key}: ${JSON.stringify(val)}`);
      } else {
        parts.push(JSON.stringify(val));
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
