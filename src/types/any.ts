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

/**
 * Represents the AnyTypeDef which is reponsible for parsing,
 * validating, loading and serializing any values.
 */
export default class AnyDef implements TypeDef {

  /**
  * Returns the type this instance is going to handle.
  * Always returns "any"
  */
  get type(): string { return 'any' }

  get schema() { return schema }

  /**
   * Parses any value in IO format into JavaScript.
   */
  parse(node: Node, memberDef: MemberDef, defs?: Definitions, collectionIndex?: number): any {
    const valueNode = defs?.getV(node) || node
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    return value
  }

  static get types() { return ['any'] }
}
