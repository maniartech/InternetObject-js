import Definitions          from '../core/definitions'
import ValidationError      from '../errors/io-validation-error'
import ErrorArgs            from '../errors/error-args'
import ErrorCodes           from '../errors/io-error-codes'
import Node                 from '../parser/nodes/nodes'
import TokenNode            from '../parser/nodes/tokens'
import Schema               from '../schema/schema'
import TokenType            from '../tokenizer/token-types'
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

const isUnsupportedNumberType = [
  'int64', 'uint64', 'float32'   // Unsupported number types by JavaScript
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

// age?: { number, true, 10, min:10, max:20}

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
    return _validate(this._validator, node, memberDef, defs)
  }
}

// Performs following validations.
//  * - Value is number, int, int32, int16, byte
//  * - Value is optional
//  * - Value is nullable
//  * - Value >= schema.min
//  * - Value <= schema.max
//  * - Value is in choices
function _validate(
  validator: any,
  node: Node, memberDef: MemberDef, defs?: Definitions
) {
  const valueNode = defs?.getV(node) || node
  const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
  if (changed) return value

  if (valueNode instanceof TokenNode === false && valueNode.type !== TokenType.NUMBER) {
    throw new ValidationError(
      ErrorCodes.notANumber,
      `Invalid number encountered for ${memberDef.path}`,
      node
    )
  }

  validator(memberDef, value, node)

  if (memberDef.min !== undefined) {
    const min = memberDef.min
    if (memberDef.min !== undefined && value < min) {
      throw new ValidationError(..._invlalidMin(memberDef, value, node))
    }
  }

  if (memberDef.max !== undefined && value > memberDef.max) {
    throw new ValidationError(..._invlalidMax(memberDef, value, node))
  }

  return value
}

function _intValidator(min: number, max: number, memberDef: MemberDef, value: any, node?: Node) {
  // Validate for integer
  if (value % 1 !== 0) {
    throw new ValidationError(..._notAnInt(memberDef, value, node))
  }

  if ((min !== -1 && value < min) || (max !== -1 && value > max)) {
    throw new ValidationError(..._outOfRange(memberDef, value, node))
  }
}

function _getValidator(type: string) {
  switch (type) {
    case 'number': {
      return (memberDef: MemberDef, value: any, node?: Node) => {
        if (typeof Number(value) !== 'number') {
          throw new ValidationError(..._notANumber(memberDef, value, node))
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

    case 'int': {
      // Any non fraction number!
      return _intValidator.bind(null, -1, -1)
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

function _outOfRange(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.outOfRange,
    `The value (${value}) set for "${memberDef.path}" is out of range.`,
    node
  ]
}

function _notAnInt(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.notAnInteger,
    `Expecting an integer value for "${memberDef.path}", Currently it is ${value}.`,
    node
  ]
}

function _notANumber(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.notANumber,
    `Expecting a number value for "${memberDef.path}", Currently it is ${value}.`,
    node
  ]
}

function _invlalidMin(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.invalidMinValue,
    `The "${memberDef.path}" must be greater than or equal to ${memberDef.min}, Currently it is ${value}.`,
    node
  ]
}

function _invlalidMax(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.invalidMaxValue,
    `The "${memberDef.path}" must be less than or equal to ${memberDef.max}, Currently it is ${value}.`,
    node
  ]
}

export default NumberDef
