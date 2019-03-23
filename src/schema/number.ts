import { isNumber } from '../utils/is'
import { Token } from '../token'
import { parseKey } from './base'
import { INVALID_TYPE } from '../errors'
import TypeDefinition from './schema-type-definition'
import TypedefRegistry from './typedef-registry'
import ParserError from '../errors/parser-error';

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
class Number implements TypeDefinition {
  validate = (key: string, token: Token, memberDef: any): number => {
    const value = token.value
    const { optional } = parseKey(key)
    const nullable = memberDef['null'] === true
    const defaultValue = memberDef['default'] || undefined
    const choices: any[] | undefined = memberDef['choices']

    // Optional check
    if (optional && value === undefined) {
      return value
    }

    // Nullability check
    if (value === null) {
      if (nullable) {
        if (defaultValue) {
          return defaultValue
        }
      }
    }

    // choices check
    if (choices !== undefined && value in choices === false) {
      throw new ParserError("value-not-in-choices", token)
    }

    // Typeof check
    if (isNumber(value)) {
      throw Error(INVALID_TYPE)
    }

    if (isNumber(memberDef.min) && value < memberDef.min) {
      throw new ParserError('invalid-value', token)
    }

    if (isNumber(memberDef.max) && value > memberDef.max) {
      throw new ParserError('invalid-value', token)
    }

    return value
  }

  get type() {
    return 'number'
  }
}

TypedefRegistry.register(Number)

export default Number
