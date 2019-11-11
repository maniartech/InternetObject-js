import DataParser from '../data'
import { ParserTreeValue, Node } from '../parser/index'
import MemberDef from './memberdef'
import TypeDef from './typedef'
import { doCommonTypeCheck } from './utils'
import { isToken, isParserTree, isString, isNumber, isArray, isPlainObject } from '../utils/is'
import { TypedefRegistry } from './typedef-registry'
import { InternetObjectError } from '../errors/io-error'
import ErrorCodes from '../errors/io-error-codes'
import { appendPath } from '../utils'

/**
 * Represents the `any` type, performs the following validations.
 */
export default class AnyDef implements TypeDef {
  getType(): string {
    return 'any'
  }

  validate(data: any, memberDef: MemberDef, node: Node): any {
    const validatedData = doCommonTypeCheck(memberDef, data, node)
  }

  parse(data: ParserTreeValue, memberDef: MemberDef): any {
    const validatedData = doCommonTypeCheck(memberDef, data, data)

    if (validatedData !== data || validatedData === undefined) return validatedData

    if (isToken(data)) return data.value

    if (isParserTree(data)) {
      return DataParser.parse(data)
    }

    // TODO: check this case
    console.assert(false, 'Check this case!')
    console.warn(data, memberDef)
  }

  load(data: any, memberDef: MemberDef): any {
    const validatedData = doCommonTypeCheck(memberDef, data)
    if (validatedData !== data) return validatedData
    return data
  }

  serialize(data: any, memberDef: MemberDef, isRoot: boolean = true): string {
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

  // data is an array
  if (isArray(data)) {
    return _serializeArray(data, { ...memberDef }, isRoot)
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
    return serialized.join(',')
  }
  return `{${serialized.join(',')}}`
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
