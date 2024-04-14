import Definitions              from '../core/definitions'
import Node                     from '../parser/nodes/nodes'
import Schema                   from '../schema/schema'
import TypeDef                  from '../schema/typedef'
import doCommonTypeCheck        from './common-type'
import MemberDef                from './memberdef'

const schema = new Schema(
  "any",
  { type:     { type: "string", optional: false, null: false, choices: ["any"] } },
  { default:  { type: "any",    optional: true,  null: false  } },
  { choices:  { type: "array",  optional: true,  null: false } },
  { optional: { type: "bool",   optional: true,  null: false, default: false } },
  { null:     { type: "bool",   optional: true,  null: false, default: false } },
)

export default class AnyDef implements TypeDef {

  public  get type(): string  { return 'any' }
  public get schema()         { return schema }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions, collectionIndex?: number): any {
    const valueNode = defs?.getV(node) || node
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    return value
  }

  public static get types() { return ['any'] }
}
