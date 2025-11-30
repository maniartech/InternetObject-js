/**
 * String formatting utilities for Internet Object serialization.
 * Consolidates quoting, escaping, and format detection logic.
 * Ensures DRY principle and consistent string handling across serialization modules.
 */

import TypedefRegistry from '../schema/typedef-registry';
import MemberDef from '../schema/types/memberdef';
import { STRING_ENCLOSERS } from '../facade/serialization-constants';

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
 * needsQuoting('123')        // → true (looks like number)
 * needsQuoting('true')       // → true (looks like boolean)
 * needsQuoting('hello world') // → true (contains space)
 * needsQuoting('')           // → true (empty string)
 * ```
 */
export function needsQuoting(str: string): boolean {
  // Empty strings always need quotes
  if (str.length === 0) return true;

  // Check for whitespace
  if (/\s/.test(str)) return true;

  // Check if it looks like a number
  if (/^-?\d+\.?\d*$/.test(str)) return true;

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
