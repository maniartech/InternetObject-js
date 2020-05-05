import MemberDef from './memberdef'
import TypeDef from './typedef'
import ErrorCodes from '../errors/io-error-codes'
import KeyValueCollection from '../header'

import { isArray } from 'util'
import { InternetObjectError } from '../errors/io-error'

import { Token } from '../parser'
import { Node, ParserTreeValue } from '../parser/index'
import { isParserTree, isString } from '../utils/is'
import { TypedefRegistry } from './typedef-registry'
import { doCommonTypeCheck } from './utils'

// age?: { number, true, 10, min:10, max:20}

/**
 * Represents the `array`, performs following validations.
 * - Value is an array
 * - Value is optional
 * - Value is nullable
 * - array is <= schema.maxLength
 * - array is >= schema.minLength
 * - Value is in choices
 */
class ArrayDef implements TypeDef {
  private _keys: any = null

  public getType() {
    return 'array'
  }

  public parse = (data: ParserTreeValue, memberDef: MemberDef, vars?: KeyValueCollection): any => {
    if (isParserTree(data)) {
      return _process('parse', memberDef, data.values, data, vars)
    } else if (data === undefined) {
      return _process('parse', memberDef, undefined, data, vars)
    }

    throw new Error('invalid-value')
  }

  public load = (data: any, memberDef: MemberDef): any => {
    const value = data === undefined ? undefined : data
    return _process('load', memberDef, value, data)

    // const validatedData = doCommonTypeCheck(memberDef)
    // if (validatedData !== data) return validatedData

    // if (!isArray(data)) throw new Error("invalid-value")

    // const schema = memberDef.schema

    // let typeDef:TypeDef | undefined

    // if (schema.type) {
    //   typeDef = TypedefRegistry.get(schema.type)
    // }
    // else {
    //   console.assert(false, "Invalid Case: Array schema must have a type attribute!")
    //   throw new Error("Verify this case!")
    // }

    // const array:any = []

    // data.forEach((item:any) => {
    //   if(typeDef !== undefined) {
    //     const value = typeDef.load(item, schema)
    //     array.push(value)
    //   }
    //   else {
    //     // TODO: Improve this error
    //     throw ErrorCodes.invalidType
    //   }
    // })

    // return array
  }

  public serialize = (data: any, memberDef: MemberDef): string => {
    if (memberDef.type !== 'array') {
      throw new InternetObjectError(ErrorCodes.invalidArray)
    }

    const serialized: string[] = []
    const schema = memberDef.schema
    const typeDef = TypedefRegistry.get(schema.type)

    data.forEach((value: any) => {
      serialized.push(typeDef.serialize(value, schema))
    })

    return `[${serialized.join(',')}]`
  }
}

function _process(
  processingFnName: string,
  memberDef: MemberDef,
  value: any,
  node?: Node,
  vars?: KeyValueCollection
) {
  const validatedData = doCommonTypeCheck(memberDef, value, node)
  if (validatedData !== value || value === undefined) return validatedData

  if (!isArray(value)) throw new Error('invalid-value')

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
      const value = typeDef[processingFnName](item, schema, vars)
      array.push(value)
    } else {
      // TODO: Improve this error
      throw ErrorCodes.invalidType
    }
  })

  return array
}

function _invlalidChoice(key: string, token: Token, min: number) {
  return [
    ErrorCodes.invalidMinValue,
    `The "${key}" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidMinLength(key: string, token: Token, min: number) {
  return [
    ErrorCodes.invalidMinValue,
    `The "${key}" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidMaxLength(key: string, token: Token, max: number) {
  return [
    ErrorCodes.invalidMaxValue,
    `The "${key}" must be less than or equal to ${max}, Currently it is "${token.value}".`,
    token
  ]
}

export default ArrayDef
