import { InternetObjectValidationError, ErrorArgs } from '../errors/io-error';
import ErrorCodes from '../errors/io-error-codes'
import { ParserTreeValue } from '../parser/index'
import { Token } from '../parser'
import { isNumber, isToken } from '../utils/is'
import MemberDef from './memberdef'
import TypeDef from './typedef'
import { doCommonTypeCheck } from './utils'

// age?: { number, true, 10, min:10, max:20}

/**
 * Represents the InternetObjectNumber, performs following validations.
 * - Value is number
 * - Value is optional
 * - Value is nullable
 * - Value >= schema.min
 * - Value <= schema.max
 * - Value is in choices
 */
class NumberDef implements TypeDef {

  private _type:string
  private _validator:any

  constructor(type:string = "number") {
    this._type = type
    this._validator = _getValidator(type)
  }

  getType() {
    return this._type
  }

  process(data: ParserTreeValue, memberDef: MemberDef): number {
    if (!isToken(data)) {
      throw new InternetObjectValidationError(ErrorCodes.invalidValue)
    } else if (isNaN(Number(data.value))) {
      throw new InternetObjectValidationError(..._notANumber(memberDef.path, data))
    }

    const validatedData = doCommonTypeCheck(data, memberDef)
    if (validatedData !== data) return validatedData

    // choices check
    if (memberDef.choices !== undefined && memberDef.choices.indexOf(data.value) === -1) {
      throw new InternetObjectValidationError(..._invlalidChoice(memberDef.path, data, memberDef.choices))
    }

    this._validator(data, memberDef)

    if (memberDef.min !== undefined) {
      const min = memberDef.min
      if (data.value < min) {
        throw new InternetObjectValidationError(..._invlalidMin(memberDef.path, data, memberDef.min))
      }
    }

    if (memberDef.max !== undefined && data.value > memberDef.max) {
      throw new InternetObjectValidationError(..._invlalidMax(memberDef.path, data, memberDef.max))
    }

    return data.value
  }
}

function _intValidator(min:number, max:number, token:Token, memberDef:MemberDef) {
  const value = token.value
  // Validate for number
  if (!isNumber(value)) {
    throw new InternetObjectValidationError(..._notANumber(memberDef.path, token))
  }

  // Validate for integer
  if (value % 1 !== 0) {
    // TODO: Throw proper error
    throw new InternetObjectValidationError(ErrorCodes.notAnInteger)
  }

  if (min === max) return

  if (value < min || value > max) {
    throw new InternetObjectValidationError(ErrorCodes.outOfRange)
  }
}

function _getValidator(type:string) {

  switch (type) {
    case "number": {
      return (token:Token, memberDef:MemberDef) => {
        if (isNaN(Number(token.value))) {
          throw new InternetObjectValidationError(..._notANumber(memberDef.path, token))
        }
      }
    }
    case "byte": {
      const range = 2 ** 8 // -128,127
      return _intValidator.bind(null, -(range/2), (range/2)-1)
    }
    case "int16": {
      const range = 2 ** 16 // -32768,32767
      return _intValidator.bind(null, -(range/2), (range/2)-1)
    }
    case "int32": {
      const range = 2 ** 32 // -2147483648,2147483647
      return _intValidator.bind(null, -(range/2), (range/2)-1)
    }
    case "int": {
      return _intValidator.bind(null, 0, 0)
    }
  }
}

function _notANumber(path: string, data: Token) : ErrorArgs {
  return [
    ErrorCodes.notANumber,
    `Expecting a number value for "${path}", Currently it is ${data.value}.`,
    data
  ]
}

function _invlalidChoice(path: string, data: Token, choices:number[]) : ErrorArgs {
  return [
    ErrorCodes.invalidValue,
    `The value of "${path}" must be one of the [${choices.join(",")}]. Currently it is ${data.value}.`,
    data
  ]
}

function _invlalidMin(path: string, data: Token, min: number) : ErrorArgs {
  return [
    ErrorCodes.invalidMinValue,
    `The "${path}" must be greater than or equal to ${min}, Currently it is ${data.value}.`,
    data
  ]
}

function _invlalidMax(path: string, data: Token, max: number) : ErrorArgs {
  return [
    ErrorCodes.invalidMaxValue,
    `The "${path}" must be less than or equal to ${max}, Currently it is ${data.value}.`,
    data
  ]
}

export default NumberDef
