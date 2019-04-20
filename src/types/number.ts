import InternetObjectError from '../errors/io-error'
import IOErrorCodes from '../errors/io-error-codes'
import { ParserTreeValue } from '../parser/index'
import { Token } from '../parser/token'
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
  getType() {
    return 'number'
  }

  process(data: ParserTreeValue, memberDef: MemberDef): number {
    if (!isToken(data)) {
      throw new InternetObjectError('invalid-value')
    } else if (isNaN(Number(data.value))) {
      throw new InternetObjectError(..._notANumber(memberDef.path, data))
    }

    const validatedData = doCommonTypeCheck(data, memberDef)
    if (validatedData !== data) return validatedData

    // choices check
    if (memberDef.choices !== undefined && memberDef.choices.indexOf(data.value) === -1) {
      throw new InternetObjectError(..._invlalidChoice(memberDef.path, data, memberDef.choices))
    }

    if (memberDef.min !== undefined) {
      const min = memberDef.min
      if (data.value < min) {
        throw new InternetObjectError(..._invlalidMin(memberDef.path, data, memberDef.min))
      }
    }

    if (memberDef.max !== undefined && data.value > memberDef.max) {
      throw new InternetObjectError(..._invlalidMax(memberDef.path, data, memberDef.max))
    }

    return data.value
  }
}

function _notANumber(path: string, data: Token) {
  return [
    IOErrorCodes.notANumber,
    `Expecting a number value for "${path}", Currently it is ${data.value}.`,
    data
  ]
}

function _invlalidChoice(path: string, data: Token, choices:number[]) {
  return [
    IOErrorCodes.invalidValue,
    `The value of "${path}" must be one of the [${choices.join(",")}]. Currently it is ${data.value}.`,
    data
  ]
}

function _invlalidMin(path: string, data: Token, min: number) {
  return [
    IOErrorCodes.invalidMinValue,
    `The "${path}" must be greater than or equal to ${min}, Currently it is ${data.value}.`,
    data
  ]
}

function _invlalidMax(path: string, data: Token, max: number) {
  return [
    IOErrorCodes.invalidMaxValue,
    `The "${path}" must be less than or equal to ${max}, Currently it is ${data.value}.`,
    data
  ]
}

export default NumberDef
