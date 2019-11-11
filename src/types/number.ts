import { InternetObjectValidationError, ErrorArgs, InternetObjectError } from '../errors/io-error'
import ErrorCodes from '../errors/io-error-codes'
import { ParserTreeValue, Node } from '../parser/index'
import { Token } from '../parser'
import { isNumber, isToken, isNode } from '../utils/is'
import MemberDef from './memberdef'
import TypeDef from './typedef'
import { doCommonTypeCheck } from './utils'

const NUMBER_TYPES = ['number', 'int', 'int32', 'int16', 'byte']

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

  getType() {
    return this._type
  }

  parse(data: ParserTreeValue, memberDef: MemberDef): number {
    return this.validate(data, memberDef)
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

  validate(data: any, memberDef: MemberDef): number {
    const node = isToken(data) ? data : undefined
    const value = node ? node.value : data
    return _validate(this._validator, memberDef, value, node)
  }
}

// Performs following validations.
//  * - Value is number, int, int32, int16, byte
//  * - Value is optional
//  * - Value is nullable
//  * - Value >= schema.min
//  * - Value <= schema.max
//  * - Value is in choices
function _validate(validator: any, memberDef: MemberDef, value: any, node?: Node) {
  const validatedData = doCommonTypeCheck(memberDef, value, node)
  if (validatedData !== value || validatedData === undefined) return validatedData

  if (!isNumber(value)) {
    throw new InternetObjectValidationError(ErrorCodes.invalidValue)
  } else if (isNaN(Number(value))) {
    throw new InternetObjectValidationError(
      ErrorCodes.notANumber,
      `Invalid number encountered for ${memberDef.path}`
    )
  }

  validator(memberDef, value, node)

  if (memberDef.min !== undefined) {
    const min = memberDef.min
    if (memberDef.min !== undefined && value < min) {
      throw new InternetObjectValidationError(..._invlalidMin(memberDef, value, node))
    }
  }

  if (memberDef.max !== undefined && value > memberDef.max) {
    throw new InternetObjectValidationError(..._invlalidMax(memberDef, value, node))
  }

  return value
}

function _intValidator(min: number, max: number, memberDef: MemberDef, value: any, node?: Node) {
  // Validate for integer
  if (value % 1 !== 0) {
    throw new InternetObjectValidationError(..._notAnInt(memberDef, value, node))
  }

  if ((min !== -1 && value < min) || (max !== -1 && value > max)) {
    throw new InternetObjectValidationError(..._outOfRange(memberDef, value, node))
  }
}

function _getValidator(type: string) {
  switch (type) {
    case 'number': {
      return (memberDef: MemberDef, value: any, node?: Node) => {
        if (!isNumber(value) && isNaN(Number(value))) {
          throw new InternetObjectValidationError(..._notANumber(memberDef, value, node))
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
