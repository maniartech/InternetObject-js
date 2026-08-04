/**
 * IO Formatter - Smart formatting for Internet Object output
 *
 * Formatting Rules:
 * 1. Simple objects (primitives only) stay inline: { a, b, c }
 * 2. Arrays of primitives stay inline: [ a, b, c ]
 * 3. Arrays of objects expand with one item per line
 * 4. Complex objects (with nested arrays of objects) may expand
 * 5. Line breaks happen BEFORE opening [ when array expands, NOT after closing }
 *
 * Key insight: After closing }, the next value continues on same line.
 * Line breaks only occur BEFORE [ when it needs to expand.
 *
 * @module io-formatter
 */

import Definitions from '../core/definitions';
import InternetObject from '../core/internet-object';
import Schema from '../schema/schema';
import MemberDef from '../schema/types/memberdef';
import TypedefRegistry from '../schema/typedef-registry';
import { IO_MARKERS } from './serialization-constants';
import { formatObjectKey, shouldEmitKey, EmitKeys } from '../utils/string-formatter';
import Decimal from '../core/decimal/decimal';

/**
 * Formatting context passed through recursive calls
 */
export interface FormatContext {
  /** Indentation string (e.g., '  ' for 2 spaces) */
  indentStr: string;
  /** Current indentation level */
  level: number;
  /** Definitions for variable/schema resolution */
  defs?: Definitions;
  /** Whether we're inside a nested structure (affects expansion decisions) */
  isNested: boolean;
  /** How keys are emitted in data rows (SERIALIZATION-DECISIONS.md). Default 'extras'. */
  emitKeys?: EmitKeys;
}

/**
 * Create indent string from options
 */
export function createIndentString(indent: number | string | undefined): string {
  if (indent === undefined) return '';
  if (typeof indent === 'number') return ' '.repeat(indent);
  return indent;
}

/**
 * Get current indentation
 */
function getIndent(ctx: FormatContext): string {
  return ctx.indentStr.repeat(ctx.level);
}

/**
 * Check if a value is a primitive (not object or array)
 */
function isPrimitive(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === 'boolean' || typeof val === 'number' || typeof val === 'string') return true;
  if (typeof val === 'bigint') return true;      // serialized as `<n>n`
  if (val instanceof Decimal) return true;       // serialized as `<n>m`
  if (val instanceof Date) return true;
  return false;
}

/**
 * Check if an array contains only primitive values
 */
function isArrayOfPrimitives(arr: any[]): boolean {
  return arr.every(item => isPrimitive(item));
}

/**
 * Check if an array contains objects (should expand when formatted)
 */
function isArrayOfObjects(arr: any[]): boolean {
  return arr.some(item => {
    if (item === null || item === undefined) return false;
    if (typeof item === 'object' && !(item instanceof Date)) return true;
    return false;
  });
}

/**
 * Check if an object directly contains a nested object (not just primitives)
 * This is used to determine if an object should expand.
 * An object expands if it contains nested objects or arrays of objects.
 */
function hasNestedStructure(obj: any): boolean {
  if (obj === null || typeof obj !== 'object') return false;
  if (obj instanceof Date) return false;
  if (Array.isArray(obj)) return isArrayOfObjects(obj);

  // Check all values - handle both InternetObject and plain objects
  const entries = obj instanceof InternetObject ? obj.entries() : Object.entries(obj);
  for (const [key, val] of entries) {
    if (!key) continue;
    // Check if this value is a non-primitive (object or array)
    if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
      return true; // Has nested structure
    }
  }
  return false;
}

/**
 * Check if an object is "simple" (contains only primitives, no nested structures)
 * Used for determining if inline formatting is appropriate
 */
function isSimpleObject(obj: any): boolean {
  return !hasNestedStructure(obj);
}

/**
 * Stringify a primitive value
 */
function stringifyPrimitive(val: any, defs?: Definitions): string {
  if (val === null) return IO_MARKERS.NULL;
  if (val === undefined) return IO_MARKERS.NULL;

  if (typeof val === 'boolean') {
    return val ? IO_MARKERS.TRUE : IO_MARKERS.FALSE;
  }

  if (typeof val === 'number') {
    return String(val);
  }

  // bigint / Decimal keep their IO literal suffix so they re-parse as the same type (not a number).
  if (typeof val === 'bigint') {
    return val.toString() + 'n';
  }

  if (val instanceof Decimal) {
    return val.toString() + 'm';
  }

  if (typeof val === 'string') {
    const stringDef = TypedefRegistry.get('string');
    if (stringDef && 'stringify' in stringDef && typeof stringDef.stringify === 'function') {
      const memberDef: MemberDef = {
        type: 'string',
        path: '',
        optional: false,
        null: false,
        format: 'auto',
        escapeLines: false,
        encloser: '"'
      } as any;
      return stringDef.stringify(val, memberDef) ?? val;
    }
    return val;
  }

  if (val instanceof Date) {
    const dateDef = TypedefRegistry.get('datetime');
    if (dateDef && 'stringify' in dateDef && typeof dateDef.stringify === 'function') {
      return (dateDef.stringify as any)(val, { type: 'datetime' }) ?? val.toISOString();
    }
    // Fallback
    return `dt'${val.toISOString()}'`;
  }

  return String(val);
}

/**
 * Format an array with smart expansion
 * - Arrays of primitives stay inline: [ a, b, c ]
 * - Arrays of objects expand with one item per line
 */
function formatArray(arr: any[], ctx: FormatContext, schema?: Schema): string {
  if (arr.length === 0) return '[]';

  const isFormatted = ctx.indentStr.length > 0;
  const shouldExpand = isFormatted && isArrayOfObjects(arr);

  const parts: string[] = [];
  for (const item of arr) {
    if (shouldExpand && typeof item === 'object' && item !== null && !(item instanceof Date)) {
      // For expanded arrays, format each object inline (wrapped in braces)
      parts.push(formatNestedObject(item, { ...ctx, isNested: true, level: ctx.level + 1 }, schema));
    } else {
      parts.push(formatValue(item, { ...ctx, isNested: true }, schema));
    }
  }

  if (shouldExpand) {
    // Expand: each item on its own line
    const innerIndent = getIndent({ ...ctx, level: ctx.level + 1 });
    const closingIndent = getIndent(ctx);
    return '[\n' + parts.map(p => innerIndent + p).join(',\n') + '\n' + closingIndent + ']';
  } else {
    // Inline: add spaces inside brackets when formatted
    if (isFormatted) {
      return '[ ' + parts.join(', ') + ' ]';
    }
    return '[' + parts.join(', ') + ']';
  }
}

/**
 * Format a nested object (always wrapped in braces, stays inline)
 * This is for objects inside arrays or as field values
 */
function formatNestedObject(obj: any, ctx: FormatContext, schema?: Schema): string {
  if (obj === null) return IO_MARKERS.NULL;
  if (obj instanceof Date) return stringifyPrimitive(obj, ctx.defs);

  const isFormatted = ctx.indentStr.length > 0;
  const parts: string[] = [];

  // Handle InternetObject
  if (obj instanceof InternetObject) {
    if (schema && schema.names && Array.isArray(schema.names)) {
      for (const name of schema.names) {
        if (!obj.has(name)) continue;
        const val = obj.get(name);
        if (val === undefined) continue;
        const memberDef = schema.defs[name];
        parts.push(formatValueWithMemberDef(val, memberDef, { ...ctx, isNested: true }));
      }
    } else {
      // No schema: iterate POSITIONALLY so keyless (push) members are NOT skipped (that skip is why a
      // keyless nested object used to serialize as `{}`). Keyless / index-matching members are
      // positional (bare); any other key emits `key: value` (numeric/keyword keys quoted).
      obj.forEach((val: any, key: string | undefined, index: number) => {
        if (val === undefined) return;
        const formatted = formatValue(val, { ...ctx, isNested: true });
        const isPositional = !shouldEmitKey(key, schema, ctx.emitKeys);
        parts.push(isPositional ? formatted : `${formatObjectKey(key)}: ${formatted}`);
      });
    }
  } else {
    // Plain object
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      const val = obj[key];
      if (val === undefined) continue;
      parts.push(formatValue(val, { ...ctx, isNested: true }));
    }
  }

  // Nested objects always stay inline
  if (isFormatted) {
    return '{ ' + parts.join(', ') + ' }';
  }
  return '{' + parts.join(', ') + '}';
}

/**
 * Format an object at the field level (for complex objects that need expansion)
 * This handles the case where an object contains arrays of objects
 */
function formatComplexObject(obj: any, ctx: FormatContext, schema?: Schema): string {
  if (obj === null) return IO_MARKERS.NULL;

  const isFormatted = ctx.indentStr.length > 0;
  const parts: string[] = [];

  // Handle InternetObject
  if (obj instanceof InternetObject) {
    if (schema && schema.names && Array.isArray(schema.names)) {
      for (const name of schema.names) {
        if (!obj.has(name)) continue;
        const val = obj.get(name);
        if (val === undefined) continue;
        const memberDef = schema.defs[name];
        parts.push(formatValueWithMemberDef(val, memberDef, { ...ctx, isNested: true, level: ctx.level + 1 }));
      }
    } else {
      // No schema: iterate POSITIONALLY so keyless (push) members are NOT skipped. Keyless / index-
      // matching members are positional (bare); any other key emits `key: value` (quoted if needed).
      obj.forEach((val: any, key: string | undefined, index: number) => {
        if (val === undefined) return;
        const formatted = formatValue(val, { ...ctx, isNested: true, level: ctx.level + 1 });
        const isPositional = !shouldEmitKey(key, schema, ctx.emitKeys);
        parts.push(isPositional ? formatted : `${formatObjectKey(key)}: ${formatted}`);
      });
    }
  } else {
    // Plain object
    for (const key in obj) {
      if (!obj.hasOwnProperty(key)) continue;
      const val = obj[key];
      if (val === undefined) continue;
      parts.push(formatValue(val, { ...ctx, isNested: true, level: ctx.level + 1 }));
    }
  }

  // Complex object: expand with content on indented line
  if (isFormatted) {
    const innerIndent = getIndent({ ...ctx, level: ctx.level + 1 });
    const closingIndent = getIndent(ctx);
    return '{\n' + innerIndent + parts.join(', ') + '\n' + closingIndent + '}';
  }
  return '{' + parts.join(', ') + '}';
}

/**
 * Format any value (for nested contexts)
 */
function formatValue(val: any, ctx: FormatContext, schema?: Schema): string {
  if (isPrimitive(val)) {
    return stringifyPrimitive(val, ctx.defs);
  }

  if (Array.isArray(val)) {
    return formatArray(val, ctx, schema);
  }

  // Object - format inline (nested objects stay inline)
  return formatNestedObject(val, ctx, schema);
}

/**
 * Resolve a nested-object schema reference to a Schema. Handles a Schema instance, a TokenNode
 * variable-ref (duck-typed via `.value`, e.g. `$inner`), or a `$`-prefixed string — recursively.
 * Returns undefined when nothing resolves (caller then renders as no-schema, keeping names).
 * Mirrors ObjectDef._resolveSchema (schema/types/object.ts:297-322).
 */
function resolveNestedSchema(schema: any, defs?: Definitions): Schema | undefined {
  if (!schema) return undefined;
  if (schema instanceof Schema) return schema;
  const ref = typeof schema === 'string'
    ? schema
    : (typeof schema.value === 'string' ? schema.value : undefined);
  if (ref && ref.startsWith('$') && defs) {
    try {
      const resolved = defs.getV(ref);
      if (resolved instanceof Schema) return resolved;
      return resolveNestedSchema(resolved, defs);
    } catch { return undefined; }
  }
  return undefined;
}

/**
 * Format a value using its MemberDef for type-aware stringification
 */
function formatValueWithMemberDef(val: any, memberDef: MemberDef | undefined, ctx: FormatContext): string {
  if (!memberDef) {
    return formatValue(val, ctx);
  }

  // Handle null/undefined
  if (val === null) return IO_MARKERS.NULL;
  if (val === undefined) return '';

  const typeDef = TypedefRegistry.get(memberDef.type);

  // For object type with nested arrays of objects, we may need special handling
  if (memberDef.type === 'object' && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
    // Resolve the nested schema so a schema-bound nested object renders POSITIONALLY (in schema
    // order) rather than falling into the no-schema branch. `memberDef.schema` may be a Schema, a
    // TokenNode variable-ref ($inner), or a string; also honour `schemaRef`. Mirrors
    // ObjectDef._resolveSchema (object.ts:297-322).
    const nestedSchema = resolveNestedSchema(memberDef.schema, ctx.defs)
      ?? resolveNestedSchema(memberDef.schemaRef, ctx.defs);
    // Check if this object is simple or complex
    const simple = isSimpleObject(val);
    if (!simple && !ctx.isNested) {
      return formatComplexObject(val, ctx, nestedSchema);
    }
    return formatNestedObject(val, ctx, nestedSchema);
  }

  // For array type
  if (memberDef.type === 'array' && Array.isArray(val)) {
    const itemSchema = memberDef.of instanceof Schema ? memberDef.of : undefined;
    return formatArray(val, ctx, itemSchema);
  }

  // For other types, use the TypeDef's stringify method
  if (typeDef && 'stringify' in typeDef && typeof typeDef.stringify === 'function') {
    const result = typeDef.stringify(val, memberDef, ctx.defs);
    return result ?? '';
  }

  return formatValue(val, ctx);
}

/**
 * Information about a formatted field part
 */
interface FieldPart {
  /** The formatted string value */
  value: string;
  /** Whether this is an array that expands (arrays of objects) */
  expandsArray: boolean;
  /** Whether this is a complex object that expands */
  expandsObject: boolean;
}

/**
 * Format a top-level record (row of data)
 * This is the main entry point for formatting a single record.
 *
 * The formatting logic follows these rules:
 * - Simple values and inline objects stay on the same line
 * - Line breaks happen BEFORE [ when an array of objects expands
 * - After } closes, the next value continues on the same line (no line break after })
 * - Complex objects (containing arrays of objects) expand with content indented
 */
export function formatRecord(
  obj: InternetObject | any,
  schema: Schema | undefined,
  ctx: FormatContext
): string {
  const isFormatted = ctx.indentStr.length > 0;

  // Build all parts first, tracking which need expansion
  const parts: FieldPart[] = [];
  const handled = new Set<string>();

  // Helper to check if schema is valid
  const hasValidSchema = schema && schema.names && Array.isArray(schema.names);

  if (obj instanceof InternetObject) {
    if (hasValidSchema) {
      for (const name of schema!.names) {
        const memberDef = schema!.defs[name];
        const hasValue = obj.has(name);

        if (hasValue) {
          const val = obj.get(name);
          if (val === undefined) {
            // Explicit undefined - add empty placeholder
            parts.push({ value: '', expandsArray: false, expandsObject: false });
          } else {
            // Check expansion needs
            const expandsArray = isFormatted && Array.isArray(val) && isArrayOfObjects(val);
            const expandsObject = isFormatted && !Array.isArray(val) &&
              typeof val === 'object' && val !== null && !(val instanceof Date) && !isSimpleObject(val);

            const formatted = formatValueWithMemberDef(val, memberDef, { ...ctx, isNested: false });
            // Schema-declared field: bare by default; spelled out only when emitKeys === 'all'.
            const value = ctx.emitKeys === 'all' ? `${formatObjectKey(name)}: ${formatted}` : formatted;
            parts.push({ value, expandsArray, expandsObject });
          }
        } else {
          // Missing optional member with no default: preserve positional placeholder
          const md = memberDef as any;
          if (md?.optional && md?.default === undefined) {
            parts.push({ value: '', expandsArray: false, expandsObject: false });
          }
        }
        handled.add(name);
      }

      // Trim trailing empty values (missing optional fields at the end)
      while (parts.length > 0 && parts[parts.length - 1].value === '') {
        parts.pop();
      }

      // Append any additional properties (wildcard / open-schema extras). A KEYLESS member is
      // positional (bare value); a KEYED member emits `key: value` (numeric/keyword keys quoted).
      // Keyless members must NOT be skipped — that silently drops positional data (FINDINGS #25).
      for (const [key, val] of obj.entries()) {
        if (key && handled.has(key)) continue;
        if (val === undefined) continue;

        const memberDef = key ? schema!.defs[key] : undefined;
        const expandsArray = isFormatted && Array.isArray(val) && isArrayOfObjects(val);
        const expandsObject = isFormatted && !Array.isArray(val) &&
          typeof val === 'object' && val !== null && !(val instanceof Date) && !isSimpleObject(val);

        const formatted = memberDef
          ? formatValueWithMemberDef(val, memberDef, { ...ctx, isNested: false })
          : formatValue(val, { ...ctx, isNested: false });
        // Extra (not schema-declared) or keyless member — honor emitKeys ('none' suppresses keys).
        const emitKey = shouldEmitKey(key, schema, ctx.emitKeys);
        parts.push({
          value: emitKey ? `${formatObjectKey(key!)}: ${formatted}` : formatted,
          expandsArray, expandsObject
        });
      }
    } else {
      // No usable schema. A member is positional when it has no key OR its key equals its own IOObject
      // INDEX position (`"0"`,`"1"`,…). The index MUST be the object's real index — the same one
      // toObject() projects with (via forEach) — not a re-derived counter, which would drift after a
      // deletion (gap). Positional members emit a bare value; any other key is a real label ->
      // `key: value` (numeric/keyword keys quoted).
      obj.forEach((val: any, key: string | undefined, index: number) => {
        if (val === undefined) return;

        const expandsArray = isFormatted && Array.isArray(val) && isArrayOfObjects(val);
        const expandsObject = isFormatted && !Array.isArray(val) &&
          typeof val === 'object' && val !== null && !(val instanceof Date) && !isSimpleObject(val);

        const formatted = formatValue(val, { ...ctx, isNested: false });
        const isPositional = !shouldEmitKey(key, schema, ctx.emitKeys);
        parts.push({
          value: isPositional ? formatted : `${formatObjectKey(key)}: ${formatted}`,
          expandsArray, expandsObject
        });
      });
    }
  } else if (typeof obj === 'object' && obj !== null) {
    // Plain object
    const keys = hasValidSchema ? schema!.names.filter(n => n in obj) : Object.keys(obj);
    for (const key of keys) {
      const val = obj[key];
      if (val === undefined) continue;

      const expandsArray = isFormatted && Array.isArray(val) && isArrayOfObjects(val);
      const expandsObject = isFormatted && !Array.isArray(val) &&
        typeof val === 'object' && val !== null && !(val instanceof Date) && !isSimpleObject(val);

      const memberDef = hasValidSchema ? schema!.defs[key] : undefined;
      const formatted = memberDef
        ? formatValueWithMemberDef(val, memberDef, { ...ctx, isNested: false })
        : formatValue(val, { ...ctx, isNested: false });
      parts.push({ value: formatted, expandsArray, expandsObject });
    }
  }

  if (!isFormatted || parts.length === 0) {
    // Compact mode: just join with ', '
    return parts.map(p => p.value).join(', ');
  }

  // Formatted mode: smart line breaks
  // Key rule: Line breaks happen BEFORE [ (expanding arrays), NOT after }
  // After a complex object closes with }, the next value stays on same line
  const segments: string[] = [];
  let currentSegment: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part.expandsArray) {
      // Array that expands - collect current segment, then add array
      // The array content will have its own line breaks inside
      if (currentSegment.length > 0) {
        // Join current segment, add comma, then the expanding array on same line
        segments.push(currentSegment.join(', ') + ', ' + part.value);
        currentSegment = [];
      } else {
        segments.push(part.value);
      }
    } else if (part.expandsObject) {
      // Complex object that expands
      // Add to current, then flush (line break will be after this object closes)
      currentSegment.push(part.value);
      segments.push(currentSegment.join(', '));
      currentSegment = [];
    } else {
      // Simple value - add to current segment
      currentSegment.push(part.value);
    }
  }

  // Flush remaining
  if (currentSegment.length > 0) {
    segments.push(currentSegment.join(', '));
  }

  // Join segments - each segment ends where a line break is appropriate
  // But we want line breaks BEFORE expanding structures, not after closing }
  // So we join with ', ' (comma continues on same line)
  return segments.join(', ');
}

/**
 * Format a collection of records
 */
export function formatCollection(
  items: any[],
  schema: Schema | undefined,
  ctx: FormatContext,
  asTopLevel: boolean = true
): string {
  if (items.length === 0) return asTopLevel ? '' : '[]';

  const parts: string[] = [];

  for (const item of items) {
    if (item instanceof InternetObject || (typeof item === 'object' && item !== null)) {
      parts.push(formatRecord(item, schema, ctx));
    } else {
      parts.push(formatValue(item, ctx));
    }
  }

  if (asTopLevel) {
    // Top-level collection uses ~ prefix for each item
    return parts.map(p => `~ ${p}`).join('\n');
  } else {
    // Nested collection as array (shouldn't typically happen, but handle it)
    const isFormatted = ctx.indentStr.length > 0;
    if (isFormatted) {
      const innerIndent = getIndent({ ...ctx, level: ctx.level + 1 });
      const closingIndent = getIndent(ctx);
      return '[\n' + parts.map(p => innerIndent + '{ ' + p + ' }').join(',\n') + '\n' + closingIndent + ']';
    }
    return '[' + parts.map(p => '{' + p + '}').join(', ') + ']';
  }
}
