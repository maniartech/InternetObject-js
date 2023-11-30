import TypeDef from './typedef'
import MemberDef from './memberdef'
import ErrorCodes from '../errors/io-error-codes'

import { appendPath } from '../utils/index'
import TypedefRegistry from './typedef-registry'
import { doCommonTypeCheck } from './utils'
import InternetObjectError from '../errors/io-error'
import {
  isPlainObject
} from '../utils/is'
import Definitions from '../core/definitions'
import { Node, TokenNode } from '../parser/nodes'
import Schema from '../schema/schema'

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
  parse(node: TokenNode, memberDef: MemberDef, defs?: Definitions): any {
    const validatedData = doCommonTypeCheck(memberDef, node, node)

    if (validatedData !== node || validatedData === null || validatedData === undefined) {
      return validatedData
    }

    return node.toValue(defs)
  }

  /**
   * Loads the JavaScript values.
   */
  load(data: any, memberDef: MemberDef): any {
    const validatedData = doCommonTypeCheck(memberDef, data)
    if (validatedData !== data) return validatedData
    return data
  }

  /**
   * Serializes any value from JavaScript into IO format.
   */
  serialize(data: any, memberDef: MemberDef, isRoot: boolean = false): string {
    return _serialize(data, memberDef, isRoot)
  }

}

const _serialize = (data: any, memberDef: MemberDef, isRoot: boolean): string => {
  const validatedData = doCommonTypeCheck(memberDef, data)
  if (validatedData !== data) return validatedData

  // data is a string
  if (typeof data === 'string') {
    return TypedefRegistry.get('string').serialize(data, { ...memberDef, type: 'string' })
  }

  // data is a number
  if (typeof data === 'number') {
    return TypedefRegistry.get('number').serialize(data, { ...memberDef, type: 'number' })
  }

  // data is a boolean
  if (typeof data === 'boolean') {
    return TypedefRegistry.get('bool').serialize(data, { ...memberDef, type: 'bool' })
  }

  // data is an array
  if (Array.isArray(data)) {
    return _serializeArray(data, { ...memberDef }, isRoot)
  }

  // data is null
  if (data === null) {
    return 'N'
  }

  // data is undefined
  if (data === undefined) {
    return ''
  }

  // data is a plain javascript object
  if (isPlainObject(data)) {
    return _serializeObject(data, memberDef, isRoot)
  }

  throw new InternetObjectError(ErrorCodes.invalidObject)
}

const _serializeObject = (data: any, memberDef: MemberDef, isRoot: boolean): string => {
  const serialized: string[] = []

  Object.keys(data).forEach(key => {
    const value = data[key]
    const path = memberDef.path
    serialized.push(
      _serialize(
        value,
        {
          ...memberDef,
          path: appendPath(key, path)
        },
        false
      )
    )
  })

  if (isRoot) {
    return serialized.join(',').replace(/,+$/g, '')
  }
  return `{${serialized.join(',').replace(/,+$/g, '')}}`
}

const _serializeArray = (data: any, memberDef: MemberDef, isRoot: boolean): string => {
  const serialized: string[] = []
  const path = memberDef.path

  data.forEach((value: any) => {
    serialized.push(
      _serialize(
        value,
        {
          ...memberDef,
          path: appendPath('[', path)
        },
        false
      )
    )
  })

  if (isRoot) {
    return serialized.join(',')
  }
  return `[${serialized.join(',')}]`
}
