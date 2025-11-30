import Definitions            from '../../core/definitions'
import assertNever            from '../../errors/asserts/asserts'
import ErrorCodes             from '../../errors/io-error-codes'
import ValidationError        from '../../errors/io-validation-error'
import ArrayNode              from '../../parser/nodes/array'
import Node                   from '../../parser/nodes/nodes'
import TokenNode              from '../../parser/nodes/tokens'
import Schema                 from '../../schema/schema'
import TypeDef                from '../../schema/typedef'
import TypedefRegistry        from '../../schema/typedef-registry'
import MemberDef              from './memberdef'
import doCommonTypeCheck      from './common-type'

const schema = new Schema(
  "array",
  { type:     { type: "string", optional: false, null: false, choices: ["array"] } },
  { default:  { type: "array",  optional: true,  null: false } },
  { of:       { type: "any",    optional: true,  null: false, __memberdef: true } },
  { len:      { type: "number", optional: true,  null: false, min: 0 } },
  { minLen:   { type: "number", optional: true,  null: false, min: 0 } },
  { maxLen:   { type: "number", optional: true,  null: false, min: 0 } },
)

class ArrayDef implements TypeDef {

  public get type()   { return 'array' }
  public get schema() { return schema }

  public parse = (valueNode: Node, memberDef: MemberDef, defs?: Definitions): any => {
    return _processNode(valueNode, memberDef, defs)
  }

  /**
   * Load: Validates a JavaScript array against the schema
   */
  public load = (value: any, memberDef: MemberDef, defs?: Definitions): any[] => {
    const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (changed) return checkedValue

    // Type check
    if (!Array.isArray(value)) {
      throw new ValidationError(
        ErrorCodes.notAnArray,
        `Expecting an array value for '${memberDef.path}' but found ${typeof value}`
      )
    }

    // Determine the TypeDef for array items
    let typeDef: TypeDef | undefined
    let arrayMemberDef: MemberDef = { type: 'any' }

    if (memberDef.of instanceof Schema) {
      typeDef = TypedefRegistry.get('object')
      arrayMemberDef.schema = memberDef.of
      arrayMemberDef.path = memberDef.path
    } else if (memberDef.of?.type) {
      typeDef = TypedefRegistry.get(memberDef.of.type)
      if (!typeDef) {
        throw new ValidationError(
          ErrorCodes.invalidType,
          `Invalid type definition '${memberDef.of.type}'`
        )
      }
      arrayMemberDef = { ...memberDef.of }
      arrayMemberDef.path = memberDef.path
    } else {
      typeDef = TypedefRegistry.get('any')
    }

    // Load each item using the TypeDef.load() method
    const result: any[] = []
    for (let i = 0; i < value.length; i++) {
      const item = value[i]
      const itemPath = `${memberDef.path || 'array'}[${i}]`
      const itemMemberDef = { ...arrayMemberDef, path: itemPath }

      if (typeDef && 'load' in typeDef && typeof typeDef.load === 'function') {
        result.push(typeDef.load(item, itemMemberDef, defs))
      } else if (typeDef) {
        // Fallback: no load method, just push the value
        result.push(item)
      } else {
        result.push(item)
      }
    }

    // Validate length constraints
    _validateLength(result, memberDef)

    return result
  }

  /**
   * Stringify: Converts a JavaScript array to IO text format
   * Returns undefined to signal "skip this field" (for missing optional values)
   */
  public stringify = (value: any, memberDef: MemberDef, defs?: Definitions): string | undefined => {
    const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (changed) {
      if (checkedValue === null) return 'N'
      if (checkedValue === undefined) return undefined  // Skip this field entirely
      value = checkedValue
    }

    // Type check
    if (!Array.isArray(value)) {
      throw new ValidationError(
        ErrorCodes.notAnArray,
        `Expecting an array value for '${memberDef.path}' but found ${typeof value}`
      )
    }

    // Validate length constraints before stringifying
    _validateLength(value, memberDef)

    // Determine the TypeDef for array items
    let typeDef: TypeDef | undefined
    let arrayMemberDef: MemberDef = { type: 'any' }

    if (memberDef.of instanceof Schema) {
      typeDef = TypedefRegistry.get('object')
      arrayMemberDef.schema = memberDef.of
      arrayMemberDef.path = memberDef.path
    } else if (memberDef.of?.type) {
      typeDef = TypedefRegistry.get(memberDef.of.type)
      arrayMemberDef = { ...memberDef.of }
      arrayMemberDef.path = memberDef.path
    } else if (memberDef.schemaRef && defs) {
      // Array has a schemaRef for its items (e.g., books: [$book])
      typeDef = TypedefRegistry.get('object')
      arrayMemberDef.type = 'object'
      arrayMemberDef.schemaRef = memberDef.schemaRef
      arrayMemberDef.path = memberDef.path
    } else {
      typeDef = TypedefRegistry.get('any')
    }

    // Stringify each item
    const parts: string[] = []
    for (let i = 0; i < value.length; i++) {
      const item = value[i]
      const itemPath = `${memberDef.path || 'array'}[${i}]`
      const itemMemberDef = { ...arrayMemberDef, path: itemPath }

      if (typeDef && 'stringify' in typeDef && typeof typeDef.stringify === 'function') {
        const strValue = typeDef.stringify(item, itemMemberDef, defs)
        parts.push(strValue ?? '')  // Array items shouldn't be undefined, but fallback to empty
      } else {
        // Fallback: use JSON.stringify for items without stringify method
        parts.push(item === null ? 'N' : JSON.stringify(item))
      }
    }

    return `[${parts.join(', ')}]`
  }

  public static get types() { return ['array'] }
}

function _processNode(node: Node, memberDef: MemberDef, defs?: Definitions) {
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
    arrayMemberDef.path = memberDef.path
  } else if (memberDef.of?.type) {
    typeDef = TypedefRegistry.get(memberDef.of.type)
    if (!typeDef) {
      throw new ValidationError(ErrorCodes.invalidType, `Invalid type definition '${memberDef.of.type}'`, node)
    }
    arrayMemberDef = memberDef.of
    arrayMemberDef.path = memberDef.path
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
          err.positionRange = node
        }
        throw err
      }
    } else {
      array.push(typeDef?.parse(item, arrayMemberDef, defs))
    }
  })

  // Validate length constraints
  _validateLength(array, memberDef, valueNode)

  return array
}

/**
 * Validates array length constraints
 */
function _validateLength(array: any[], memberDef: MemberDef, node?: Node): void {
  const arrayLength = array.length

  if (memberDef.len !== undefined && arrayLength !== memberDef.len) {
    throw new ValidationError(
      ErrorCodes.invalidLength,
      `The "${memberDef.path || 'array'}" must have exactly ${memberDef.len} items, but has ${arrayLength}.`,
      node
    )
  }

  if (memberDef.minLen !== undefined && arrayLength < memberDef.minLen) {
    throw new ValidationError(
      ErrorCodes.outOfRange,
      `The "${memberDef.path || 'array'}" must have at least ${memberDef.minLen} items, but has ${arrayLength}.`,
      node
    )
  }

  if (memberDef.maxLen !== undefined && arrayLength > memberDef.maxLen) {
    throw new ValidationError(
      ErrorCodes.outOfRange,
      `The "${memberDef.path || 'array'}" must have at most ${memberDef.maxLen} items, but has ${arrayLength}.`,
      node
    )
  }
}

function _invlalidChoice(key: string, token: TokenNode, min: number) {
  return [
    ErrorCodes.outOfRange,
    `The "${key}" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidLength(key: string, token: ArrayNode, length: number) {
  const actualLength = token instanceof ArrayNode ? token.children.length : 0
  return [
    ErrorCodes.invalidLength,
    `The "${key}" must be ${length}, Currently it is ${actualLength}.`,
    token
  ]
}


function _invlalidMinLength(key: string, token: TokenNode, min: number) {
  return [
    ErrorCodes.outOfRange,
    `The "${key}" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidMaxLength(key: string, token: TokenNode, max: number) {
  return [
    ErrorCodes.outOfRange,
    `The "${key}" must be less than or equal to ${max}, Currently it is "${token.value}".`,
    token
  ]
}

export default ArrayDef
