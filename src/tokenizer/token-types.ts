
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
  BIGINT            = 'BIGINT',
  BOOLEAN           = 'BOOLEAN',
  NULL              = 'NULL',
  UNDEFINED         = 'UNDEFINED',
  DATETIME          = 'DATETIME',
  DATE              = 'DATE',
  TIME              = 'TIME',
  WHITESPACE        = 'WHITESPACE',
  SECTION_SEP       = 'SECTION_SEP',
  SECTION_SCHEMA    = 'SECTION_SCHEMA',
  SECTION_NAME      = 'SECTION_NAME',
  COLLECTION_START  = 'COLLECTION_START',
  UNKNOWN           = 'UNKNOWN',
}

export default TokenType;
