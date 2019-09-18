import { Node } from '../parser/index'
import { isToken } from '../utils/is'
import { InternetObjectError, ErrorArgs } from '../errors/io-error'
import MemberDef from './memberdef'
import ErrorCodes from '../errors/io-error-codes'

/**
 * Performs the common validations required before serialization and deserialization
 * @param memberDef The memberDef object
 * @param value The value which needs to be validated
 * @param node The node object, required for tracing line and column when parsing raw internet object code!
 */
export function doCommonTypeCheck(memberDef: MemberDef, value?: any, node?: Node): any {
  const isUndefined = value === undefined
  const isNull = isToken(node) ? node.value === null : value === null

  // Check for undefined
  if (isUndefined) {
    if (memberDef.optional) return memberDef.default
    throw new InternetObjectError('value-required', `Value is missing for '${memberDef.path}'.`)
  }

  // Check for null
  if (isNull) {
    if (memberDef.null) return null
    throw new InternetObjectError('null-not-allowed', `${memberDef.path} does not support null.`)
  }

  // Validate choices
  if (memberDef.choices !== undefined && memberDef.choices.indexOf(value) === -1) {
    throw new InternetObjectValidationError(..._invlalidChoice(memberDef, value, node))
  }

  // If everything is okay, return same data
  return value
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
