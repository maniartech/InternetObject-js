
import TypeDefinition from './schema-type-definition';

import { isNumber } from '../utils/is';
import { parseKey } from './base';
import { INVALID_TYPE } from '../errors';
import { Token } from '../token';
import ParserError from '../errors/parser-error';

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
export default class StringDef implements TypeDefinition {

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
      throw new ParserError("null-not-allowed", token)
    }

    // choices check
    if (memberDef.choices !== undefined && token.value in memberDef.choices === false) {
      throw new ParserError("value-not-in-choices", token)
    }

    // Typeof check
    if (typeof token.value !== "string") {
      throw Error(INVALID_TYPE)
    }

    const maxLength = memberDef.maxLength

    // Max length check
    if (maxLength !== undefined && isNumber(maxLength)) {
      if (token.value.length > maxLength) {
        throw new ParserError("invalid-value", token)
      }
    }

    return token.value
  }

}