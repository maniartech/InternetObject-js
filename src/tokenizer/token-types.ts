
/**
* Enumeration representing types of tokens.
*/
enum TokenType {
  CURLY_OPEN        = 'CURLEY_OPEN',
  CURLY_CLOSE       = 'CURLY_CLOSE',
  BRACKET_OPEN      = 'BRACKET_OPEN',
  BRACKET_CLOSE     = 'BRACKET_CLOSE',
  COLON             = 'COLON',
  COMMA             = 'COMMA',
  STRING            = 'STRING',
  BINARY            = 'BINARY',
  NUMBER            = 'NUMBER',
  BOOLEAN           = 'BOOLEAN',
  NULL              = 'NULL',
  DATE_TIME         = 'DATE_TIME',
  WHITESPACE        = 'WHITESPACE',
  SECTION_SEP       = 'SECTION_SEP',
  COLLECTION_START  = 'COLLECTION_START',
  UNKNOWN           = 'UNKNOWN',
}

export default TokenType;
