enum ErrorCodes {

  // General
  invalidType               = "invalid-type",
  tokenNotReady             = "token-not-ready",
  invalidValue              = "invalid-value",

  // Parser Errors (Header)
  multipleHeaders           = "multiple-headers-found",
  invalidCollection         = "invalid-collection",
  invlidHeader              = "invalid-header",
  invalidHeaderItem         = "invalid-header-item",
  expectingSeparator        = "expecting-a-separator",
  openBracket               = "open-bracket",
  invalidBracket            = "invalid-bracket",
  incompleteEscapeSequence  = "incomplete-escape-sequence",

  // Parser Errors (Schema)
  invalidSchema             = "invalid-schema",

  // -- string, number, date, datetime, time
  valueNotInChoice          = "value-not-in-choice",

  // -- string, array
  invalidMinLength          = "invalid-min-length",
  invalidMaxLength          = "invalid-max-length",
  invalidChar               = "invalid-char",
  invalidEmail              = "invalid-email",
  invalidUrl                = "invalid-url",

  // Number
  notANumber                = "not-a-number",
  notAnInteger              = "not-an-integer",
  outOfRange                = "out-of-range",
  invalidMinValue           = "invalid-min-value",
  invalidMaxValue           = "invalid-max-value",

  // String
  notAString                = "not-a-string",

  // Object


  // Array
}

export default ErrorCodes
