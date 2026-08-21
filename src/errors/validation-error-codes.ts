/**
 * Error codes specific to validation phase (schema validation)
 */
enum ValidationErrorCodes {
  // Object validation
  invalidObject = 'invalid-object',
  // A closed schema was given a member it does not declare. ONE code for every spelling of that
  // fault: a surplus POSITIONAL value, a surplus NAMED member, and a memberdef option the typedef
  // does not declare (a memberdef is itself a record validated against the typedef's own member
  // schema, so it is this same rule one level up). `additional-values-not-allowed` used to cover
  // the positional case alone, which meant the same fault reported different codes depending on
  // how the data arrived -- and a native caller, having only named members, could never see it.
  // See io-js2 docs/decisions/0002-error-code-grammar-and-taxonomy.md §6.4.
  unknownMember = 'unknown-member',
  duplicateMember = 'duplicate-member',

  // Array validation
  invalidArray = 'invalid-array',
  notAnArray = 'not-an-array',

  // String validation
  notAString = 'not-a-string',
  invalidEmail = 'invalid-email',
  invalidUrl = 'invalid-url',
  invalidLength = 'invalid-length',
  invalidMinLength = 'invalid-min-length',
  invalidMaxLength = 'invalid-max-length',
  invalidPattern = 'invalid-pattern',

  // Number validation
  unsupportedNumberType = 'unsupported-number-type',
  notANumber = 'not-a-number',
  notAnInteger = 'not-an-integer',
  outOfRange = 'out-of-range',
  invalidRange = 'invalid-range',
  invalidScale = 'invalid-scale',
  invalidPrecision = 'invalid-precision',

  // Boolean validation
  notABool = 'not-a-bool',

  // Choice validation
  invalidChoice = 'invalid-choice',

  // Schema/definition resolution (raised as IOValidationError)
  schemaNotDefined = 'schema-not-defined'
}

export default ValidationErrorCodes