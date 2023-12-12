import ErrorCodes                     from '../errors/io-error-codes'
import MemberDef                      from './memberdef'
import ErrorArgs                      from '../errors/error-args'
import Node                           from '../parser/nodes/nodes'
import TokenNode                      from '../parser/nodes/tokens'
import InternetObjectValidationError  from '../errors/io-validation-error'

/**
 * Performs the common validations required before serialization and deserialization
 * @param memberDef The memberDef object
 * @param value The value which needs to be validated
 * @param node The node object, required for tracing line and column when parsing raw internet object code!
 *
 * @internal
 */
function doCommonTypeCheck(memberDef: MemberDef, value?: any, node?: Node, collectionIndex?: number): any {
  const isUndefined = value === undefined
  const isNull = node instanceof TokenNode ? node.value === null : value === null

  // Check for undefined
  if (isUndefined) {
    if (memberDef.default !== undefined) return _default(memberDef.default)
    if (memberDef.optional) return undefined
    throw new InternetObjectValidationError(..._valueRequired(memberDef, node, collectionIndex))
  }

  // Check for null
  if (isNull) {
    if (memberDef.null) return null
    const msg = `Null is not allowed for ${memberDef.path}` + (collectionIndex !== undefined ? ` at index ${collectionIndex}` : '')
    throw new InternetObjectValidationError(ErrorCodes.nullNotAllowed, msg, node)
  }

  // Validate choices
  if (memberDef.choices !== undefined && memberDef.choices.indexOf(value) === -1) {
    throw new InternetObjectValidationError(..._invlalidChoice(memberDef, value, node))
  }

  // If everything is okay, return same data
  return value
}

function _default(value: any) {
  if (typeof value === 'string') {
    if (value === 'N') return null
    if (value === 'T' || value === 'true') return true
    if (value === 'F' || value === 'false') return false
    return value
  }
  return value
}

function _valueRequired(memberDef: MemberDef, node?: Node, collectionIndex?: number): ErrorArgs {
  const msg = `Value is required for ${memberDef.path}` + (collectionIndex !== undefined ? ` at index ${collectionIndex}` : '')
  return [ErrorCodes.valueRequired, msg , node]
}

function _nullNotAllowed(memberDef: MemberDef, node?: Node): ErrorArgs {
  return [ErrorCodes.nullNotAllowed, `${memberDef.path} does not support null.`, node]
}

// Return an invalid choice error parameters
function _invlalidChoice(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  if (!memberDef.choices) throw Error('Choices not checked during NumberDef implementation.')
  return [
    ErrorCodes.invalidChoice,
    `The value of "${memberDef.path}" must be one of the [${memberDef.choices.join(
      ','
    )}]. Currently it is ${value}.`,
    node
  ]
}

export default doCommonTypeCheck