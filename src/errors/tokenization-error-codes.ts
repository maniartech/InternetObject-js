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
  invalidDateTime = 'invalid-datetime',

  // BigInt tokenization (e.g. a `n` suffix on a non-integer mantissa: `12.3n`)
  invalidBigInt = 'invalid-bigint',

  // Decimal tokenization (e.g. a `m` suffix on a malformed mantissa: `.5m`, `123.m`)
  invalidDecimal = 'invalid-decimal'
}

export default TokenizationErrorCodes