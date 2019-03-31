
import TypeDef from './typedef';

import { isNumber } from '../utils/is';
import { parseKey } from './base';
import IOErrorCodes from '../errors/io-error-codes';
import { Token } from '../parser/token';
import ParserError from '../errors/parser-error';
import InternetObjectError from '../errors/io-error';

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

  getType = () => {
    return "string"
  }

  validate = (key:string, token:Token, memberDef:any): string => {
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
        throw new InternetObjectError("invalid-value", `The length of the ${ key} must be ${ minLength }`, token)
      }
    }

    return token.value
  }

}