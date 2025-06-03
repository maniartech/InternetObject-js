import {
  isSpecialSymbol,
  isDigit,
  isWhitespace,
  isValidNewline,
  isValidOpenStringChar,
  getSymbolTokenType
} from '../../../src/parser/tokenizer/is';
import Symbols from '../../../src/parser/tokenizer/symbols';
import TokenType from '../../../src/parser/tokenizer/token-types';

describe('is.ts utility functions', () => {

  describe('isSpecialSymbol', () => {
    test('should return true for curly braces', () => {
      expect(isSpecialSymbol('{')).toBe(true);
      expect(isSpecialSymbol('}')).toBe(true);
    });

    test('should return true for square brackets', () => {
      expect(isSpecialSymbol('[')).toBe(true);
      expect(isSpecialSymbol(']')).toBe(true);
    });

    test('should return true for colon and comma', () => {
      expect(isSpecialSymbol(':')).toBe(true);
      expect(isSpecialSymbol(',')).toBe(true);
    });

    test('should return true for tilde', () => {
      expect(isSpecialSymbol('~')).toBe(true);
    });

    test('should return true for quotes', () => {
      expect(isSpecialSymbol('"')).toBe(true);
      expect(isSpecialSymbol("'")).toBe(true);
    });

    test('should return false for regular alphabetic characters', () => {
      expect(isSpecialSymbol('a')).toBe(false);
      expect(isSpecialSymbol('Z')).toBe(false);
      expect(isSpecialSymbol('m')).toBe(false);
    });

    test('should return false for digits', () => {
      expect(isSpecialSymbol('0')).toBe(false);
      expect(isSpecialSymbol('5')).toBe(false);
      expect(isSpecialSymbol('9')).toBe(false);
    });

    test('should return false for whitespace characters', () => {
      expect(isSpecialSymbol(' ')).toBe(false);
      expect(isSpecialSymbol('\t')).toBe(false);
      expect(isSpecialSymbol('\n')).toBe(false);
      expect(isSpecialSymbol('\r')).toBe(false);
    });

    test('should return false for other special characters not in symbols list', () => {
      expect(isSpecialSymbol('!')).toBe(false);
      expect(isSpecialSymbol('@')).toBe(false);
      expect(isSpecialSymbol('#')).toBe(false);
      expect(isSpecialSymbol('$')).toBe(false);
      expect(isSpecialSymbol('%')).toBe(false);
      expect(isSpecialSymbol('^')).toBe(false);
      expect(isSpecialSymbol('&')).toBe(false);
      expect(isSpecialSymbol('*')).toBe(false);
      expect(isSpecialSymbol('(')).toBe(false);
      expect(isSpecialSymbol(')')).toBe(false);
    });

    test('should return false for Unicode characters', () => {
      expect(isSpecialSymbol('α')).toBe(false);
      expect(isSpecialSymbol('中')).toBe(false);
      expect(isSpecialSymbol('🙂')).toBe(false);
    });

    test('should return false for empty string', () => {
      expect(isSpecialSymbol('')).toBe(false);
    });
  });

  describe('isDigit', () => {
    test('should return true for single digits 0-9', () => {
      for (let i = 0; i <= 9; i++) {
        expect(isDigit(i.toString())).toBe(true);
      }
    });

    test('should return false for alphabetic characters', () => {
      expect(isDigit('a')).toBe(false);
      expect(isDigit('Z')).toBe(false);
      expect(isDigit('m')).toBe(false);
    });

    test('should return false for special characters', () => {
      expect(isDigit('!')).toBe(false);
      expect(isDigit('@')).toBe(false);
      expect(isDigit('#')).toBe(false);
      expect(isDigit('$')).toBe(false);
      expect(isDigit('%')).toBe(false);
    });

    test('should return false for whitespace characters', () => {
      expect(isDigit(' ')).toBe(false);
      expect(isDigit('\t')).toBe(false);
      expect(isDigit('\n')).toBe(false);
      expect(isDigit('\r')).toBe(false);
    });

    test('should return false for Unicode digit-like characters', () => {
      expect(isDigit('①')).toBe(false); // Circled digit one
      expect(isDigit('¹')).toBe(false); // Superscript one
      expect(isDigit('₁')).toBe(false); // Subscript one
    });    test('should return true for multiple characters with first char being digit', () => {
      // The regex /[0-9]/ tests only the first character, so '12' returns true
      expect(isDigit('12')).toBe(true);
      expect(isDigit('00')).toBe(true);
      expect(isDigit('9abc')).toBe(true);
    });

    test('should return false for empty string', () => {
      expect(isDigit('')).toBe(false);
    });

    test('should return false for negative sign and plus', () => {
      expect(isDigit('-')).toBe(false);
      expect(isDigit('+')).toBe(false);
    });

    test('should return false for decimal point', () => {
      expect(isDigit('.')).toBe(false);
    });
  });

  describe('isWhitespace', () => {
    test('should return true for common ASCII whitespace characters', () => {
      expect(isWhitespace(' ')).toBe(true);  // Space
      expect(isWhitespace('\t')).toBe(true); // Tab
      expect(isWhitespace('\n')).toBe(true); // Line feed
      expect(isWhitespace('\r')).toBe(true); // Carriage return
      expect(isWhitespace('\v')).toBe(true); // Vertical tab
      expect(isWhitespace('\f')).toBe(true); // Form feed
    });

    test('should return true for ASCII control characters (U+0000 to U+0020)', () => {
      for (let i = 0; i <= 0x20; i++) {
        expect(isWhitespace(String.fromCharCode(i))).toBe(true);
      }
    });

    test('should return true for non-breaking space (U+00A0)', () => {
      expect(isWhitespace('\u00A0')).toBe(true);
    });

    test('should return true for Unicode whitespace characters in range U+2000-U+200A', () => {
      for (let i = 0x2000; i <= 0x200A; i++) {
        expect(isWhitespace(String.fromCharCode(i))).toBe(true);
      }
    });

    test('should return true for specific Unicode whitespace characters', () => {
      expect(isWhitespace('\u1680')).toBe(true); // Ogham space mark
      expect(isWhitespace('\u2028')).toBe(true); // Line separator
      expect(isWhitespace('\u2029')).toBe(true); // Paragraph separator
      expect(isWhitespace('\u202F')).toBe(true); // Narrow no-break space
      expect(isWhitespace('\u205F')).toBe(true); // Medium mathematical space
      expect(isWhitespace('\u3000')).toBe(true); // Ideographic space
      expect(isWhitespace('\uFEFF')).toBe(true); // BOM/Zero width no-break space
    });

    test('should return false for regular alphabetic characters', () => {
      expect(isWhitespace('a')).toBe(false);
      expect(isWhitespace('Z')).toBe(false);
      expect(isWhitespace('m')).toBe(false);
    });

    test('should return false for digits', () => {
      expect(isWhitespace('0')).toBe(false);
      expect(isWhitespace('5')).toBe(false);
      expect(isWhitespace('9')).toBe(false);
    });

    test('should return false for special symbols', () => {
      expect(isWhitespace('{')).toBe(false);
      expect(isWhitespace('}')).toBe(false);
      expect(isWhitespace(':')).toBe(false);
      expect(isWhitespace(',')).toBe(false);
    });

    test('should return false for Unicode characters above U+FEFF', () => {
      expect(isWhitespace('🙂')).toBe(false); // Emoji
      expect(isWhitespace('中')).toBe(false);   // Chinese character
      expect(isWhitespace('α')).toBe(false);   // Greek letter
    });

    test('should return false for extended ASCII range except U+00A0', () => {
      // Test some characters in range U+0021 to U+00FF (excluding U+00A0)
      expect(isWhitespace('!')).toBe(false);   // U+0021
      expect(isWhitespace('~')).toBe(false);   // U+007E
      expect(isWhitespace('¡')).toBe(false);   // U+00A1
      expect(isWhitespace('ÿ')).toBe(false);   // U+00FF
    });    test('should return true for empty string', () => {
      // Empty string has codePointAt(0) returning undefined, which becomes 0 when || 0 is applied
      // Since 0 <= 0x20, it returns true
      expect(isWhitespace('')).toBe(true);
    });
  });

  describe('isValidNewline', () => {
    test('should return true for carriage return', () => {
      expect(isValidNewline('\r')).toBe(true);
    });

    test('should return true for line feed', () => {
      expect(isValidNewline('\n')).toBe(true);
    });

    test('should return false for other whitespace characters', () => {
      expect(isValidNewline(' ')).toBe(false);
      expect(isValidNewline('\t')).toBe(false);
      expect(isValidNewline('\v')).toBe(false);
      expect(isValidNewline('\f')).toBe(false);
    });

    test('should return false for alphabetic characters', () => {
      expect(isValidNewline('a')).toBe(false);
      expect(isValidNewline('Z')).toBe(false);
    });

    test('should return false for digits', () => {
      expect(isValidNewline('0')).toBe(false);
      expect(isValidNewline('9')).toBe(false);
    });

    test('should return false for special characters', () => {
      expect(isValidNewline('{')).toBe(false);
      expect(isValidNewline(':')).toBe(false);
      expect(isValidNewline('!')).toBe(false);
    });

    test('should return false for Unicode newline-like characters', () => {
      expect(isValidNewline('\u2028')).toBe(false); // Line separator
      expect(isValidNewline('\u2029')).toBe(false); // Paragraph separator
    });

    test('should return false for empty string', () => {
      expect(isValidNewline('')).toBe(false);
    });

    test('should return false for multiple characters', () => {
      expect(isValidNewline('\r\n')).toBe(false);
      expect(isValidNewline('\n\r')).toBe(false);
    });
  });

  describe('isValidOpenStringChar', () => {
    test('should return false for terminator symbols', () => {
      expect(isValidOpenStringChar('{')).toBe(false);
      expect(isValidOpenStringChar('}')).toBe(false);
      expect(isValidOpenStringChar('[')).toBe(false);
      expect(isValidOpenStringChar(']')).toBe(false);
      expect(isValidOpenStringChar(':')).toBe(false);
      expect(isValidOpenStringChar(',')).toBe(false);
      expect(isValidOpenStringChar('#')).toBe(false);
      expect(isValidOpenStringChar('"')).toBe(false);
      expect(isValidOpenStringChar("'")).toBe(false);
      expect(isValidOpenStringChar('~')).toBe(false);
    });

    test('should return true for alphabetic characters', () => {
      expect(isValidOpenStringChar('a')).toBe(true);
      expect(isValidOpenStringChar('Z')).toBe(true);
      expect(isValidOpenStringChar('m')).toBe(true);
    });

    test('should return true for digits', () => {
      expect(isValidOpenStringChar('0')).toBe(true);
      expect(isValidOpenStringChar('5')).toBe(true);
      expect(isValidOpenStringChar('9')).toBe(true);
    });

    test('should return true for whitespace characters', () => {
      expect(isValidOpenStringChar(' ')).toBe(true);
      expect(isValidOpenStringChar('\t')).toBe(true);
      expect(isValidOpenStringChar('\n')).toBe(true);
      expect(isValidOpenStringChar('\r')).toBe(true);
    });

    test('should return true for non-terminator special characters', () => {
      expect(isValidOpenStringChar('!')).toBe(true);
      expect(isValidOpenStringChar('@')).toBe(true);
      expect(isValidOpenStringChar('$')).toBe(true);
      expect(isValidOpenStringChar('%')).toBe(true);
      expect(isValidOpenStringChar('^')).toBe(true);
      expect(isValidOpenStringChar('&')).toBe(true);
      expect(isValidOpenStringChar('*')).toBe(true);
      expect(isValidOpenStringChar('(')).toBe(true);
      expect(isValidOpenStringChar(')')).toBe(true);
      expect(isValidOpenStringChar('-')).toBe(true);
      expect(isValidOpenStringChar('+')).toBe(true);
      expect(isValidOpenStringChar('=')).toBe(true);
      expect(isValidOpenStringChar('|')).toBe(true);
      expect(isValidOpenStringChar('\\')).toBe(true);
      expect(isValidOpenStringChar('?')).toBe(true);
      expect(isValidOpenStringChar('/')).toBe(true);
      expect(isValidOpenStringChar('<')).toBe(true);
      expect(isValidOpenStringChar('>')).toBe(true);
      expect(isValidOpenStringChar('.')).toBe(true);
    });

    test('should return true for Unicode characters', () => {
      expect(isValidOpenStringChar('α')).toBe(true);
      expect(isValidOpenStringChar('中')).toBe(true);
      expect(isValidOpenStringChar('🙂')).toBe(true);
    });

    test('should return true for empty string', () => {
      expect(isValidOpenStringChar('')).toBe(true);
    });
  });

  describe('getSymbolTokenType', () => {
    test('should return correct token types for curly braces', () => {
      expect(getSymbolTokenType('{')).toBe(TokenType.CURLY_OPEN);
      expect(getSymbolTokenType('}')).toBe(TokenType.CURLY_CLOSE);
    });

    test('should return correct token types for square brackets', () => {
      expect(getSymbolTokenType('[')).toBe(TokenType.BRACKET_OPEN);
      expect(getSymbolTokenType(']')).toBe(TokenType.BRACKET_CLOSE);
    });

    test('should return correct token type for colon', () => {
      expect(getSymbolTokenType(':')).toBe(TokenType.COLON);
    });

    test('should return correct token type for comma', () => {
      expect(getSymbolTokenType(',')).toBe(TokenType.COMMA);
    });

    test('should return correct token type for tilde (collection start)', () => {
      expect(getSymbolTokenType('~')).toBe(TokenType.COLLECTION_START);
    });

    test('should return UNKNOWN for unrecognized symbols', () => {
      expect(getSymbolTokenType('!')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('@')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('#')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('$')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('%')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('^')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('&')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('*')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('(')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType(')')).toBe(TokenType.UNKNOWN);
    });

    test('should return UNKNOWN for alphabetic characters', () => {
      expect(getSymbolTokenType('a')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('Z')).toBe(TokenType.UNKNOWN);
    });

    test('should return UNKNOWN for digits', () => {
      expect(getSymbolTokenType('0')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('9')).toBe(TokenType.UNKNOWN);
    });

    test('should return UNKNOWN for whitespace characters', () => {
      expect(getSymbolTokenType(' ')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('\t')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('\n')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('\r')).toBe(TokenType.UNKNOWN);
    });

    test('should return UNKNOWN for quotes (not handled in this function)', () => {
      expect(getSymbolTokenType('"')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType("'")).toBe(TokenType.UNKNOWN);
    });

    test('should return UNKNOWN for Unicode characters', () => {
      expect(getSymbolTokenType('α')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('中')).toBe(TokenType.UNKNOWN);
      expect(getSymbolTokenType('🙂')).toBe(TokenType.UNKNOWN);
    });

    test('should return UNKNOWN for empty string', () => {
      expect(getSymbolTokenType('')).toBe(TokenType.UNKNOWN);
    });
  });
});