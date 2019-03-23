
import { isNumber } from '../utils/is';
import TypeDefinition from './schema-type-definition';
import { parseKey } from './base';
import { INVALID_TYPE } from '../errors';
import { Token } from '../token';

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
export default class String implements TypeDefinition {

  validate = (key:string, token:Token, memberDef:any): boolean => {
    const {optional} = parseKey(key)
    const nullable = memberDef['null'] === true
    const value = token.value

    // Optional check
    if (value === undefined) return optional

    // Nullability check
    if (value === null) return nullable

    // Typeof check
    if (typeof value !== "string") {
      throw Error(INVALID_TYPE)
    }

    const maxLength = memberDef.maxLength

    // Max length check
    if (maxLength !== undefined && isNumber(maxLength)) {
      if (value.length > maxLength) return false
    }

    return true
  }

}