import TypeDef from './typedef'
import MemberDef from './memberdef'
import ErrorCodes from '../errors/io-error-codes'
import DataParser from '../data/index'
import KeyValueCollection from '../header/index'

import { appendPath } from '../utils/index'
import { TypedefRegistry } from './typedef-registry'
import { doCommonTypeCheck } from './utils'
import { InternetObjectError } from '../errors/io-error'
import { ParserTreeValue } from '../parser/index'
import {
  isToken,
  isParserTree,
  isString,
  isBoolean,
  isNumber,
  isArray,
  isPlainObject
} from '../utils/is'

/**
 * Represents the AnyTypeDef which is reponsible for parsing,
 * validating, loading and serializing any values.
 */
export default class AnyDef implements TypeDef {
  /**
   * Returns the type this instance is going to handle.
   * Always returns "any"
   */
  getType(): string {
    return 'any'
  }

  /**
   * Parses any value in IO format into JavaScript.
   */
  parse(data: ParserTreeValue, memberDef: MemberDef, vars?: KeyValueCollection): any {
    const validatedData = doCommonTypeCheck(memberDef, data, data)

    if (validatedData !== data || validatedData === null || validatedData === undefined) {
      return validatedData
    }

    if (isToken(data)) {
      let value: string = data.value
      if (vars) {
        const valueFound = vars.getV(value)
        value = valueFound || value
      }

      return value
    }

    if (isParserTree(data)) {
      return DataParser.parse(data, vars)
    }

    // TODO: check this case
    console.assert(false, 'Check this case!')
    console.warn(data, memberDef)
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
  if (isString(data)) {
    return TypedefRegistry.get('string').serialize(data, { ...memberDef, type: 'string' })
  }

  // data is a number
  if (isNumber(data)) {
    return TypedefRegistry.get('number').serialize(data, { ...memberDef, type: 'number' })
  }

  // data is a boolean
  if (isBoolean(data)) {
    return TypedefRegistry.get('bool').serialize(data, { ...memberDef, type: 'bool' })
  }

  // data is an array
  if (isArray(data)) {
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
