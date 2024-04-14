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

const STRING_TYPES = ['string', 'url', 'email']

// Reference: RFC 5322 Official Standard
// http://emailregex.com
const emailExp = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/

// http://urlregex.com
const urlExp = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/

const schema = new Schema(
  "string",
  { type:     { type: "string", optional: false, null: false, choices: STRING_TYPES } },
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
* - Value is in choices
 * - Value length <= maxLength
 * - Value length >= minLen
 */
export default class StringDef implements TypeDef {
  private _type: string

  constructor(type: string = 'string') {
    this._type = type
  }

  get type() { return this._type }

  static get types() { return STRING_TYPES }

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

  _validatePattern(memberDef, value, node)


  // Len check
  const len = memberDef.len
  if (len !== undefined && typeof len === 'number') {
    if (value.length !== len) {
      throw new ValidationError(
        ErrorCodes.invalidLength,
        `Invalid length for ${memberDef.path}.`, valueNode
      )
    }
  }

  // Max length check
  const maxLen = memberDef.maxLen
  if (maxLen !== undefined && typeof maxLen === 'number') {
    if (value.length > maxLen) {
      throw new ValidationError(
        ErrorCodes.invalidMaxLength,
        `Invalid maxLength for ${memberDef.path}.`, valueNode
        )
      }
    }

    // Max length check
    const minLen = memberDef.minLen
    if (minLen !== undefined && typeof minLen === 'number') {
    console.log('StringDef: ', value, memberDef.path, memberDef.minLen)
    if (value.length < minLen) {
      throw new ValidationError(
        ErrorCodes.invalidMinLength,
        `Invalid minLen for ${memberDef.path}.`, valueNode
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

      // Compile the expression and cache it into the memberDef
      try {
        if (flags) {
          re = memberDef.re = new RegExp(pattern, flags)
        } else {
          re = memberDef.re = new RegExp(pattern)
        }
        memberDef.re = re // Cache the compiled expression
      } catch {
        throw new ValidationError(ErrorCodes.invalidPattern, value, node)
      }
    }
    if (!re.test(value)) {
      throw new ValidationError(ErrorCodes.invalidPattern,
        `The value '${value}' does not match the pattern '${memberDef.pattern}'.`, node)
    }
  }
  // Validate email
  else if (type === 'email') {
    if (!emailExp.test(value)) {
      throw new ValidationError(ErrorCodes.invalidEmail, `Invalid email address: ${value}`, node)
    }
  }
  // Validate url
  else if (type === 'url') {
    if (!urlExp.test(value)) {
      throw new ValidationError(ErrorCodes.invalidUrl, `Invalid URL: ${value}`, node)
    }
  }
}
