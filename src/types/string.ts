import Definitions          from '../core/definitions'
import ValidationError      from '../errors/io-validation-error'
import ErrorCodes           from '../errors/io-error-codes'
import ErrorArgs            from '../errors/error-args'
import Node                 from '../parser/nodes/nodes'
import TokenNode            from '../parser/nodes/tokens'
import TypeDef              from '../schema/typedef'
import TokenType            from '../tokenizer/token-types'
import Schema               from '../schema/schema'
import MemberDef            from './memberdef'
import doCommonTypeCheck    from './common-type'

// Reference: RFC 5322 Official Standard
// http://emailregex.com
const emailExp = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/

// http://urlregex.com
const urlExp = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/

const schema = new Schema(
  "string",
  { type:     { type: "string", optional: false, null: false, choices: ["string", "url", "email"] } },
  { default:  { type: "string", optional: true,  null: false  } },
  { choices:  { type: "array",  optional: true,  null: false, of: { type: "string" } } },
  { pattern:  { type: "string", optional: true,  null: false  } },
  { flags:    { type: "string", optional: true,  null: false } },
  { len:      { type: "number", optional: true,  null: false, min: 0, default: -1 } },
  { minLen:   { type: "number", optional: true,  null: false, min: 0, default: -1 } },
  { maxLen:   { type: "number", optional: true,  null: false, min: 0, default: -1 } },
  { optional: { type: "bool",   optional: true,  null: false, default: false } },
  { null:     { type: "bool",   optional: true,  null: false, default: false } },
)

/**
 * Represents the StringTypeDef which is reponsible for parsing,
 * validating, loading and serializing strings.
 *
 * It performs the following validation
 * - Value is string
 * - Value is optional
 * - Value is nullable
 * - Value length <= maxLength
 * - Value length >= minLength
 * - Value is in choices
 */
export default class StringDef implements TypeDef {
  private _type: string

  constructor(type: string = 'string') {
    this._type = type
  }

  get type() { return this._type }
  get schema() { return schema }

  /**
   * Parses the string in IO format into JavaScript strings.
   */
  parse(valueNode: Node, memberDef: MemberDef, defs?: Definitions): string {
    return _process(valueNode, memberDef, defs)
  }
}

function _process(node: Node, memberDef: MemberDef, defs?: Definitions): string {
  const valueNode = defs?.getV(node) || node
  const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
  if (changed) return value

  if (valueNode instanceof TokenNode === false || valueNode.type !== TokenType.STRING) {
    throw new ValidationError(ErrorCodes.notAString,
      `Expecting a string value for '${memberDef.path}' but found ${valueNode.toValue()}.`,
      node)
  }

  // TODO: Validate Data for subtypes
  _validatePattern(memberDef, value, node)

  const maxLength = memberDef.maxLength

  // Max length check
  if (maxLength !== undefined && typeof maxLength === 'number') {
    if (value.length > maxLength) {
      throw new ValidationError(
        ErrorCodes.invalidMaxLength,
        `Invalid maxLength for ${memberDef.path}.`
      )
    }
  }

  const minLength = memberDef.minLength
  // Max length check
  if (minLength !== undefined && typeof minLength === 'number') {
    if (value.length > minLength) {
      throw new ValidationError(
        ErrorCodes.invalidMinLength,
        `Invalid minLength for ${memberDef.path}.`
      )
    }
  }
  return value
}

function _validatePattern(memberDef: MemberDef, value: string, node?: Node) {
  const type = memberDef.type

  // Validate user defined pattern
  if (type === 'string' && memberDef.pattern !== undefined) {
    let re = memberDef.re
    if (!re) {
      let pattern = memberDef.pattern
      let flags = memberDef.flags
      // Add ^ and $ at the beginning and end of the pattern respectively
      // if these characters are not set in the pattern
      // pattern = pattern.startsWith('^') ? pattern : `^${pattern}`
      // pattern = pattern.endsWith('$') ? pattern : `${pattern}$`

      // Compile the expression and cache it into the memberDef
      try {
        if (flags) {
          re = memberDef.re = new RegExp(pattern, flags)
        } else {
          re = memberDef.re = new RegExp(pattern)
        }
        memberDef.re = re // Cache the compiled expression
      } catch {
        throw new ValidationError(ErrorCodes.invalidPattern, value, node as TokenNode)
      }
    }
    if (!re.test(value)) {
      throw new ValidationError(ErrorCodes.invalidPattern, value, node as TokenNode)
    }
  }
  // Validate email
  else if (type === 'email') {
    if (!emailExp.test(value)) {
      throw new ValidationError(ErrorCodes.invalidEmail)
    }
  }
  // Validate url
  else if (type === 'url') {
    if (!urlExp.test(value)) {
      throw new ValidationError(ErrorCodes.invalidUrl)
    }
  }
}

function _notAString(path: string, data: TokenNode): ErrorArgs {
  return [ErrorCodes.notAString, `Expecting a string value for '${path}'`, data]
}

function _invlalidChoice(path: string, data: TokenNode, choices: number[]): ErrorArgs {
  return [
    ErrorCodes.invalidValue,
    `The value of "${path}" must be one of the [${choices.join(',')}]. Currently it is ${
      data.value
    }.`,
    data
  ]
}

function _invlalidMinLength(path: string, data: TokenNode, minLength: number): ErrorArgs {
  return [
    ErrorCodes.invalidMinLength,
    `The length of "${path}" must be ${minLength} or more. Currently it is ${data.value.length}.`,
    data
  ]
}

function _invlalidMaxLength(path: string, data: TokenNode, maxLength: number): ErrorArgs {
  return [
    ErrorCodes.invalidMaxLength,
    `The length of "${path}" must be ${maxLength} or more. Currently it is ${data.value.length}.`,
    data
  ]
}
