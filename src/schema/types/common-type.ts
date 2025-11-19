import Definitions                    from '../../core/definitions'
import ErrorCodes                     from '../../errors/io-error-codes'
import InternetObjectValidationError  from '../../errors/io-validation-error'
import ErrorArgs                      from '../../errors/error-args'
import Node                           from '../../parser/nodes/nodes'
import TokenNode                      from '../../parser/nodes/tokens'
import TokenType                      from '../../parser/tokenizer/token-types'
import MemberDef                      from './memberdef'

type CommonTypeCheckResult = {
  value:    any,
  changed:  boolean
}

type EqualityComparator = (value: any, choice: any) => boolean

/**
 * Performs the common validations required before serialization and deserialization
 * @param memberDef The memberDef object
 * @param value The value which needs to be validated
 * @param node The node object, required for tracing line and column when parsing raw internet object code!
 * @param defs Optional definitions for resolving references
 * @param equalityComparator Optional callback for type-specific equality comparison in choices validation
 *
 * @internal
 */
function doCommonTypeCheck(memberDef: MemberDef, value: any, node?: Node, defs?: Definitions, equalityComparator?: EqualityComparator): CommonTypeCheckResult {
  const isUndefined = value === undefined || value instanceof TokenNode &&  value.type === TokenType.UNDEFINED
  const isNull = node instanceof TokenNode ? node.value === null : value === null

  // Check for undefined
  if (isUndefined) {
    if (memberDef.default !== undefined) {
      // Two-stage dereferencing: defs passed for schema compilation runtime,
      // but variables already resolved in processObject for data processing runtime
      return { value:_default(memberDef.default, defs), changed: true }
    }
    if (memberDef.optional) return { value: undefined, changed: true }
    throw new InternetObjectValidationError(..._valueRequired(memberDef, node))
  }

  // Check for null
  if (isNull) {
    if (memberDef.null) return { value: null, changed: true }
    const msg = `Null is not allowed for ${memberDef.path}`
    throw new InternetObjectValidationError(ErrorCodes.nullNotAllowed, msg, node)
  }

  value = (typeof value === 'object' && value.toValue) ? value.toValue(defs) : value

  // Validate choices
  if (memberDef.choices !== undefined) {
    let val = value instanceof TokenNode ? value.value : value
    let found = false
    for (let choice of memberDef.choices) {
      if (typeof choice === 'string' && choice[0] === '@') {
        choice = defs?.getV(choice)
        choice = (choice as any) instanceof TokenNode ? choice.value : choice
      }

      // Use custom equality comparator if provided, otherwise use simple equality
      const isEqual = equalityComparator ? equalityComparator(val, choice) : val === choice
      if (isEqual) {
        found = true
        break
      }
    }

    if (!found) {
      throw new InternetObjectValidationError(..._invlalidChoice(memberDef, value, node))
    }
  }

  // If everything is okay, return same data
  return { value: value, changed: false }
}

/**
 * Processes default values with two-stage variable dereferencing:
 * 1. Schema compilation runtime: Resolves variables when validating MemberDef constraints
 * 2. Data processing runtime: Variables already resolved by _resolveMemberDefVariables in processObject
 *
 * Also handles TokenNode unwrapping and string literal conversions (N, T, F).
 */
function _default(value: any, defs?: Definitions) {
  // Unwrap TokenNode and resolve variables if present
  if (value instanceof TokenNode) {
    // If it's a variable/schema reference, resolve it (schema compilation runtime)
    if (typeof value.value === 'string' && value.value.startsWith('@') && defs) {
      value = defs.getV(value)
      // Unwrap TokenNode if getV returned one
      value = (value as any) instanceof TokenNode ? value.value : value
    } else {
      value = value.value
    }
  }

  // Resolve variable references in plain strings (data processing runtime fallback)
  if (typeof value === 'string' && value.startsWith('@') && defs) {
    value = defs.getV(value)
    // Unwrap TokenNode if getV returned one
    value = (value as any) instanceof TokenNode ? value.value : value
  }

  // Convert string literals
  if (typeof value === 'string') {
    if (value === 'N') return null
    if (value === 'T' || value === 'true') return true
    if (value === 'F' || value === 'false') return false
  }

  return value
}function _valueRequired(memberDef: MemberDef, node?: Node): ErrorArgs {
  const msg = `Value is required for ${memberDef.path}`
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
