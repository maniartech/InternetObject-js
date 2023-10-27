import Definitions              from '../core/definitions';
import { InternetObjectError  } from '../errors/io-error';
import ErrorCodes               from '../errors/io-error-codes';
import ArrayNode                from '../parser/nodes/array';
import Node                     from '../parser/nodes/nodes';
import TokenNode                from '../parser/nodes/tokens';
import Schema                   from '../schema/schema';
import MemberDef                from './memberdef';
import TypeDef                  from './typedef';
import TypedefRegistry          from './typedef-registry';
import { doCommonTypeCheck    } from './utils';

const schema = new Schema(
  { type:     { type: "string", optional: false, null: false, choices: ["array"] } },
  { default:  { type: "array",  optional: true,  null: false  } },
  { len:      { type: "number", optional: true,  null: false, min: 0, default: -1 } },
  { minLen:   { type: "number", optional: true,  null: false, min: 0, default: -1 } },
  { maxLen:   { type: "number", optional: true,  null: false, min: 0, default: -1 } },
  { optional: { type: "bool",   optional: true,  null: false, default: false } },
  { null:     { type: "bool",   optional: true,  null: false, default: false } },
)


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

  public parse = (node: Node, memberDef: MemberDef, defs?: Definitions): any => {
    const value = node instanceof ArrayNode ? node : undefined
    return _processNode(memberDef, value, node, defs)
  }

  public load = (data: any, memberDef: MemberDef): any => {
    const value = data === undefined ? undefined : data
    return _process(memberDef, value, data)

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

    const validatedData = doCommonTypeCheck(memberDef, data)
    if (validatedData !== data) {
      // TODO: Test, when the validated data is not same,
      // can occur in situation when the default value is repaced
      data = validatedData
    } else if (validatedData === undefined) {
      // When undefined allowed
      return ''
    } else if (validatedData === null) {
      // When the null is allowed or the default value is null
      return 'N'
    }

    const serialized: string[] = []
    const schema = memberDef.schema
    const typeDef = TypedefRegistry.get(schema.type)

    data.forEach((value: any) => {
      serialized.push(typeDef.serialize(value, schema))
    })

    return `[${serialized.join(',')}]`
  }

  get schema() {
    return schema
  }
}


function _processNode(
  memberDef: MemberDef,
  value: any,
  node?: Node,
  defs?: Definitions
) {
  const validatedData = doCommonTypeCheck(memberDef, value, node)
  if (validatedData !== value || value === undefined) return validatedData

  if (value instanceof ArrayNode === false) throw new Error('invalid-value')

  let typeDef: TypeDef | undefined
  let arrayMemberDef: MemberDef = {
    type: 'any'
  }

  if (memberDef.of?.type) {
    typeDef = TypedefRegistry.get(memberDef.of.type)
    arrayMemberDef = memberDef.of
  } else if (typeof memberDef.of === 'string') {
    throw new Error('Invalid Memberdef Case')
  } else {
    typeDef = TypedefRegistry.get('any')
  }

  const array: any = []
  value.children.forEach((item: any) => {
    const value = typeDef?.parse(item, arrayMemberDef, defs)
    array.push(value)
  })

  return array
}

function _process(
  memberDef: MemberDef,
  value: any,
  node?: Node,
  defs?: Definitions
) {
  const validatedData = doCommonTypeCheck(memberDef, value, node)
  if (validatedData !== value || value === undefined) return validatedData

  if (!Array.isArray(value)) throw new Error('invalid-value')

  const schema = memberDef.schema

  let typeDef: TypeDef | undefined

  if (schema?.type) {
    typeDef = TypedefRegistry.get(schema.type)
  } else {
    typeDef = TypedefRegistry.get('any')
  }

  const array: any = []

  value.forEach((item: any) => {
    if (typeDef !== undefined) {
      const value = typeDef.load(item, schema)
      array.push(value)
    } else {
      // TODO: Improve this error
      throw ErrorCodes.invalidType
    }
  })

  return array
}

function _invlalidChoice(key: string, token: TokenNode, min: number) {
  return [
    ErrorCodes.invalidMinValue,
    `The "${key}" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidMinLength(key: string, token: TokenNode, min: number) {
  return [
    ErrorCodes.invalidMinValue,
    `The "${key}" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidMaxLength(key: string, token: TokenNode, max: number) {
  return [
    ErrorCodes.invalidMaxValue,
    `The "${key}" must be less than or equal to ${max}, Currently it is "${token.value}".`,
    token
  ]
}

export default ArrayDef
