import TypeDef from './typedef'
import MemberDef from './memberdef'
import ErrorCodes from '../errors/io-error-codes'
import KeyValueCollection from '../header'

import { TypedefRegistry } from './typedef-registry'
import { doCommonTypeCheck } from './utils'
import { ParserTreeValue, Node } from '../parser/index'
import { isParserTree, isKeyVal } from '../utils/is'
import { InternetObjectError, InternetObjectSyntaxError } from '../errors/io-error'

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
  parse = (data: ParserTreeValue, memberDef: MemberDef, vars?: KeyValueCollection): any => {
    const value = isParserTree(data) ? data.values : undefined
    return this._process(memberDef, value, data, vars)
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

    console.warn(schema.keys)
    if (isRoot) {
      // join array and trim off last commas, from the end
      return serialized.join(',').replace(/,+$/g, '')
    }
    // join array and trim off last commas, from the end
    return `{${serialized.join(',').replace(/,+$/g, '')}}`
  }

  // Process the parse and load requests
  private _process = (
    memberDef: MemberDef,
    value: any,
    node?: ParserTreeValue,
    vars?: KeyValueCollection
  ) => {
    const validatedData = doCommonTypeCheck(memberDef, value, node)
    if (validatedData !== value || validatedData === null || validatedData === undefined) {
      return validatedData
    }

    const schema = memberDef.schema
    const object: any = {}
    const fn = isParserTree(node) ? 'parse' : 'load'

    // When indexMode is on, members are read/loaded from the index.
    let indexMode: boolean = true

    if (isParserTree(node)) {
      node.values.forEach((dataItem: any, index: number) => {
        let key: string
        let memberDef: MemberDef
        let dataValue: any

        if (isKeyVal(dataItem)) {
          indexMode = false
          key = dataItem.key
          memberDef = schema.defs[key]
          dataValue = dataItem.value
        }
        // Process members only when the indexMode is true.
        else if (indexMode || dataItem === undefined) {
          key = schema.keys[index]
          memberDef = schema.defs[key]
          dataValue = dataItem
        } else {
          throw new InternetObjectSyntaxError(ErrorCodes.positionalMemberAfterKeywordMember)
        }

        // When memberDef is not found, ignore such member
        if (memberDef === undefined) return
        const typeDef: TypeDef = TypedefRegistry.get(memberDef.type)
        object[key] = typeDef.parse(dataValue, memberDef, vars)
      })

      // Process the members who have not been included in
      // the data item.
      schema.keys.forEach((key: string) => {
        if (key in object) return
        const memberDef: MemberDef = schema.defs[key]
        const typeDef: TypeDef = TypedefRegistry.get(memberDef.type)
        object[key] = typeDef.parse(undefined, memberDef, vars)
      })
    } else {
      const keys = schema.keys

      keys.forEach((key: string) => {
        const memberDef: MemberDef = schema.defs[key]

        // When memberDef is not found, ignore such member
        if (memberDef === undefined) return

        const typeDef: TypeDef = TypedefRegistry.get(memberDef.type)

        const dataItem = value[key]
        object[key] = typeDef.load(dataItem, memberDef)
      })
    }

    return object
  }
}

export default ObjectDef
