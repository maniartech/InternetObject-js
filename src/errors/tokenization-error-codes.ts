/**
 * Error codes specific to tokenization phase
 */
enum TokenizationErrorCodes {
  // String tokenization
  stringNotClosed = 'string-not-closed',
  invalidEscapeSequence = 'invalid-escape-sequence',
  unsupportedAnnotation = 'unsupported-annotation',

  // Binary/Base64 tokenization
  invalidBase64 = 'invalid-base64',

  // DateTime tokenization
  invalidDateTime = 'invalid-datetime'
}

export default TokenizationErrorCodes