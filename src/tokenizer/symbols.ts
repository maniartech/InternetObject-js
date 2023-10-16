import { TILDE, HASH } from '../../../io-js/src/parser/constants';

/**
 * Enumeration representing special symbols in IO.
 */
enum Symbols {
  CURLY_OPEN      = '{',
  CURLY_CLOSE     = '}',
  BRACKET_OPEN    = '[',
  BRACKET_CLOSE   = ']',
  COLON           = ':',
  COMMA           = ',',
  R               = 'r',
  B               = 'b',
  D               = 'd',
  HASH            = '#',
  DOUBLE_QUOTE    = '"',
  SINGLE_QUOTE    = "'",
  BACKSLASH       = "\\",
  TILDE           = '~',
  PLUS            = '+',
  MINUS           = '-',
}

export default Symbols;