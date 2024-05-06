import Definitions            from '../core/definitions';
import ErrorCodes             from '../errors/io-error-codes';
import ValidationError        from '../errors/io-validation-error';
import MemberNode             from '../parser/nodes/members';
import Node                   from '../parser/nodes/nodes';
import { getMemberDef       } from '../schema/compile-object';
import Schema                 from '../schema/schema';
import TypeDef                from '../schema/typedef';
import TypedefRegistry        from '../schema/typedef-registry';
import doCommonTypeCheck      from './common-type';
import MemberDef              from './memberdef';

const of = { type: "any", __memberdef: true }

const schema = new Schema(
  "any",
  { type:     { type: "string", optional: false, null: false, choices: ["any"] } },
  { default:  { type: "any",    optional: true,  null: false } },
  { choices:  { type: "array",  optional: true,  null: false } },
  { anyOf:    { type: "array",  optional: true,  null: false, of } },
  { isSchema: { type: "bool",   optional: true,  null: false, default: false } },
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

    const anyOf = memberDef.anyOf;
    if (!anyOf) {
      if (memberDef.__memberdef) { // Convert to memberDef
        const md = getMemberDef(new MemberNode(node), "", defs)
        return md
      }

      return value
    }

    const errors = []

    for (let i=0; i<anyOf.length; i++) {
      const def = anyOf[i]
      def.path = memberDef.path

      const typeDef = TypedefRegistry.get(def.type)
      if (!typeDef) {
        throw new Error(`Invalid type definition '${def.type}'`)
      }

      try {
        return typeDef.parse(node, def, defs, collectionIndex)
      } catch (e) {
        errors.push(e)
        continue
      }
    }

    // None of the types matched
    if (errors.length === anyOf.length) {
      throw new ValidationError(ErrorCodes.invalidValue, `None of the constraints defined for '${memberDef.path}' matched.`, node)
    }

    return valueNode;
  }

  public static get types() { return ['any'] }
}
