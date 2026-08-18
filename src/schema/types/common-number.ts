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

  switch (code) {
    case ErrorCodes.invalidType:
      message = `The '${memberPath}' has an invalid type. ${value}`;
      break;
    case ErrorCodes.invalidRange:
      message = `The '${memberPath}' must be within the specified range, Currently it is ${value}.`;
      break;
    case ErrorCodes.invalidScale:
      message = `The '${memberPath}' has an invalid scale. ${value}`;
      break;
    case ErrorCodes.invalidPrecision:
      message = `The '${memberPath}' has an invalid precision. ${value}`;
      break;
    default:
      message = `The '${memberPath}' validation failed. ${value}`;
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
