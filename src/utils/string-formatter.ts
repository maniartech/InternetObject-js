/**
 * String formatting utilities for Internet Object serialization.
 * Consolidates quoting, escaping, and format detection logic.
 * Ensures DRY principle and consistent string handling across serialization modules.
 */

import TypedefRegistry from '../schema/typedef-registry';
import MemberDef from '../schema/types/memberdef';
import { STRING_ENCLOSERS } from '../facade/serialization-constants';
// One copy of the rule, in the module the serializer actually uses.
import { readsBackAsANumber } from './strings';

/**
 * String format types supported by Internet Object
 */
export type StringFormat = 'auto' | 'open' | 'regular' | 'raw' | 'multiline';

/**
 * Quotes a string value using the appropriate format and encloser.
 *
 * @param str The string to quote
 * @param format The string format to use (default: 'regular')
 * @param encloser The quote character to use (default: '"')
 * @returns Properly quoted and escaped string
 *
 * @example
 * ```typescript
 * quoteString('hello world')
 * // → "hello world"
 *
 * quoteString('it\'s great', 'regular', '"')
 * // → "it's great"
 *
 * quoteString('raw\\ntext', 'raw', "'")
 * // → 'raw\\ntext'
 * ```
 */
export function quoteString(
  str: string,
  format: StringFormat = 'regular',
  encloser: string = STRING_ENCLOSERS.REGULAR
): string {
  // Use string typedef for proper formatting if available
  const stringDef = TypedefRegistry.get('string');

  if (stringDef && 'stringify' in stringDef && typeof stringDef.stringify === 'function') {
    const pseudoMember: MemberDef = {
      type: 'string',
      path: '',
      optional: false,
      null: false,
      format: format,
      escapeLines: false,
      encloser: encloser
    } as any;

    try {
      return stringDef.stringify(str, pseudoMember) ?? fallbackQuoteString(str, encloser);
    } catch (error) {
      // Fallback on typedef failure
      return fallbackQuoteString(str, encloser);
    }
  }

  // Fallback if typedef not available
  return fallbackQuoteString(str, encloser);
}

/**
 * Fallback string quoting when typedef is unavailable.
 * Handles basic escaping for quotes and control characters.
 *
 * @param str String to quote
 * @param encloser Quote character
 * @returns Quoted string
 */
function fallbackQuoteString(str: string, encloser: string): string {
  // Escape the encloser character and backslashes
  const escaped = str
    .replace(/\\/g, '\\\\')
    .replace(new RegExp(encloser, 'g'), '\\' + encloser);

  return encloser + escaped + encloser;
}

/**
 * Determines if a string needs quoting to avoid parser ambiguity.
 * Unquoted strings must not be confused with numbers, booleans, nulls, or dates.
 *
 * @param str The string to check
 * @returns True if the string requires quotes
 *
 * @example
 * ```typescript
 * needsQuoting('hello')      // → false (safe identifier)
 * needsQuoting('013ABSD')    // → false (a part code reads back as itself)
 * needsQuoting('12mm')       // → false (a measurement; no marker, no claim)
 * needsQuoting('1.2.3')      // → false (a version; not a complete number)
 * needsQuoting('123')        // → true  (would read back as a NUMBER)
 * needsQuoting('0001')       // → true  (likewise, and would lose its zeros)
 * needsQuoting('0x123FG')    // → true  (the 0x marker would make it an ERROR)
 * needsQuoting('true')       // → true  (looks like boolean)
 * needsQuoting('hello world') // → true (contains space)
 * needsQuoting('')           // → true  (empty string)
 * ```
 */
export function needsQuoting(str: string): boolean {
  // Empty strings always need quotes
  if (str.length === 0) return true;

  // Check for whitespace
  if (/\s/.test(str)) return true;

  // Would the bare text read back as something OTHER than this string?
  if (readsBackAsANumber(str)) return true;

  // Check if it looks like a boolean
  if (str === 'T' || str === 'F' || str === 'true' || str === 'false') return true;

  // Check if it looks like null
  if (str === 'N' || str === 'null' || str === 'undefined') return true;

  // Check if it starts with date/time markers
  if (/^(d|t|dt)"/.test(str)) return true;

  // Check for special characters that require quoting
  if (/[,\[\]{}:~@$]/.test(str)) return true;

  // Safe to use unquoted
  return false;
}


/**
 * Escapes special characters in a string value.
 *
 * @param str String to escape
 * @param encloser Quote character being used
 * @returns Escaped string (without quotes)
 */
export function escapeString(str: string, encloser: string = '"'): string {
  return str
    .replace(/\\/g, '\\\\')         // Backslash
    .replace(/\n/g, '\\n')          // Newline
    .replace(/\r/g, '\\r')          // Carriage return
    .replace(/\t/g, '\\t')          // Tab
    .replace(new RegExp(encloser, 'g'), '\\' + encloser); // Encloser
}

/**
 * Unescapes a quoted string value.
 *
 * @param str Escaped string (without quotes)
 * @returns Unescaped string
 */
export function unescapeString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\');
}

/**
 * Quotes a string for header definition values.
 * Always uses regular format with quote encloser for fidelity.
 *
 * @param str String to quote for header
 * @returns Quoted string suitable for header definitions
 */
export function quoteHeaderString(str: string): string {
  return quoteString(str, 'regular', STRING_ENCLOSERS.REGULAR);
}

/**
 * Quotes a string for wildcard extra property values.
 * Uses regular format to avoid parser ambiguity with identifiers.
 *
 * @param str String to quote
 * @returns Quoted string for extra properties
 */
export function quoteExtraPropertyString(str: string): string {
  return quoteString(str, 'auto', STRING_ENCLOSERS.REGULAR);
}

/**
 * Formats an object KEY for output. Object keys must serialize back as STRING keys: a purely numeric
 * key (`0`, `42`, `3.14`) or a reserved literal keyword (`null`/`true`/`false` and the short forms
 * `N`/`T`/`F`) would otherwise re-parse as a non-string token and raise `invalid-key`, so they are
 * quoted. Ordinary identifier / open-string keys (`name`, `a b`) pass through unquoted.
 *
 * @param key The key to format
 * @returns The key, quoted only if it would not round-trip as a bare string key
 */
export function formatObjectKey(key: string): string {
  const isNumeric = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(key);
  // `Inf`/`-Inf`/`NaN` are keywords too -- a bare `Inf:` in a schema header is read as the
  // special NUMBER, not a member name, and the definition is rejected (`invalid-definition`
  // in the header, `invalid-key` in data). The signed forms are already caught by isNumeric.
  const isKeyword = /^(?:true|false|null|T|F|N|Inf|NaN)$/.test(key);
  // A bare (unquoted) key must be a plain identifier-like open string; anything else — colons
  // (`ciqual_food_code:en`), braces, quotes, leading symbols, etc. — must be quoted or the emitted
  // text won't re-parse (issue #61: JSON keys routinely contain such characters).
  // `-` is legal in a bare key, but three in a row spell the SECTION SEPARATOR: a bare `a---b:` at
  // the start of a line splits the document in two and the rest is read as a new section.
  const isBareSafe = /^[$A-Za-z_][A-Za-z0-9_. -]*$/.test(key) && !/\s$/.test(key) && !key.includes('---');
  return (isNumeric || isKeyword || !isBareSafe) ? `"${key.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : key;
}

/** How keys are emitted in serialized data rows (SERIALIZATION-DECISIONS.md). */
export type EmitKeys = 'all' | 'extras' | 'none';

/**
 * The single rule every serializer shares — decide whether a member emits its key (`key: value`)
 * or just its value (bare), per the `emitKeys` mode (SERIALIZATION-DECISIONS.md).
 *
 * - a **keyless / positional** member has no key → always bare, in every mode.
 * - `'none'`   → never emit a key (values only; lossy when the schema can't recover the name).
 * - `'all'`    → emit a key for every keyed member (fully self-describing).
 * - `'extras'` (default) → emit a key only for a field NOT declared in the schema — i.e. an
 *   open-schema extra OR (when there is no schema) every field, since all fields are then undeclared.
 *   Fields declared in the schema stay bare (the name is recoverable from the schema/header).
 *
 * `schema` is duck-typed to `{ names }` so this stays dependency-free.
 *
 * @returns true → emit `key: value`; false → bare value
 */
export function shouldEmitKey(
  key: string | undefined,
  schema?: { names?: string[] },
  emitKeys: EmitKeys = 'extras'
): boolean {
  if (key === undefined) return false;   // keyless → bare, always
  if (emitKeys === 'none') return false;
  if (emitKeys === 'all') return true;
  // 'extras': emit only when the field is not declared in the schema (no schema ⇒ undeclared ⇒ emit)
  return !schema || !Array.isArray(schema.names) || !schema.names.includes(key);
}
