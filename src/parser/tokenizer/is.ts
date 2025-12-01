import Symbols from "./symbols";
import TokenType from "./token-types";

// Character code constants for ultra-fast character checking
// Exported for use in the tokenizer's hot path
export const CHAR_CODES = {
  SPACE: 32,        // ' '
  TAB: 9,           // '\t'
  NEWLINE: 10,      // '\n'
  CARRIAGE_RETURN: 13, // '\r'
  DOUBLE_QUOTE: 34, // '"'
  SINGLE_QUOTE: 39, // "'"
  HASH: 35,         // '#'
  PLUS: 43,         // '+'
  MINUS: 45,        // '-'
  DOT: 46,          // '.'
  ZERO: 48,         // '0'
  NINE: 57,         // '9'
  COLON: 58,        // ':'
  COMMA: 44,        // ','
  CURLY_OPEN: 123,  // '{'
  CURLY_CLOSE: 125, // '}'
  BRACKET_OPEN: 91, // '['
  BRACKET_CLOSE: 93, // ']'
  BACKSLASH: 92,    // '\'
  TILDE: 126,       // '~'
  A_UPPER: 65,      // 'A'
  F_UPPER: 70,      // 'F'
  A_LOWER: 97,      // 'a'
  F_LOWER: 102,     // 'f'
  X_UPPER: 88,      // 'X'
  X_LOWER: 120,     // 'x'
  O_UPPER: 79,      // 'O'
  O_LOWER: 111,     // 'o'
  B_UPPER: 66,      // 'B'
  B_LOWER: 98       // 'b'
} as const;

// Pre-computed lookup for specific Unicode whitespace characters
// Exported for use in the tokenizer's fast whitespace checking
export const WHITESPACE_LOOKUP = new Set([
  0x1680, // Ogham space mark
  0x2028, // Line separator
  0x2029, // Paragraph separator
  0x202F, // Narrow no-break space
  0x205F, // Medium mathematical space
  0x3000, // Ideographic space
  0xFEFF  // BOM/Zero width no-break space
]);

/**
 * Fast digit checking using character codes.
 * @param charCode - Character code to check.
 * @returns True if the character code represents a digit (0-9).
 */
export const isDigitCode = (charCode: number): boolean =>
  charCode >= CHAR_CODES.ZERO && charCode <= CHAR_CODES.NINE;

/**
 * Fast whitespace checking using character codes.
 * This is the canonical implementation used by both is.ts and the tokenizer.
 * @param charCode - Character code to check.
 * @returns True if the character code represents whitespace.
 */
export const isWhitespaceCode = (charCode: number): boolean => {
  // Fast path: ASCII whitespace and control characters (U+0000 to U+0020)
  if (charCode <= 0x20) {
    return true;
  }

  // Fast path: Extended ASCII range (U+0021 to U+00FF) - only U+00A0 is whitespace
  if (charCode <= 0xFF) {
    return charCode === 0x00A0;
  }

  // Fast path: Anything above U+FEFF is never whitespace
  if (charCode > 0xFEFF) {
    return false;
  }

  // Fast path: Unicode range U+2000-U+200A (various em/en spaces)
  if (charCode >= 0x2000 && charCode <= 0x200A) {
    return true;
  }

  // Lookup table for remaining Unicode whitespace characters
  return WHITESPACE_LOOKUP.has(charCode);
};

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

/**
  * Check if the given character represents a whitespace.
  * @param {string} char - Character to check.
  * @param {boolean} hspacesOnly - If true, only check for horizontal spaces (space and tab).
  * @returns {boolean} True if the character is a whitespace, else false.
  */
export const isWhitespace = (char: string, hspacesOnly: boolean = false): boolean => {
  if (hspacesOnly) {
    return char === ' ' || char === '\t';
  }

  // Use codePointAt for proper Unicode handling, then delegate to the fast code-based check
  const code = char.codePointAt(0) || 0;
  return isWhitespaceCode(code);
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

/**
 * Check if the given character is a terminator at the character level.
 * Used during tokenization to identify structural boundaries.
 * @param {string} char - The character to check.
 * @returns {boolean} True if the character is a terminator.
 */
export const isCharTerminator = (char: string): boolean => {
  return char === Symbols.CURLY_OPEN ||
         char === Symbols.CURLY_CLOSE ||
         char === Symbols.BRACKET_OPEN ||
         char === Symbols.BRACKET_CLOSE ||
         char === Symbols.COLON ||
         char === Symbols.COMMA ||
         char === Symbols.TILDE ||
         char === Symbols.DOUBLE_QUOTE ||
         char === Symbols.SINGLE_QUOTE ||
         char === Symbols.HASH;  // # starts a comment
}

/**
 * Check if the given token type is a terminator (structural boundary character).
 * Terminators are used for error recovery, parsing boundaries, and token validation.
 * Note: String quotes (", ') are terminators at the character level (see isCharTerminator)
 * but not at the token level since they're consumed into STRING tokens.
 * @param {string} tokenType - The token type to check.
 * @returns {boolean} True if the token type is a terminator.
 */
export const isTerminator = (tokenType: string): boolean => {
  return tokenType === TokenType.COLLECTION_START ||  // ~ - collection item boundary
         tokenType === TokenType.SECTION_SEP ||        // --- - section boundary
         tokenType === TokenType.COMMA ||              // , - element delimiter
         tokenType === TokenType.COLON ||              // : - key-value separator
         tokenType === TokenType.BRACKET_OPEN ||       // [ - array start
         tokenType === TokenType.BRACKET_CLOSE ||      // ] - array end
         tokenType === TokenType.CURLY_OPEN ||         // { - object start
         tokenType === TokenType.CURLY_CLOSE;          // } - object end
}
