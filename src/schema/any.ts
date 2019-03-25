import { isNumber } from '../utils/is'
import { Token } from '../token'
import { parseKey, MemberDef } from './base'
import { INVALID_TYPE } from '../errors'
import TypeDefinition from './schema-type-definition'
import ParserError from '../errors/parser-error';

// age?: {any, true}

/**
 * Represents the InternetObjectNumber, performs following validations.
 * - Value is number
 * - Value is optional
 * - Value is nullable
 * - Value >= schema.min
 * - Value <= schema.max
 * - Value is in choices
 */
export default class AnyDef implements TypeDefinition {

  getType = () => {
    return "any"
  }

  validate = (key: string, token: Token, memberDef:MemberDef): number => {

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

    return token.value
  }

  get type() {
    return 'number'
  }
}