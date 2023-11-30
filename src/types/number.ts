import Definitions from '../core/definitions'
import ValidationError from '../errors/io-validation-error'
import ErrorArgs from '../errors/error-args'
import InternetObjectError from '../errors/io-error'
import ErrorCodes from '../errors/io-error-codes'
import { TokenNode } from '../parser/nodes'
import Node from '../parser/nodes/nodes'
import Schema from '../schema/schema'
import MemberDef from './memberdef'
import TypeDef from './typedef'
import { doCommonTypeCheck } from './utils'

const NUMBER_TYPES = ['number', 'int', 'int32', 'int16', 'byte']

const schema = new Schema(
  "number",
  { type:     { type: "string", optional: false, null: false, choices: ["number", "byte", "int", "int16", "int32", "int64"] } },
  { default:  { type: "number", optional: true,  null: false  } },
  { choices:  { type: "array",  optional: true,  null: false, of: { type: "number" } } },
  { len:      { type: "number", optional: true,  null: false, min: 0 } },
  { min:      { type: "number", optional: true,  null: false, min: 0 } },
  { max:      { type: "number", optional: true,  null: false, min: 0 } },
  { optional: { type: "bool",   optional: true,  null: false, default: false } },
  { null:     { type: "bool",   optional: true,  null: false, default: false } },
)

// age?: { number, true, 10, min:10, max:20}

/**
 * Represents the various number related data types
 * (such as number, int, byte, int16, int32) in Internet Object.
 *
 * @internal
 */
class NumberDef implements TypeDef {
  private _type: string
  private _validator: any

  constructor(type: string = 'number') {
    this._type = type
    this._validator = _getValidator(type)
  }

  get type() { return this._type }
  get schema() { return schema }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions): number {
    return this.validate(node, memberDef, defs)
  }

  load(data: any, memberDef: MemberDef): number {
    return this.validate(data, memberDef)
  }

  serialize = (data: any, memberDef: MemberDef): string => {
    if (NUMBER_TYPES.indexOf(memberDef.type) === -1) {
      throw new InternetObjectError(ErrorCodes.invalidType)
    }
    return this.validate(data, memberDef).toString()
  }

  validate(data: any, memberDef: MemberDef, defs?: Definitions): number {
    const node = data instanceof TokenNode ? data : undefined
    const value = node ? node.value : data
    return _validate(this._validator, memberDef, value, node, defs)
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
  memberDef: MemberDef,
  value: any,
  node?: Node,
  defs?: Definitions
) {
  if (defs && typeof value === 'string') {
    const valueFound = defs.getV(value)
    value = valueFound !== undefined ? valueFound : value
  }

  const validatedData = doCommonTypeCheck(memberDef, value, node)
  if (validatedData !== value || validatedData === undefined) return validatedData

  if (typeof value !== 'number') {
    throw new ValidationError(ErrorCodes.notANumber, value, node)
  } else if (isNaN(Number(value))) {
    throw new ValidationError(
      ErrorCodes.notANumber,
      `Invalid number encountered for ${memberDef.path}`
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
        if (isNaN(Number(value))) {
          throw new ValidationError(..._notANumber(memberDef, value, node))
        }
      }
    }
    case 'byte': {
      const range = 2 ** 8 // -128,127
      return _intValidator.bind(null, -(range / 2), range / 2 - 1)
    }
    case 'int16': {
      const range = 2 ** 16 // -32768,32767
      return _intValidator.bind(null, -(range / 2), range / 2 - 1)
    }
    case 'int32': {
      const range = 2 ** 32 // -2147483648,2147483647
      return _intValidator.bind(null, -(range / 2), range / 2 - 1)
    }
    case 'int64': {
      const range = 2 ** 64 // -9223372036854775808,9223372036854775807
      return _intValidator.bind(null, -(range / 2), range / 2 - 1)
    }
    case 'int': {
      // Any non fraction number!
      return _intValidator.bind(null, -1, -1)
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
