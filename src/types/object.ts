import Definitions                  from '../core/definitions';
import ObjectNode                   from '../parser/nodes/objects'
import Node                         from '../parser/nodes/nodes';
import processObject                from '../schema/object-processor';
import Schema                       from '../schema/schema';
import TypeDef                      from '../schema/typedef';
import doCommonTypeCheck            from './common-type';
import MemberDef                    from './memberdef';

const schema = new Schema(
  "object",
  { type:     { type: "string", optional: false, null: false, choices: ["object"] } },
  { default:  { type: "object", optional: true,  null: false  } },
  { optional: { type: "bool",   optional: true,  null: false, default: false } },
  { null:     { type: "bool",   optional: true,  null: false, default: false } },
)

/**
 * Represents the ObjectTypeDef which is reponsible for parsing,
 * validating, loading and serializing Objects.
 */
class ObjectDef implements TypeDef {
  private _names: any = null

  /**
   * Returns the type this instance is going to handle.
   * Always returns object
   */
  get type() { return 'object' }
  get schema() { return schema }

  /**
   * Parses the object in IO format into JavaScript object.
   */
  parse = (node: Node, memberDef: MemberDef, defs?: Definitions): any => {
    const value = node instanceof ObjectNode ? node : undefined
    return this._process(memberDef, value, node, defs)
  }

  /**
   * Loads the JavaScript object.
   */
  load = (data: any, memberDef: MemberDef): any => {
    return this._process(memberDef, data)
  }

  // Process the parse and load requests
  private _process = (
    memberDef: MemberDef,
    value: any,
    node?: Node,
    defs?: Definitions
  ) => {
    const validatedData = doCommonTypeCheck(memberDef, value, node)
    if (validatedData !== value || validatedData === null || validatedData === undefined) {
      return validatedData
    }

    const schema = memberDef.schema

    // const fn = node instanceof ObjectNode ? 'parse' : 'load'

    // When indexMode is on, members are read/loaded from the index.
    // let indexMode: boolean = true

    if (node instanceof ObjectNode) {
      return processObject(node, schema, defs)
    }

    // Object loading should be hadled here!
  }
}

export default ObjectDef
