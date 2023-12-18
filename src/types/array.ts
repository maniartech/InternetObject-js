import Definitions            from '../core/definitions'
import assertNever            from '../errors/asserts/asserts'
import ErrorCodes             from '../errors/io-error-codes'
import ArrayNode              from '../parser/nodes/array'
import Node                   from '../parser/nodes/nodes'
import TokenNode              from '../parser/nodes/tokens'
import Schema                 from '../schema/schema'
import TypeDef                from '../schema/typedef'
import TypedefRegistry        from '../schema/typedef-registry'
import TokenType              from '../tokenizer/token-types'
import MemberDef              from './memberdef'
import doCommonTypeCheck      from './common-type'

const schema = new Schema(
  "array",
  { type:     { type: "string", optional: false, null: false, choices: ["array"] } },
  { default:  { type: "array",  optional: true,  null: false } },
  { len:      { type: "number", optional: true,  null: false, min: 0, default: -1 } },
  { minLen:   { type: "number", optional: true,  null: false, min: 0, default: -1 } },
  { maxLen:   { type: "number", optional: true,  null: false, min: 0, default: -1 } },
  { optional: { type: "bool",   optional: true,  null: false, default: false } },
  { null:     { type: "bool",   optional: true,  null: false, default: false } },
)

class ArrayDef implements TypeDef {
  private _keys: any = null

  public get type() { return 'array' }

  get schema() { return schema }

  public parse = (node: Node, memberDef: MemberDef, defs?: Definitions, collectionIndex?: number): any => {
    const value = node instanceof ArrayNode || node instanceof TokenNode ? node : undefined
    return _processNode(memberDef, value, node, defs, collectionIndex)
  }
}

function _processNode(
  memberDef: MemberDef,
  value: any,
  node?: Node,
  defs?: Definitions,
  collectionIndex?: number
) {
  // Find the right typeDef
  let typeDef: TypeDef | undefined
  let arrayMemberDef: MemberDef = {
    type: 'any'
  }

  if (memberDef.of?.type) {
    typeDef = TypedefRegistry.get(memberDef.of.type)
    arrayMemberDef = memberDef.of
  } else if (typeof memberDef.of === 'string') {
    assertNever(memberDef.of)
  } else {
    typeDef = TypedefRegistry.get('any')
  }

  const array: any = []

  // Check if the value is a definition string starting with $
  // If yes, then get the value from the definitions
  if (node instanceof TokenNode && node.type === TokenType.STRING) {
    value = defs?.getV(node.value)
  } else if (!!value && value instanceof ArrayNode === false) {
    throw new Error('invalid-value')
  }

  const validatedData = doCommonTypeCheck(memberDef, value, node)
  if (validatedData !== node || validatedData === null || validatedData === undefined) {
    return validatedData
  }

  value.children.forEach((item: any) => {
    const value = typeDef?.parse(item, arrayMemberDef, defs)
    array.push(value)
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

function _invlalidLength(key: string, token: ArrayNode, length: number, collectionIndex?: number) {
  const actualLength = token instanceof ArrayNode ? token.children.length : 0
  return [
    ErrorCodes.invalidLength,
    `The "${key}" must be ${length}, Currently it is ${actualLength} for collection index ${collectionIndex}.`,
    token
  ]
}


function _invlalidMinLength(key: string, token: TokenNode, min: number, collectionIndex?: number) {
  return [
    ErrorCodes.invalidMinValue,
    `The "${key}" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidMaxLength(key: string, token: TokenNode, max: number, collectionIndex?: number) {
  return [
    ErrorCodes.invalidMaxValue,
    `The "${key}" must be less than or equal to ${max}, Currently it is "${token.value}".`,
    token
  ]
}

export default ArrayDef
