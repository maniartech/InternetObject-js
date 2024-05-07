import Definitions                    from '../core/definitions'
import ErrorCodes                     from '../errors/io-error-codes'
import InternetObjectValidationError  from '../errors/io-validation-error'
import ErrorArgs                      from '../errors/error-args'
import Node                           from '../parser/nodes/nodes'
import TokenNode                      from '../parser/nodes/tokens'
import TokenType                      from '../tokenizer/token-types'
import MemberDef                      from './memberdef'

type CommonTypeCheckResult = {
  value:    any,
  changed:  boolean
}

/**
 * Performs the common validations required before serialization and deserialization
 * @param memberDef The memberDef object
 * @param value The value which needs to be validated
 * @param node The node object, required for tracing line and column when parsing raw internet object code!
 *
 * @internal
 */
function doCommonTypeCheck(memberDef: MemberDef, value: any, node?: Node, defs?: Definitions, collectionIndex?: number): CommonTypeCheckResult {
  const isUndefined = value === undefined || value instanceof TokenNode &&  value.type === TokenType.UNDEFINED
  const isNull = node instanceof TokenNode ? node.value === null : value === null

  // Check for undefined
  if (isUndefined) {
    if (memberDef.default !== undefined) return { value:_default(memberDef.default), changed: true }
    if (memberDef.optional) return { value: undefined, changed: true }
    throw new InternetObjectValidationError(..._valueRequired(memberDef, node, collectionIndex))
  }

  // Check for null
  if (isNull) {
    if (memberDef.nullable) return { value: null, changed: true }
    const msg = `Null is not allowed for ${memberDef.path}` + (collectionIndex !== undefined ? ` at index ${collectionIndex}` : '')
    throw new InternetObjectValidationError(ErrorCodes.nullNotAllowed, msg, node)
  }

  value = (typeof value === 'object' && value.toValue) ? value.toValue(defs) : value

  // Validate choices
  if (memberDef.choices !== undefined && memberDef.choices.indexOf(value) === -1) {
    throw new InternetObjectValidationError(..._invlalidChoice(memberDef, value, node))
  }

  // If everything is okay, return same data
  return { value: value, changed: false }
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
  value = value.toValue
            ? value.toValue()
            : value.toObject
              ? value.toObject()
              : value
  value = JSON.stringify(value)
  let msg = `The value of "${memberDef.path}" must be one of the [${memberDef.choices.join(
    ', '
  )}]. Currently it is ${value}.`
  if (memberDef.choices.length === 1) {
    msg = `The value of "${memberDef.path}" must be '${memberDef.choices[0]}'. Currently it is ${value}.`
  }

  return [ErrorCodes.invalidChoice, msg, node]
}

export default doCommonTypeCheck
