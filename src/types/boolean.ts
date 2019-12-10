import { ParserTreeValue, Node } from '../parser/index'
import { isToken, isBoolean, isString } from '../utils/is'
import MemberDef from './memberdef'
import TypeDef from './typedef'
import { doCommonTypeCheck } from './utils'
import ErrorCodes from '../errors/io-error-codes'
import KeyValueCollection from '../header/index'
import { InternetObjectValidationError } from '../errors/io-error'

/**
 * Represents the InternetObject String, performs following validations.
 *
 * - Value is boolean
 * - Value is optional
 * - Value is nullable
 */
export default class BooleanDef implements TypeDef {
  private _type: string

  constructor(type: string = 'bool') {
    this._type = type
  }

  getType() {
    return this._type
  }

  parse(data: ParserTreeValue, memberDef: MemberDef, vars?: KeyValueCollection): string {
    return this.validate(data, memberDef, vars)
  }

  load(data: any, memberDef: MemberDef): string {
    return this.validate(data, memberDef)
  }

  serialize(data: string, memberDef: MemberDef): string {
    let value = this.validate(data, memberDef)

    if (value === undefined) return ''
    return value === true ? 'T' : 'F'
  }

  validate(data: any, memberDef: MemberDef, vars?: KeyValueCollection): any {
    const node = isToken(data) ? data : undefined
    let value = node ? node.value : data

    if (vars && isString(value)) {
      const valueFound = vars.getV(value)
      value = valueFound !== undefined ? valueFound : value
    }

    const validatedData = doCommonTypeCheck(memberDef, value, node)
    if (validatedData !== value || validatedData === null || validatedData === undefined) {
      return validatedData
    }

    if (!isBoolean(value)) {
      throw new InternetObjectValidationError(
        ErrorCodes.notABool,
        'Expecting a boolean value',
        node
      )
    }

    return value
  }
}
