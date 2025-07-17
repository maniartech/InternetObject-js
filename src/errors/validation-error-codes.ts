/**
 * Error codes specific to validation phase (schema validation)
 */
enum ValidationErrorCodes {
  // Object validation
  invalidObject = 'invalid-object',
  unknownMember = 'unknown-member',
  duplicateMember = 'duplicate-member',
  additionalValuesNotAllowed = 'additional-values-not-allowed',

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

  // Boolean validation
  notABool = 'not-a-bool',

  // Choice validation
  invalidChoice = 'invalid-choice'
}

export default ValidationErrorCodes