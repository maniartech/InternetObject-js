import Definitions          from '../../core/definitions'
import ValidationError      from '../../errors/io-validation-error'
import ErrorCodes           from '../../errors/io-error-codes'
import Node                 from '../../parser/nodes/nodes'
import TokenNode            from '../../parser/nodes/tokens'
import TypeDef              from '../../schema/typedef'
import TokenType            from '../../parser/tokenizer/token-types'
import Schema               from '../../schema/schema'
import * as strings         from '../../utils/strings'
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
  { type:             { type: "string", optional: false, null: false, choices: STRING_TYPES } },
  { default:          { type: "string", optional: true,  null: false  } },
  { choices:          { type: "array",  optional: true,  null: false, of: { type: "string" } } },
  { pattern:          { type: "string", optional: true,  null: false  } },
  { flags:            { type: "string", optional: true,  null: false } },
  { len:              { type: "number", optional: true,  null: false, min: 0 } },
  { minLen:           { type: "number", optional: true,  null: false, min: 0 } },
  { maxLen:           { type: "number", optional: true,  null: false, min: 0 } },
  { format:           { type: "string", optional: true, null: false, choices: ["auto", "regular", "raw"], default:"auto" } },
  { escapeLines:      { type: "bool",   optional: true, null: false, default: false } },
  { encloser :        { type: "string", optional: true, null: false, choices: ['"', "'"], default: '"' } },
  { optional:         { type: "bool",   optional: true } },
  { null:             { type: "bool",   optional: true } },
)

/**
 * Represents the StringTypeDef which is reponsible for parsing,
 * validating, loading and serializing strings.
 *
 * It performs the following validation
 * - Value is string
* - Value is optional
* - Value is null
* - Value is in choices
 * - Value length <= maxLength
 * - Value length >= minLen
 */
/**
 * The length of a string in CODE POINTS — the unit `len`, `minLen` and `maxLen` are measured in.
 *
 * NOT `value.length`, which counts UTF-16 code units: an emoji or any other character outside the
 * Basic Multilingual Plane measures 2 there, so `"🙂"` failed `len: 1`. That is a JavaScript
 * implementation detail leaking into the format's semantics, and it is invisible in testing until
 * a non-BMP character appears — `"café"` measures 4 under every interpretation.
 *
 * Code points are the only unit that is a property of the TEXT rather than of an encoding or a
 * runtime, and Internet Object is UTF-8 on the wire, where UTF-16 units have no meaning at all.
 * Choosing them makes Python, Go's `utf8.RuneCountInString` and Rust's `.chars().count()` correct
 * by default, and leaves JavaScript as the one implementation needing an explicit spread.
 *
 * See the conformance corpus ISSUE-24.
 */
function codePointLength(value: string): number {
  let n = 0
  for (const _ of value) n++
  return n
}

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

  /** Load: JS Value → Validated JS Value */
  load(value: any, memberDef: MemberDef, defs?: Definitions): string {
    const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (changed) return checkedValue
    // Type check
    if (typeof value !== 'string') {
      throw new ValidationError(ErrorCodes.expectedString, `Expecting a string value for '${memberDef.path}' but found ${JSON.stringify(value)}.`)
    }
    // Shared validations
    _validatePattern(memberDef, value)
    // Len checks
    const len = memberDef.len
    if (len !== undefined && typeof len === 'number' && codePointLength(value) !== len) {
      throw new ValidationError(ErrorCodes.mismatchedLen, `Invalid length for ${memberDef.path}.`)
    }
    const maxLen = memberDef.maxLen
    if (maxLen !== undefined && typeof maxLen === 'number' && codePointLength(value) > maxLen) {
      throw new ValidationError(ErrorCodes.mismatchedMaxLen, `Invalid maxLength for ${memberDef.path}.`)
    }
    const minLen = memberDef.minLen
    if (minLen !== undefined && typeof minLen === 'number' && codePointLength(value) < minLen) {
      throw new ValidationError(ErrorCodes.mismatchedMinLen, `Invalid minLength for ${memberDef.path}.`)
    }
    return value
  }

  stringify(value: string, memberDef: MemberDef): string {
    // Validate before formatting to ensure consistency
    this.load(value, memberDef)
    const format = memberDef.format || 'auto'
    switch (format) {
      case 'auto':
        // Smart output: tries unquoted first, quotes when needed (ambiguous values,
        // commas), uses raw for strings with many escape chars. Never breaks round-trip.
        return strings.toAutoString(value, memberDef.escapeLines, memberDef.encloser)

      case 'regular':
        // Always quoted: "value"
        return strings.toRegularString(value, memberDef.escapeLines, memberDef.encloser)

      case 'raw':
        // Always raw: r"value"
        return strings.toRawString(value, memberDef.encloser)

      default:
        // Fallback to auto for any unknown format
        return strings.toAutoString(value, memberDef.escapeLines, memberDef.encloser)
    }
  }
}

function _process(node: Node, memberDef: MemberDef, defs?: Definitions): string {
  const valueNode = defs?.getV(node) || node
  const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
  if (changed) return value

  if (valueNode instanceof TokenNode === false || valueNode.type !== TokenType.STRING) {
    throw new ValidationError(ErrorCodes.expectedString,
      `Expecting a string value for '${memberDef.path}' but found ${valueNode.toValue()}.`,
      node)
  }

  _validatePattern(memberDef, value, node)


  // Len check
  const len = memberDef.len
  if (len !== undefined && typeof len === 'number') {
    if (codePointLength(value) !== len) {
      throw new ValidationError(
        ErrorCodes.mismatchedLen,
        `Invalid length for ${memberDef.path}.`, valueNode
      )
    }
  }

  // Max length check
  const maxLen = memberDef.maxLen
  if (maxLen !== undefined && typeof maxLen === 'number') {
    if (codePointLength(value) > maxLen) {
      throw new ValidationError(
        ErrorCodes.mismatchedMaxLen,
        `Invalid maxLength for ${memberDef.path}.`, valueNode
        )
      }
    }

    // Max length check
    const minLen = memberDef.minLen
    if (minLen !== undefined && typeof minLen === 'number') {
    if (codePointLength(value) < minLen) {
      throw new ValidationError(
        ErrorCodes.mismatchedMinLen,
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
        throw new ValidationError(ErrorCodes.mismatchedPattern, value, node)
      }
    }
    if (!re.test(value)) {
      throw new ValidationError(ErrorCodes.mismatchedPattern,
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
