import ErrorCodes from '../errors/io-error-codes'
import MemberDef from './memberdef'

import { ErrorArgs, InternetObjectError, InternetObjectValidationError } from '../errors/io-error'
import { Node, TokenNode } from '../parser/nodes'


/**
 * Performs the common validations required before serialization and deserialization
 * @param memberDef The memberDef object
 * @param value The value which needs to be validated
 * @param node The node object, required for tracing line and column when parsing raw internet object code!
 *
 * @internal
 */
export function doCommonTypeCheck(memberDef: MemberDef, value?: any, node?: Node): any {
  const isUndefined = value === undefined
  const isNull = node instanceof TokenNode ? node.value === null : value === null

  // Check for undefined
  if (isUndefined) {
    if (memberDef.default !== undefined) return _default(memberDef.default)
    if (memberDef.optional) return undefined
    throw new InternetObjectValidationError(..._valueRequired(memberDef, node))
  }

  // Check for null
  if (isNull) {
    if (memberDef.null) return null
    throw new InternetObjectError(..._nullNotAllowed(memberDef, node))
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

function _valueRequired(memberDef: MemberDef, node?: Node): ErrorArgs {
  return [ErrorCodes.valueRequired, `Value is missing for '${memberDef.path}'.`, node]
}

function _nullNotAllowed(memberDef: MemberDef, node?: Node): ErrorArgs {
  return [ErrorCodes.nullNotAllowed, `${memberDef.path} does not support null.`]
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
