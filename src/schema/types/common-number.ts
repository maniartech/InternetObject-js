import Decimal from '../../core/decimal/decimal'
import ErrorCodes from '../../errors/io-error-codes'
import ValidationError from '../../errors/io-validation-error'
import Node from '../../parser/nodes/nodes'

/**
 * All supported number types
 */
export const NUMBER_TYPES = [
  'bigint', 'decimal',
  'int', 'uint', 'float', 'number',       // General number types
  'int8', 'int16', 'int32',               // Size specific number types
  'uint8', 'uint16', 'uint32', 'uint64',  // Unsigned number types
  'float32', 'float64'                    // Floating point number types
]

/**
 * The numeric types the spec RESERVES for a future version. Naming one is a format-level error --
 * every conformant implementation of this version must reject it -- so it reports `reserved-type`
 * rather than `unknown-type` (which means the name does not exist at all, i.e. a typo).
 *
 * Before ADR 0002 this family split by accident: `uint64`, `float32` and `float64` are registered
 * here and reported `unsupported-number-type`, while `int64` is not registered and reported
 * `invalid-type` -- the same code as a plain typo. The implementation's registry was deciding the
 * error code. See ADR 0002, the error-code grammar and taxonomy — decision record kept with the maintainers (not shipped) §3.
 */
export const RESERVED_TYPES = new Set(['int64', 'uint64', 'float32', 'float64'])

/**
 * The code for a type NAME that cannot be used: `reserved-type` when the spec reserves it for a
 * future version, `unknown-type` when there is no such type at all (a typo).
 *
 * Every site that rejects a type name calls this. The distinction previously depended on whether
 * a given name happened to be present in the typedef registry, which put an implementation detail
 * in charge of the error code -- `int64` reported the same code as `nosuchtype`.
 */
export function unusableTypeCode(type: string | undefined): string {
  return RESERVED_TYPES.has(type ?? '') ? ErrorCodes.reservedType : ErrorCodes.unknownType
}

/** Declared numeric types whose values are integers. */
const INTEGER_TYPES = new Set([
  'int', 'uint', 'int8', 'int16', 'int32', 'uint8', 'uint16', 'uint32'
])

/**
 * The `expected-<type>` code for a declared numeric type — a TYPE problem (this is not a number at
 * all). One code per type so a missing one is visible; previously every numeric type fell back to
 * the generic `invalid-type`, which is why `expected-decimal` and `expected-bigint` did not exist.
 */
export function expectedCodeFor(type: string | undefined): string {
  if (type === 'bigint') return ErrorCodes.expectedBigInt
  if (type === 'decimal') return ErrorCodes.expectedDecimal
  return INTEGER_TYPES.has(type ?? '') ? ErrorCodes.expectedInteger : ErrorCodes.expectedNumber
}

/**
 * Map for quick type lookup
 */
export const NUMBER_MAP = NUMBER_TYPES.reduce((acc, type) => {
  acc[type] = true
  return acc
}, {} as { [key: string]: boolean })

/**
 * The non-decimal display `format`s, mapped to the IO literal prefix and the radix.
 *
 * A format changes only how a value is *spelled*, never what it is, so a writer emits the
 * prefix along with the digits — `0xff`, not `ff`. Bare digits would read back as an open
 * string (or, for `binary`/`octal`, as a decimal number), which the member's own schema
 * then rejects.
 */
export const RADIX_FORMATS = {
  hex:    ['0x', 16],
  octal:  ['0o', 8],
  binary: ['0b', 2],
} as const

/**
 * Helper function for throwing validation errors
 */
export function throwError(code: string, memberPath: string, value: any, node?: Node) {
  // Generate appropriate error message based on error code
  let message: string;

  // `expected-*` is matched by PREDICATE because every type has its own code and they all want one
  // sentence; switching on the exact code would need a case per type and would silently fall through
  // to the generic message the day a type is added. The bound codes are matched exactly, because
  // each says something different: below a DECLARED minimum, above a DECLARED maximum, or outside
  // the TYPE's own range -- three distinct fixes for the reader.
  if (code.startsWith('expected-')) {
    message = `The '${memberPath}' has an invalid type. ${value}`;
  } else if (code === ErrorCodes.mismatchedMin) {
    message = `The '${memberPath}' is below the declared minimum, currently ${value}.`;
  } else if (code === ErrorCodes.mismatchedMax) {
    message = `The '${memberPath}' is above the declared maximum, currently ${value}.`;
  } else if (code.startsWith('out-of-range-')) {
    message = `The '${memberPath}' does not fit its declared type, currently ${value}.`;
  } else {
    switch (code) {
      case ErrorCodes.mismatchedScale:
        message = `The '${memberPath}' has an invalid scale. ${value}`;
        break;
      case ErrorCodes.mismatchedPrecision:
        message = `The '${memberPath}' has an invalid precision. ${value}`;
        break;
      default:
        message = `The '${memberPath}' validation failed. ${value}`;
    }
  }

  throw new ValidationError(code, message, node);
}

/**
 * Get the number of integer digits in a decimal
 */
export function getIntegerDigits(decimal: Decimal): number {
  const valueStr = decimal.toString()
  return valueStr.split('.')[0].replace('-', '').length
}
