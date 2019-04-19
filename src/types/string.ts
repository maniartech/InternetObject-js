import InternetObjectError from '../errors/io-error';
import IOErrorCodes from '../errors/io-error-codes';
import { ParserTreeValue } from '../parser/index';
import { isNumber, isToken } from '../utils/is';
import MemberDef from './memberdef';
import TypeDef from './typedef';
import { doCommonTypeCheck } from './utils';

/**
 * Represents the InternetObject String, performs following validations.
 *
 * - Value is number
 * - Value is optional
 * - Value is nullable
 * - Value length <= maxLength
 * - Value length >= minLength
 * - Value is in choices
 */
export default class StringDef implements TypeDef {

  getType () {
    return "string"
  }

  process (token:ParserTreeValue, memberDef: MemberDef):string {

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
    if (typeof token.value !== "string") {
      throw Error(IOErrorCodes.invalidType)
    }

    const maxLength = memberDef.maxLength

    // Max length check
    if (maxLength !== undefined && isNumber(maxLength)) {
      if (token.value.length > maxLength) {
        throw new InternetObjectError("invalid-value", "", token)
      }
    }

    const minLength = memberDef.minLength
    // Max length check
    if (minLength !== undefined && isNumber(minLength)) {
      if (token.value.length > minLength) {
        throw new InternetObjectError("invalid-value", `The length of the ${memberDef.path} must be ${ minLength }`, token)
      }
    }

    return token.value
  }

}