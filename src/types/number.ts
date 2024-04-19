import Definitions          from '../core/definitions'
import ValidationError      from '../errors/io-validation-error'
import ErrorCodes           from '../errors/io-error-codes'
import Node                 from '../parser/nodes/nodes'
import TokenNode            from '../parser/nodes/tokens'
import Schema               from '../schema/schema'
import MemberDef            from './memberdef'
import TypeDef              from '../schema/typedef'
import doCommonTypeCheck    from './common-type'
import InternetObjectError  from '../errors/io-error'

const NUMBER_TYPES = [
  'bigint',
  'int', 'uint', 'float', 'number',       // General number types
  'int8', 'int16', 'int32',               // Size specific number types
  'uint8', 'uint16', 'uint32', 'uint64',  // Unsigned number types
  'float32', 'float64'                    // Floating point number types
]

const schema = new Schema(
  "number",
  { type:     { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:  { type: "number", optional: true,  null: false  } },
  { choices:  { type: "array",  optional: true,  null: false, of: { type: "number" } } },
  { min:      { type: "number", optional: true,  null: false, min: 0 } },
  { max:      { type: "number", optional: true,  null: false, min: 0 } },
  { optional: { type: "bool",   optional: true,  null: false, default: false } },
  { null:     { type: "bool",   optional: true,  null: false, default: false } },
)

/**
 * Represents the various number related data types in Internet Object.
 *
 * @internal
 */
class NumberDef implements TypeDef {
  private _type: string
  private _validator: any

  static get types() { return NUMBER_TYPES }

  constructor(type: string = 'number') {
    this._type = type
    this._validator = _getValidator(type)
  }

  get type() { return this._type }
  get schema() { return schema }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions): number {
    return this.#validate(this._validator, node, memberDef, defs)
  }

  // Performs following validations.
  //  * - Value is number, int, int32, int16, byte
  //  * - Value is optional
  //  * - Value is nullable
  //  * - Value >= schema.min
  //  * - Value <= schema.max
  //  * - Value is in choices
  #validate(
    validator: any,
    node: Node, memberDef: MemberDef, defs?: Definitions
  ) {
    const valueNode = defs?.getV(node) || node
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    const valueType = typeof value === "bigint" ? "bigint" : "number"
    const memberdefType = memberDef.type === "bigint" ? "bigint" : "number"

    if (valueNode instanceof TokenNode === false || memberdefType !== valueType) {
      throw new ValidationError(
        `not-a-${memberDef.type}`,
        `Invalid value encountered for '${memberDef.path}'`,
        node
      )
    }

    validator(memberDef, value, node)

    if (memberDef.min !== undefined) {
      const min = memberDef.min
      if (memberDef.min !== undefined && value < min) {
        throw new ValidationError(
          ErrorCodes.invalidMinValue,
          `The '${memberDef.path}' must be greater than or equal to ${min}, Currently it is ${value}.`,
          node
        )
      }
    }

    if (memberDef.max !== undefined && value > memberDef.max) {
      throw new ValidationError(
        ErrorCodes.invalidMaxValue,
        `The '${memberDef.path}' must be less than or equal to ${memberDef.max}, Currently it is ${value}.`,
        node
      )
    }

    return value
  }
}

function _intValidator(min: number | null, max: number | null, memberDef: MemberDef, value: any, node?: Node) {
  if (min === null || max === null) return

  if (value % 1 !== 0) {
    throw new ValidationError(
      ErrorCodes.notAnInteger,
      `Expecting an integer value for '${memberDef.path}', Currently it is ${value}.`,
      node
    )
  }

  if (min !== null && value < min) {
    throw new ValidationError(
      ErrorCodes.invalidMinValue,
      `The '${memberDef.path}' must be greater than or equal to ${min}, Currently it is ${value}.`,
      node
    )
  }

  if (max !== null && value > max) {
    throw new ValidationError(
      ErrorCodes.invalidMaxValue,
      `The '${memberDef.path}' must be less than or equal to ${max}, Currently it is ${value}.`,
      node
    )
  }
}

function _getValidator(type: string) {
  switch (type) {
    case 'float':
    case 'float64':
    case 'number': {
      return (memberDef: MemberDef, value: any, node?: Node) => {
        if (typeof Number(value) !== 'number') {
          throw new ValidationError(
            ErrorCodes.notANumber,
            `Expecting a number value for '${memberDef.path}', Currently it is ${value}.`,
            node
          )
        }
      }
    }

    case 'int8': {
      const range = 2 ** 8 // -128,127
      return _intValidator.bind(null, -(range / 2), range / 2 - 1)
    }

    case 'uint8': {
      const range = 2 ** 8 // 0,255
      return _intValidator.bind(null, 0, range - 1)
    }

    case 'int16': {
      const range = 2 ** 16 // -32768,32767
      return _intValidator.bind(null, -(range / 2), range / 2 - 1)
    }
    case 'uint16': {
      const range = 2 ** 16 // 0,65535
      return _intValidator.bind(null, 0, range - 1)
    }

    case 'int32': {
      const range = 2 ** 32 // -2147483648,2147483647
      return _intValidator.bind(null, -(range / 2), range / 2 - 1)
    }
    case 'uint32': {
      const range = 2 ** 32 // 0,4294967295
      return _intValidator.bind(null, 0, range - 1)
    }

    case 'uint': {
      return _intValidator.bind(null, 0, null)
    }

    case 'bigint':
    case 'int': {
      // Any non fraction number!
      return _intValidator.bind(null, null, null)
    }

    // Unsupported number types because JavaScript doesn't support them
    // So, we can't validate them.
    case 'int64':
    case 'uint64':
    case 'float32': {
      return (a:any, b:any, node?: Node) => {
        throw new InternetObjectError(ErrorCodes.unsupportedNumberType, `The number type "${type}" is not supported by JavaScript engine. You can use 'number' or 'big' instead.`, node)
      }
    }

    default: {
      console.assert(false, 'Invalid number type!')
    }
  }
}

export default NumberDef
