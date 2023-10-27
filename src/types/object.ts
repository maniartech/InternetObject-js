import Definitions                  from '../core/definitions';
import {
       InternetObjectError        } from '../errors/io-error';
import ErrorCodes                   from '../errors/io-error-codes';
import {
       ObjectNode                 } from '../parser/nodes';
import Node                         from '../parser/nodes/nodes';
import processObject                from '../schema/object-processor';
import Schema                       from '../schema/schema';
import MemberDef                    from './memberdef';
import TypeDef                      from './typedef';
import TypedefRegistry              from './typedef-registry';
import {
       doCommonTypeCheck          } from './utils';

const schema = new Schema(
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
  private _keys: any = null

  /**
   * Returns the type this instance is going to handle.
   * Always returns object
   */
  getType() {
    return 'object'
  }

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

  /**
   * Serializes the object into IO format.
   */
  public serialize = (data: any, memberDef: MemberDef, isRoot: boolean = false): string => {
    if (memberDef.type !== 'object') {
      throw new InternetObjectError(ErrorCodes.invalidObject)
    }

    const validatedData = doCommonTypeCheck(memberDef, data)
    const serialized: string[] = []
    const schema = memberDef.schema

    schema.keys.forEach((key: string, index: number) => {
      const memberDef: MemberDef = schema.defs[key]
      const typeDef = TypedefRegistry.get(memberDef.type)
      const value = validatedData[key]
      const serializedValue = typeDef.serialize(value, memberDef)
      serialized.push(serializedValue)
    })

    if (isRoot) {
      // join array and trim off last commas, from the end
      return serialized.join(',').replace(/,+$/g, '')
    }
    // join array and trim off last commas, from the end
    return `{${serialized.join(',').replace(/,+$/g, '')}}`
  }

  get schema() {
    return schema
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

    const fn = node instanceof ObjectNode ? 'parse' : 'load'

    // When indexMode is on, members are read/loaded from the index.
    let indexMode: boolean = true

    if (node instanceof ObjectNode) {
      return processObject(node, schema, defs)
    }

    const object: any = {}
    const keys = schema.keys

    keys.forEach((key: string) => {
      const memberDef: MemberDef = schema.defs[key]

      // When memberDef is not found, assert a failure.
      // if (isUndefined(memberDef)) return
      if (typeof memberDef === 'undefined') {
        throw new InternetObjectError(ErrorCodes.invalidMemberDef)
      }

      const typeDef: TypeDef = TypedefRegistry.get(memberDef.type)

      const dataItem = value[key]
      object[key] = typeDef.load(dataItem, memberDef)
    })

    return object
  }
}

export default ObjectDef
