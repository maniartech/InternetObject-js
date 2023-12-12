import Definitions          from '../core/definitions'
import ValidationError      from '../errors/io-error'
import ErrorCodes           from '../errors/io-error-codes'
import Node                 from '../parser/nodes/nodes'
import TokenNode            from '../parser/nodes/tokens'
import Schema               from '../schema/schema'
import TypeDef              from '../schema/typedef'
import doCommonTypeCheck    from './common-type'
import MemberDef            from './memberdef'

const schema = new Schema(
  "bool",
  { type:     { type: "string", optional: false, null: false, choices: ["bool", "boolean"] } },
  { default:  { type: "bool",   optional: true,  null: false  } },
  { optional: { type: "bool",   optional: true,  null: false, default: false } },
  { null:     { type: "bool",   optional: true,  null: false, default: false } },
)

/**
 * Represents the InternetObject Boolean definition.
 * Performs following validations.
 *
 * - Value is boolean
 * - Value is optional
 * - Value is nullable
 */
export default class BooleanDef implements TypeDef {
  private _type: string

  constructor(type: string = 'bool') { this._type = type }

  get type() { return this._type }
  get schema() { return schema }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions): any {
    return this.validate(node, memberDef, defs)
  }

  validate(data: any, memberDef: MemberDef, defs?: Definitions): any {
    const node = data instanceof TokenNode ? data : undefined
    let value = node ? node.value : data

    if (typeof value === 'string') {
      const valueFound = defs?.getV(value)
      value = valueFound !== undefined ? valueFound : value
    }

    const validatedData = doCommonTypeCheck(memberDef, value, node)
    if (validatedData !== value || validatedData === null || validatedData === undefined) {
      return validatedData
    }

    if (typeof value !== 'boolean') {
      throw new ValidationError(ErrorCodes.notABool, value, node)
    }

    return value
  }
}
