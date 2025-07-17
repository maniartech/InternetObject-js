import GeneralErrorCodes from './general-error-codes'
import TokenizationErrorCodes from './tokenization-error-codes'
import ParsingErrorCodes from './parsing-error-codes'
import ValidationErrorCodes from './validation-error-codes'

/**
 * Consolidated error codes from all categories
 */
const ErrorCodes = {
  ...GeneralErrorCodes,
  ...TokenizationErrorCodes,
  ...ParsingErrorCodes,
  ...ValidationErrorCodes
} as const

// Export individual categories for specific use cases
export { GeneralErrorCodes, TokenizationErrorCodes, ParsingErrorCodes, ValidationErrorCodes }

export default ErrorCodes
