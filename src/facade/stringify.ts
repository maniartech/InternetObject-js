import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import Collection from '../core/collection';
import Document from '../core/document';
import Decimal from '../core/decimal/decimal';
import Schema from '../schema/schema';
import MemberDef from '../schema/types/memberdef';
import TypedefRegistry from '../schema/typedef-registry';
import registerTypes from '../schema/types';
import { quoteExtraPropertyString, formatObjectKey, shouldEmitKey, EmitKeys } from '../utils/string-formatter';
import { IOCommonOptions } from './options';
import { resolveSchema } from './resolve-schema';
import { IO_MARKERS } from './serialization-constants';
import { stringifyDocument } from './stringify-document';
import { formatRecord, createIndentString, FormatContext } from './io-formatter';

/**
 * Stringify options for controlling output format.
 * `schemaName` is shared with the load family — see {@link IOCommonOptions} (declared once — R8).
 */
export interface StringifyOptions extends Pick<IOCommonOptions, 'schemaName'> {
  /**
   * Indentation for pretty printing (number of spaces or string)
   * If omitted, output is compact (single line)
   */
  indent?: number | string;

  /**
   * Skip error objects in collections
   * Default: false (includes errors in output)
   * @remarks PARTIAL: honored for COLLECTION sections only; object-section support is parked
   * (`IOSection.toObject` does not thread it to a single IOObject). See io-test-cases/RECOMMENDATIONS.md.
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

  /**
   * How keys are emitted in data rows (SERIALIZATION-DECISIONS.md):
   * - `'all'`    — every keyed member emits `key: value` (self-describing)
   * - `'extras'` (default) — key only for a field NOT declared in the schema (open-schema extra, or
   *   every field when there is no schema); declared fields stay bare
   * - `'none'`   — values only (leanest; lossy when the schema can't recover the name)
   * A keyless (positional) member is always bare. Default: `'extras'`.
   */
  emitKeys?: EmitKeys;
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
  // Ensure built-in types are registered (see stringifyDocument). Idempotent.
  registerTypes();

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

    // includeHeader and includeTypes are INDEPENDENT (R9): header inclusion must not depend on type
    // annotations. stringify(value) is the lean entry point → no header unless explicitly requested.
    // (To emit a header WITH type annotations, pass { includeHeader: true, includeTypes: true }.)
    if (docOptions.includeHeader === undefined) {
      docOptions.includeHeader = false;
    }

    return stringifyDocument(value, docOptions);
  }

  // Resolve schema uniformly — same primitive + failure mode as load* (R8): a bad schemaName now
  // throws schemaNotFound instead of silently serializing schema-less.
  const schema: Schema | undefined = resolveSchema(defs, opts?.schemaName);

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

  // Handle bigint (must keep the `n` suffix so it round-trips as a bigint, not a number)
  if (typeof val === 'bigint') {
    return val.toString() + 'n';
  }

  // Handle Decimal
  if (val instanceof Decimal) {
    return val.toString() + 'm';
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
  const indent = options?.indent;
  const includeTypes = options?.includeTypes ?? false;

  // Use smart formatter for formatted output (when indent is specified)
  // This handles proper line breaks only where needed (expanding arrays/objects)
  if (indent !== undefined && !includeTypes) {
    const indentStr = createIndentString(indent);
    const ctx: FormatContext = {
      indentStr,
      level: 0,
      defs: defs ?? new Definitions(),
      isNested: false,
      emitKeys: options?.emitKeys ?? 'extras'
    };
    return formatRecord(obj, schema, ctx);
  }

  // Fallback to original logic for compact mode or includeTypes
  const parts: string[] = [];
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
        } else if (options?.emitKeys === 'all' && strValue !== undefined) {
          // emitKeys 'all' spells out schema-declared names too (self-describing)
          parts.push(`${formatObjectKey(name)}: ${strValue}`);
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

    // Append any additional properties (wildcard / open-schema extras) in insertion order after the
    // core schema fields. IO objects carry an index always and a key optionally: a KEYLESS member is
    // positional (emit a bare value); a KEYED member emits `key: value` (numeric/keyword keys quoted).
    // A keyless member must NOT be skipped — that would silently drop positional data (FINDINGS #25).
    for (const [key, val] of obj.entries()) {
      if (key && handled.has(key)) continue; // named schema member already output
      const memberDef: MemberDef | undefined = key ? schema.defs[key] : undefined;
      const typeDef = memberDef ? TypedefRegistry.get(memberDef.type) : undefined;
      let strValue: string | undefined;
      if (memberDef && typeDef && 'stringify' in typeDef && typeof typeDef.stringify === 'function') {
        const effectiveMemberDef = { ...memberDef };
        if (memberDef.type === 'string' && !memberDef.format) {
          effectiveMemberDef.format = 'auto';  // Use auto for smart quoting (quotes numbers, bools, etc.)
        }
        strValue = (typeDef.stringify as any)(val, effectiveMemberDef, defs);
      } else if (typeof val === 'string') {
        // Quote extra string properties using auto format (safe open-string / quoted as needed)
        strValue = quoteExtraPropertyString(val);
      } else {
        strValue = stringifyAnyValue(val, defs);
      }
      if (strValue === undefined) continue; // missing optional
      // Extra / keyless member — honor emitKeys ('none' suppresses, 'all'/'extras' keep the key).
      const emitKey = shouldEmitKey(key, schema, options?.emitKeys);
      parts.push(emitKey ? `${formatObjectKey(key!)}: ${strValue}` : strValue);
    }
  } else {
    // No schema: a member is positional when it has no key OR its key equals its own IOObject INDEX
    // position (the same index toObject() projects with, via forEach — NOT a re-derived counter,
    // which drifts after a deletion). Positional -> bare value; any other key -> `key: value`
    // (numeric/keyword keys quoted) so keys are never dropped (FINDINGS #25).
    obj.forEach((val: any, key: string | undefined, index: number) => {
      const strValue = stringifyAnyValue(val, defs);
      const isPositional = !shouldEmitKey(key, undefined, options?.emitKeys);
      parts.push(isPositional ? strValue : `${formatObjectKey(key)}: ${strValue}`);
    });
  }

  // Format output
  // Note: IO format doesn't wrap top-level objects in braces like JSON.
  // For formatted output, we use newlines between fields but no outer braces.
  if (typeof indent === 'number' && indent > 0) {
    return parts.join(',\n');
  } else if (typeof indent === 'string') {
    return parts.join(',\n');
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
