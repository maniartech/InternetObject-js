import { isNumber } from '../utils/is'
import { Token } from '../parser/token'
import MemberDef from './memberdef'
import IOErrorCodes from '../errors/io-error-codes'
import TypeDef from './typedef'
import InternetObjectError from '../errors/io-error';

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

  getType = () => {
    return "number"
  }

  validate = (key: string, token: Token, memberDef: MemberDef): number => {

    // Optional check
    if (memberDef.optional && token.value === undefined) {
      return memberDef.default
    }

    // Nullability check
    if (token.value === null && !memberDef.null) {
      throw new InternetObjectError("null-not-allowed", "", token)
    }

    // choices check
    if (memberDef.choices !== undefined && token.value in memberDef.choices === false) {
      throw new InternetObjectError("value-not-in-choices", "", token)
    }

    // Typeof check
    if (token.type !== "number") {
      throw Error(IOErrorCodes.invalidType)
    }

    if (isNumber(memberDef.min)) {
      const min = memberDef.min
      if (token.value < min) {
        throw new InternetObjectError(..._invlalidMin(key, token, memberDef.min))
      }
    }

    if (isNumber(memberDef.max) && token.value > memberDef.max) {
      throw new InternetObjectError(..._invlalidMax(key, token, memberDef.max))
    }

    return token.value
  }

  get type() {
    return 'number'
  }
}

function _invlalidChoice(key:string, token:Token, min:number) {
  return [
    IOErrorCodes.invalidMinValue,
    `The "${ key }" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidMin(key:string, token:Token, min:number) {
  return [
    IOErrorCodes.invalidMinValue,
    `The "${ key }" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidMax(key:string, token:Token, max:number) {
  return [
    IOErrorCodes.invalidMaxValue,
    `The "${ key }" must be less than or equal to ${max}, Currently it is "${token.value}".`,
    token
  ]
}

export default NumberDef
