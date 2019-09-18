import { InternetObjectValidationError, ErrorArgs } from '../errors/io-error'
import ErrorCodes from '../errors/io-error-codes'
import { ParserTreeValue, Node } from '../parser/index'
import { Token } from '../parser'
import { isNumber, isToken, isNode } from '../utils/is'
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
    // const val = data === null ? null : (isToken(data) ? data.value : data)
    // if (!isToken(data)) {
    //   throw new InternetObjectValidationError(ErrorCodes.invalidValue)
    // }

    const node = isToken(data) ? data : undefined
    const value = node ? node.value : undefined

    return _validate(this._validator, memberDef, value, node)
    // if (!isToken(data)) {
    //   throw new InternetObjectValidationError(ErrorCodes.invalidValue)
    // } else if (isNaN(Number(data.value))) {
    //   throw new InternetObjectValidationError(..._notANumber(memberDef, data.value, data))
    // }

    // const validatedData = doCommonTypeCheck(memberDef, data === null ? null : data.value, data)
    // if (validatedData !== data) return validatedData

    // // choices check
    // if (memberDef.choices !== undefined && memberDef.choices.indexOf(data.value) === -1) {
    //   throw new InternetObjectValidationError(..._invlalidChoice(memberDef, data.value, data))
    // }

    // this._validator(data, memberDef)

    // if (memberDef.min !== undefined) {
    //   const min = memberDef.min
    //   if (data.value < min) {
    //     throw new InternetObjectValidationError(..._invlalidMin(memberDef, data.value, data))
    //   }
    // }

    // if (memberDef.max !== undefined && data.value > memberDef.max) {
    //   throw new InternetObjectValidationError(..._invlalidMax(memberDef, data.value, data))
    // }

    // return data.value
  }

  load(data: any, memberDef: MemberDef): number {
    return _validate(this._validator, memberDef, data)
  }
}

function _validate(validator: any, memberDef: MemberDef, value: any, node?: Node) {
  const validatedData = doCommonTypeCheck(memberDef, value, node)
  if (validatedData !== value) return validatedData

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
    if (value < min) {
      throw new InternetObjectValidationError(..._invlalidMin(memberDef, value, node))
    }
  }

  if (memberDef.max !== undefined && value > memberDef.max) {
    throw new InternetObjectValidationError(..._invlalidMax(memberDef, value, node))
  }

  return value
}

function _intValidator(min: number, max: number, memberDef: MemberDef, value: any, node?: Node) {
  // Validate for number
  if (!isNumber(value)) {
    throw new InternetObjectValidationError(..._notANumber(memberDef, value, node))
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
      return _intValidator.bind(null, 0, 0)
    }
  }
}

function _notANumber(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.notANumber,
    `Expecting a number value for "${memberDef.path}", Currently it is ${value}.`,
    node
  ]
}

// function _invlalidChoice(memberDef:MemberDef, value:any, node?:Node) : ErrorArgs {
//   if (!memberDef.choices) throw Error("Choices not checked during NumberDef implementation.")
//   return [
//     ErrorCodes.invalidChoice,
//     `The value of "${memberDef.path}" must be one of the [${memberDef.choices.join(",")}]. Currently it is ${value}.`,
//     node
//   ]
// }

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
