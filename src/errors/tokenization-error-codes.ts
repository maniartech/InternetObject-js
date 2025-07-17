/**
 * Error codes specific to tokenization phase
 */
enum TokenizationErrorCodes {
  // String tokenization
  stringNotClosed = 'string-not-closed',
  invalidEscapeSequence = 'invalid-escape-sequence',
  unsupportedAnnotation = 'unsupported-annotation',
  
  // DateTime tokenization
  invalidDateTime = 'invalid-datetime'
}

export default TokenizationErrorCodes