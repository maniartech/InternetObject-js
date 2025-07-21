import Definitions          from '../core/definitions';
import ValidationError      from '../errors/io-validation-error';
import ErrorCodes           from '../errors/io-error-codes';
import ObjectNode           from '../parser/nodes/objects'
import Node                 from '../parser/nodes/nodes';
import compileObject        from '../schema/compile-object';
import processObject        from '../schema/object-processor';
import Schema               from '../schema/schema';
import TypeDef              from '../schema/typedef';
import doCommonTypeCheck    from './common-type';
import MemberDef            from './memberdef';

const schema = new Schema(
  "object",
  { type:     { type: "string", optional: false, null: false, choices: ["object"] } },
  { default:  { type: "object", optional: true,  null: false } },
  { schema:   { type: "object", optional: true,  null: false, __schema: true } },
  { optional: { type: "bool",   optional: true } },
  { null:     { type: "bool",   optional: true } },
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

  static get types() { return ['object'] }

  get schema() { return schema }

  /**
   * Parses the object in IO format into JavaScript object.
   */
  parse = (node: Node, memberDef: MemberDef, defs?: Definitions): any => {
    return this._process(node, memberDef, defs)
  }

  // Process the parse and load requests
  private _process = (
    node: Node, memberDef: MemberDef, defs?: Definitions
  ) => {
    const valueNode = defs?.getV(node) || node
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)

    if (changed) {
      return value
    }

    let schema = memberDef.schema
    if (valueNode instanceof ObjectNode === false) {
      throw new ValidationError(ErrorCodes.invalidObject, `Expecting an object value for '${memberDef.path}'`, node)
    }

    if (valueNode === node) {
      if (memberDef.__schema) {
        return compileObject(memberDef.path || "", valueNode as ObjectNode, defs)
      }

      if (!schema) {
        schema = new Schema(memberDef.path || "")
        schema.open = true
      }
      return processObject(valueNode as ObjectNode, schema, defs)
    }

    // valueNode fetched from defs. Hence, in case of an error, replace the
    // error position with the original node.
    try {
      return processObject(valueNode as ObjectNode, schema, defs)
    } catch (err) {
      if (err instanceof ValidationError) {
        err.positionRange = node
      }
      throw err
    }

    return processObject(valueNode as ObjectNode, schema, defs)
  }
}

export default ObjectDef
