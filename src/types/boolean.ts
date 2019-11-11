import { ParserTreeValue, Node } from '../parser/index'
import { isToken, isBoolean } from '../utils/is'
import MemberDef from './memberdef'
import TypeDef from './typedef'
import { doCommonTypeCheck } from './utils'
import ErrorCodes from '../errors/io-error-codes'

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

  parse(data: ParserTreeValue, memberDef: MemberDef): string {
    return this.validate(data, memberDef)
  }

  load(data: any, memberDef: MemberDef): string {
    return this.validate(data, memberDef)
  }

  serialize(data: string, memberDef: MemberDef): string {
    let value = this.validate(data, memberDef)

    if (value === undefined) return ''
    return value === true ? 'T' : 'F'
  }

  validate(data: any, memberDef: MemberDef): any {
    const node = isToken(data) ? data : undefined
    const value = node ? node.value : data

    const validatedData = doCommonTypeCheck(memberDef, value, node)
    if (validatedData !== value || validatedData === undefined) return validatedData

    if (!isBoolean(value)) {
      throw new InternetObjectValidationError(
        ErrorCodes.invalidValue,
        'Expecting a boolean value',
        node
      )
    }

    return value
  }
}
