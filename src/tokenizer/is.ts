import Symbols from "./symbols";
import TokenType from "./token-types";

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
    Symbols.TILDE
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
  * @returns {boolean} True if the character is a whitespace, else false.
  */
export const isWhitespace  = (char: string): boolean => {
  // https://chat.openai.com/c/7afa551e-4739-46be-a1d6-bc168e809baf

  // If the character is a unicode whitespace character, return true.
  return /\s/.test(char);
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
