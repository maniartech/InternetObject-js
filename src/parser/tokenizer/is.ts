import Symbols from "./symbols";
import TokenType from "./token-types";

const reSpaces = /\s/;
const reHSpaces = /[ \t]+/;

/**
  * Check if the given character is a special symbol.
  * @param {string} char - Character to check.
  * @returns {boolean} True if the character is a special symbol, else false.
  */
export const isSpecialSymbol = (char: string): boolean => {
  // const symbols = ['{', '}', '[', ']', ':', ',', '~'];
  const symbols = [
    Symbols.CURLY_OPEN,
    Symbols.CURLY_CLOSE,
    Symbols.BRACKET_OPEN,
    Symbols.BRACKET_CLOSE,
    Symbols.COLON,
    Symbols.COMMA,
    Symbols.TILDE,

    // TODO: Ensure that the following symbols are good to be included here.
    Symbols.DOUBLE_QUOTE,
    Symbols.SINGLE_QUOTE,
  ]

  return symbols.includes(char as Symbols);
}

/**
  * Check if the given character is a digit.
  * @param char The character to check.
  * @returns {boolean} True if the character is a digit, else false.
  */
export const isDigit = (char: string): boolean => {
  return /[0-9]/.test(char);
}

// Pre-computed lookup for specific Unicode whitespace characters
const WHITESPACE_LOOKUP = new Set([
  0x1680, // Ogham space mark
  0x2028, // Line separator
  0x2029, // Paragraph separator
  0x202F, // Narrow no-break space
  0x205F, // Medium mathematical space
  0x3000, // Ideographic space
  0xFEFF  // BOM/Zero width no-break space
]);

/**
  * Check if the given character represents a whitespace.
  * @param {string} char - Character to check.
  * @returns {boolean} True if the character is a whitespace, else false.
  */
export const isWhitespace = (char: string): boolean => {
  // Use codePointAt for proper Unicode handling
  const code = char.codePointAt(0) || 0;

  // Fast path: ASCII whitespace and control characters (U+0000 to U+0020)
  if (code <= 0x20) {
    return true;
  }

  // Fast path: Extended ASCII range (U+0021 to U+00FF) - only U+00A0 is whitespace
  if (code <= 0xFF) {
    return code === 0x00A0;
  }

  // Fast path: Anything above U+FEFF is never whitespace
  if (code > 0xFEFF) {
    return false;
  }

  // Fast path: Unicode range U+2000-U+200A (various em/en spaces)
  if (code >= 0x2000 && code <= 0x200A) {
    return true;
  }

  // Lookup table for remaining Unicode whitespace characters
  return WHITESPACE_LOOKUP.has(code);
}

/**
 * Check if the given character is valid newline character. It is valid if it
 * is either a carriage return or a line feed.
 */
export const isValidNewline = (char: string): boolean => {
  return char === '\r' || char === '\n';
}

/**
* Check if the given character is an alphabetic character.
*/
export const isValidOpenStringChar = (char: string): boolean => {
  // Define terminators based on IO's spec.
  // const terminators = ["{", "}", "[", "]", ":", ",", "\"", "'", "@", undefined];

  const terminators = [
    Symbols.CURLY_OPEN,
    Symbols.CURLY_CLOSE,
    Symbols.BRACKET_OPEN,
    Symbols.BRACKET_CLOSE,
    Symbols.COLON,
    Symbols.COMMA,
    Symbols.HASH,
    Symbols.DOUBLE_QUOTE,
    Symbols.SINGLE_QUOTE,
    Symbols.TILDE,
  ];

  return !terminators.includes(char as Symbols);
}

/**
  * Determine the token type for a special symbol.
  * @param {string} char - Special symbol character.
  * @returns {string} Token type.
  */
export const getSymbolTokenType = (char: string): string => {
  switch (char) {
      case '{': return TokenType.CURLY_OPEN;
      case '}': return TokenType.CURLY_CLOSE;
      case '[': return TokenType.BRACKET_OPEN;
      case ']': return TokenType.BRACKET_CLOSE;
      case ':': return TokenType.COLON;
      case ',': return TokenType.COMMA;
      case '~': return TokenType.COLLECTION_START;
      default: return TokenType.UNKNOWN;
  }
}
