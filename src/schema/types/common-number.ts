import Decimal from '../../core/decimal'
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
 * Helper function for throwing validation errors
 */
export function throwError(code: string, memberPath: string, value: any, node?: Node) {
  throw new ValidationError(
    code,
    `The '${memberPath}' must be within the specified range, Currently it is ${value}.`,
    node
  )
}

/**
 * Get the number of integer digits in a decimal
 */
export function getIntegerDigits(decimal: Decimal): number {
  const valueStr = decimal.toString()
  return valueStr.split('.')[0].replace('-', '').length
}
