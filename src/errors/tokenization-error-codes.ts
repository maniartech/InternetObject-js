/**
 * Error codes specific to the tokenization phase.
 *
 * Naming follows ADR 0002: `<predicate>-<subject>`. Every code here uses `invalid-` (a literal of
 * the right shape that is malformed) or `unterminated-` / `unknown-`.
 */
enum TokenizationErrorCodes {
  // String tokenization
  unterminatedString = 'unterminated-string',
  invalidEscapeSequence = 'invalid-escape-sequence',

  // The annotation set (`r`, `b`, `dt`, `d`, `t`) is CLOSED by the spec, so an unrecognized one is
  // `unknown-` (not a member of an allowed set) rather than `unsupported-` — no implementation may
  // add a sixth. See ADR 0002 §3 on why `unsupported-` is not a permitted predicate.
  unknownAnnotation = 'unknown-annotation',

  // Binary tokenization. The subject is the TYPE the marker claims, not the encoding it uses:
  // `b'...'` claims `binary`, exactly as `dt'...'` claims `datetime`. It was `invalid-base64`,
  // which named the encoding and made this the one literal code that did not name a type —
  // and `base64` is not a type in this format at all.
  invalidBinary = 'invalid-binary',

  // Temporal tokenization — one code per temporal type, because each marker claims a different
  // one. `d'2024-13-45'` used to report `invalid-datetime`, naming a type the author never wrote.
  //
  // This is the same gap that `expected-date` / `expected-time` closed on the type-mismatch side
  // (ADR 0003 §4); the malformed-literal side had kept a single code. The two families are now
  // symmetric, which is what makes a missing cell visible:
  //
  //     expected-datetime   expected-date   expected-time
  //     invalid-datetime    invalid-date    invalid-time
  invalidDateTime = 'invalid-datetime',
  invalidDate = 'invalid-date',
  invalidTime = 'invalid-time',

  // BigInt tokenization (e.g. a `n` suffix on a non-integer mantissa: `12.3n`)
  invalidBigInt = 'invalid-bigint',

  // Decimal tokenization (e.g. a `m` suffix on a malformed mantissa: `.5m`, `123.m`)
  invalidDecimal = 'invalid-decimal',

  // A numeric literal of recognizable SHAPE that does not decode: a prefix with no digits (`0x`,
  // `0b`), digits outside the radix (`0o89`, `0xGH`), a separated prefix (`0b 1010`), or a malformed
  // mantissa (`1.2.3`, `--5`, `1e`).
  //
  // ADR 0002 deferred this code because nothing emitted it; ADR 0003 §2 lands it with its site. The
  // behaviour it replaces was not a missing diagnostic but a WRONG VALUE — `0xGH` decoded as the
  // open string `"0xGH"`, and `1e` as the number `1`. A port that rejects and a port that returns a
  // string do not disagree about the error, they disagree about what the document CONTAINS.
  invalidNumber = 'invalid-number'
}

export default TokenizationErrorCodes
