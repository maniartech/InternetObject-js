import Definitions            from '../core/definitions'
import assertNever            from '../errors/asserts/asserts'
import ErrorCodes             from '../errors/io-error-codes'
import ValidationError        from '../errors/io-validation-error'
import ArrayNode              from '../parser/nodes/array'
import Node                   from '../parser/nodes/nodes'
import TokenNode              from '../parser/nodes/tokens'
import Schema                 from '../schema/schema'
import TypeDef                from '../schema/typedef'
import TypedefRegistry        from '../schema/typedef-registry'
import MemberDef              from './memberdef'
import doCommonTypeCheck      from './common-type'

const schema = new Schema(
  "array",
  { type:     { type: "string", optional: false, null: false, choices: ["array"] } },
  { default:  { type: "array",  optional: true,  null: false } },
  { of:       { type: "any",    optional: true,  null: false } },
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

  public parse = (valueNode: Node, memberDef: MemberDef, defs?: Definitions, collectionIndex?: number): any => {
    return _processNode(valueNode, memberDef, defs, collectionIndex)
  }
}

function _processNode(
  node: Node,
  memberDef: MemberDef,
  defs?: Definitions,
  collectionIndex?: number
) {
  const valueNode = defs?.getV(node) || node
  const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
  if (changed) return value

  if (valueNode instanceof ArrayNode === false) {
    throw new ValidationError(ErrorCodes.notAnArray, `Expecting an array value for '${memberDef.path}'`, node)
  }

  // Find the right typeDef
  let typeDef: TypeDef | undefined
  let arrayMemberDef: MemberDef = {
    type: 'any'
  }

  if (memberDef.of instanceof Schema) {
    typeDef = TypedefRegistry.get('object')
    arrayMemberDef.schema = memberDef.of
  } else if (memberDef.of?.type) {
    typeDef = TypedefRegistry.get(memberDef.of.type)
    arrayMemberDef = memberDef.of
  } else if (typeof memberDef.of === 'string') {
    assertNever(memberDef.of)
  } else {
    typeDef = TypedefRegistry.get('any')
  }

  const array: any = []
  valueNode.children.forEach((item: any) => {
    // If it is a definition
    if (valueNode !== node) {
      try {
        array.push(typeDef?.parse(item, arrayMemberDef, defs))
      } catch (err) {
        // Before rethrowing the error, change the position of the error to
        // the original node.
        if (err instanceof ValidationError) {
          err.position = node
        }
        throw err
      }
    } else {
      array.push(typeDef?.parse(item, arrayMemberDef, defs))
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
