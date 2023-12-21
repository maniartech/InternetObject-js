import Definitions          from '../core/definitions'
import ValidationError      from '../errors/io-error'
import ErrorCodes           from '../errors/io-error-codes'
import Node                 from '../parser/nodes/nodes'
import TokenNode            from '../parser/nodes/tokens'
import Schema               from '../schema/schema'
import TypeDef              from '../schema/typedef'
import TokenType            from '../tokenizer/token-types'
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

  validate(node: Node, memberDef: MemberDef, defs?: Definitions): any {
    const valueNode = defs?.getV(node) || node
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    if (valueNode instanceof TokenNode === false || valueNode.type !== TokenType.BOOLEAN) {
      throw new ValidationError(ErrorCodes.notABool, `Expecting a boolean value for '${memberDef.path}' but found ${valueNode.toValue()}.`, node)
    }

    return valueNode.value
  }
}
