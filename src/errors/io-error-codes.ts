enum ErrorCodes {

  // General
  invalidType       = "invalid-type",
  tokenNotReady     = "token-not-ready",
  invalidValue      = "invalid-value",

  // -- string, number, date, datetime, time
  valueNotInChoice  = "value-not-in-choice",

  // -- string, array
  invalidMinLength  = "invalid-min-length",
  invalidMaxLength  = "invalid-max-length",

  // Number
  notANumber        = "not-a-number",
  invalidMinValue   = "invalid-min-value",
  invalidMaxValue   = "invalid-max-value",

  // String
  notAString        = "not-a-string",


  // Object


  // Array
}

export default ErrorCodes
