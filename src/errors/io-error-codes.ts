enum ErrorCodes {
  // General
  invalidType = 'invalid-type',
  // tokenNotReady = 'token-not-ready',
  invalidValue = 'invalid-value',
  invalidArray = 'invalid-array',
  invalidObject = 'invalid-object',
  valueRequired = 'value-required',
  nullNotAllowed = 'null-not-allowed',
  invalidSchemaName = 'invalid-schema-name',
  // notAllowed = 'not-allowed',

  // Parser Errors (Header)
  unexpectedToken = 'unexpected-token',
  expectingBracket = 'expecting-bracket',
  // unexpectedColon = 'unexpected-colon',
  // multipleHeaders = 'multiple-headers-found',
  // invalidCollection = 'invalid-collection',
  // invlidHeader = 'invalid-header',
  // invalidHeaderItem = 'invalid-header-item',
  // expectingSeparator = 'expecting-a-separator',
  // openBracket = 'open-bracket',
  // invalidBracket = 'invalid-bracket',
  // incompleteEscapeSequence = 'incomplete-escape-sequence',
  unexpectedPositionalMember = 'unexpected-positional-member',

  // Parser Errors (Schema)
  invalidSchema = 'invalid-schema',
  schemaNotFound = 'schema-not-found',
  schemaMissing = 'schema-missing',

  emptyMemberDef = 'empty-memberdef',
  invalidDefinition = 'invalid-definition',
  invalidKey = 'invalid-key',
  // invalidMemberDefCondition = 'invalid-memberdef-condition',
  invalidMemberDef = 'invalid-memberdef',

  // Variables
  variableNotDefined = 'variable-not-defined',

  // Array
  notAnArray = 'not-an-array',

  // String
  notAString = 'not-a-string',
  // invalidChar = 'invalid-char',
  invalidEmail = 'invalid-email',
  invalidUrl = 'invalid-url',
  stringNotClosed = 'string-not-closed',
  invalidEscapeSequence = 'invalid-escape-sequence',
  unsupportedAnnotation = 'unsupported-annotation',

  // -- string, number, date, datetime, time
  // valueNotInChoice = 'value-not-in-choice',
  invalidChoice = 'invalid-choice',

  // -- string, array
  invalidLength = 'invalid-length',
  invalidMinLength = 'invalid-min-length',
  invalidMaxLength = 'invalid-max-length',
  invalidPattern = 'invalid-pattern',

  // Number
  notANumber = 'not-a-number',
  notAnInteger = 'not-an-integer',
  outOfRange = 'out-of-range',
  invalidMinValue = 'invalid-min-value',
  invalidMaxValue = 'invalid-max-value',

  // Boolean
  notABool = 'not-a-bool',

  // DateTime
  invalidDateTime = 'invalid-datetime'
}

export default ErrorCodes
