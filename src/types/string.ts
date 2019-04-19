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

  process (data:ParserTreeValue, memberDef: MemberDef):string {

    if (!isToken(data)) {
      throw new InternetObjectError("invalid-value")
    }

    const validatedData = doCommonTypeCheck(data, memberDef)
    if (validatedData !== data) return validatedData

    // choices check
    if (memberDef.choices !== undefined && data.value in memberDef.choices === false) {
      throw new InternetObjectError("value-not-in-choices", "", data)
    }

    // Typeof check
    if (typeof data.value !== "string") {
      throw Error(IOErrorCodes.invalidType)
    }

    const maxLength = memberDef.maxLength

    // Max length check
    if (maxLength !== undefined && isNumber(maxLength)) {
      if (data.value.length > maxLength) {
        throw new InternetObjectError("invalid-value", "", data)
      }
    }

    const minLength = memberDef.minLength
    // Max length check
    if (minLength !== undefined && isNumber(minLength)) {
      if (data.value.length > minLength) {
        throw new InternetObjectError("invalid-value", `The length of the ${memberDef.path} must be ${ minLength }`, data)
      }
    }

    return data.value
  }

}