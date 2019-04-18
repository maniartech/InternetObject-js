import InternetObjectError from '../errors/io-error';
import IOErrorCodes from '../errors/io-error-codes';
import { ParserTreeValue } from '../parser/index';
import { Token } from '../parser/token';
import { isNumber, isToken } from '../utils/is';
import MemberDef from './memberdef';
import TypeDef from './typedef';
import { doCommonTypeCheck } from './utils';

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

  getType () {
    return "number"
  }

  process(key: string, token:ParserTreeValue, memberDef: MemberDef): number {

    if (!isToken(token)) {
      throw new InternetObjectError("invalid-value")
    }

    const validatedData = doCommonTypeCheck(token, memberDef)
    if (validatedData !== token) return validatedData

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
