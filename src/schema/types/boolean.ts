import Definitions          from '../../core/definitions'
import ValidationError      from '../../errors/io-error'
import ErrorCodes           from '../../errors/io-error-codes'
import Node                 from '../../parser/nodes/nodes'
import TokenNode            from '../../parser/nodes/tokens'
import Schema               from '../../schema/schema'
import TypeDef              from '../../schema/typedef'
import TokenType            from '../../parser/tokenizer/token-types'
import doCommonTypeCheck    from './common-type'
import MemberDef            from './memberdef'

const schema = new Schema(
  "bool",
  { type:     { type: "string", optional: false, null: false, choices: ["bool"] } },
  { default:  { type: "bool",   optional: true,  null: false  } },
  { optional: { type: "bool",   optional: true } },
  { null:     { type: "bool",   optional: true } },
)

export default class BooleanDef implements TypeDef {
  public get type()   { return 'bool' }
  public get schema() { return schema }

  public parse(node: Node, memberDef: MemberDef, defs?: Definitions): any {
    return this.#validate(node, memberDef, defs)
  }

  // Load: JS Value → Validated JS Value
  public load(value: any, memberDef: MemberDef, defs?: Definitions): boolean {
    const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value)
    if (changed) return checkedValue
    if (typeof value !== 'boolean') {
      throw new ValidationError(ErrorCodes.notABool, `Expecting a boolean value for '${memberDef.path}' but found ${JSON.stringify(value)}.`)
    }
    return value
  }

  // Stringify with validation
  public stringify(value: any, memberDef: MemberDef): string {
    this.load(value, memberDef)
    return value ? 'T' : 'F'
  }

  #validate(node: Node, memberDef: MemberDef, defs?: Definitions): any {
    const valueNode = defs?.getV(node) || node
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    if (valueNode instanceof TokenNode === false || valueNode.type !== TokenType.BOOLEAN) {
      throw new ValidationError(ErrorCodes.notABool, `Expecting a boolean value for '${memberDef.path}' but found ${valueNode.toValue()}.`, node)
    }

    return valueNode.value
  }

  public static get types() { return ['bool'] }
}
