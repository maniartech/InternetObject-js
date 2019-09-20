import MemberDef from './memberdef'
import TypeDef from './typedef'
import ErrorCodes from '../errors/io-error-codes'

import { isArray } from 'util'
import { Token } from '../parser'
import { isParserTree } from '../utils/is'
import { doCommonTypeCheck } from './utils'
import { TypedefRegistry } from './typedef-registry'
import { Node, ParserTreeValue } from '../parser/index'
import { InternetObjectValidationError, ErrorArgs } from '../errors/io-error'

/**
 * Represents an `array`.
 */
class ArrayDef implements TypeDef {
  private _keys: any = null

  public getType() {
    return 'array'
  }

  public parse = (data: ParserTreeValue, memberDef: MemberDef): any => {
    if (isParserTree(data)) {
      return _process('load', memberDef, data.values, data)
    } else if (data === undefined) {
      return _process('load', memberDef, undefined, data)
    }

    // TODO: check this case
    console.assert(false, 'Check this case!')
  }

  public load = (data: any, memberDef: MemberDef): any => {
    const value = data === undefined ? undefined : data
    return _process('load', memberDef, value, data)
  }
}

// Processes an array and performs following validations
// - Value is an array
// - Value is optional
// - Value is nullable
// - array is <= schema.maxLength
// - array is >= schema.minLength
// - Value is in choices
function _process(processingFnName: string, memberDef: MemberDef, value: any, node?: Node) {
  const validatedData = doCommonTypeCheck(memberDef, value, node)
  if (validatedData !== value || validatedData === undefined) return validatedData

  if (!isArray(value)) throw new Error('invalid-value')

  if (memberDef.minLength && value.length < memberDef.minLength) {
    throw new InternetObjectValidationError(..._invlalidMinLength(memberDef, value, node))
  }

  if (memberDef.maxLength && value.length < memberDef.maxLength) {
    throw new InternetObjectValidationError(..._invlalidMaxLength(memberDef, value, node))
  }

  const schema = memberDef.schema

  let typeDef: TypeDef | undefined

  if (schema.type) {
    typeDef = TypedefRegistry.get(schema.type)
  } else {
    console.assert(false, 'Invalid Case: Array schema must have a type attribute!')
    throw new Error('Verify this case!')
  }

  const array: any = []

  value.forEach((item: any) => {
    if (typeDef !== undefined) {
      const value = typeDef[processingFnName](item, schema)
      array.push(value)
    } else {
      // TODO: Improve this error
      throw ErrorCodes.invalidType
    }
  })

  return array
}

function _invlalidArray(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.invalidArray,
    `For "${memberDef.path}" expecting and array, however found this "${typeof value}".`,
    node
  ]
}

function _invlalidMinLength(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.invalidMinLength,
    `The length of the "${memberDef.path}" must be greater than or equal to ${memberDef.minLength}, currently it is "${value.length}".`,
    node
  ]
}

function _invlalidMaxLength(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.invalidMinLength,
    `The length of the "${memberDef.path}" must be less than or equal to ${memberDef.maxLength}, currently it is "${value.length}".`,
    node
  ]
}

export default ArrayDef
