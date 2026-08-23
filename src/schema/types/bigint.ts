import Definitions from '../../core/definitions'
import ErrorCodes from '../../errors/io-error-codes'
import ValidationError from '../../errors/io-validation-error'
import Node from '../../parser/nodes/nodes'
import Schema from '../../schema/schema'
import TypeDef from '../../schema/typedef'
import doCommonTypeCheck from './common-type'
import MemberDef from './memberdef'
import { NUMBER_TYPES, NUMBER_MAP, RADIX_FORMATS, throwError } from './common-number'

const bigintSchema = new Schema(
  "bigint",
  { type:       { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:    { type: "bigint", optional: true,  null: false  } },
  { choices:    { type: "array",  optional: true,  null: false, of: { type: "bigint" } } },
  { min:        { type: "bigint", optional: true,  null: false } },
  { max:        { type: "bigint", optional: true,  null: false } },
  { multipleOf: { type: "bigint", optional: true,  null: false } },
  { format:     { type: "string", optional: true,  null: false, choices: ["decimal", "hex", "octal", "binary", "scientific"], default:"decimal" } },
  { optional:   { type: "bool",   optional: true } },
  { null:       { type: "bool",   optional: true } },
)

/**
 * BigInt type definition
 *
 * @internal
 */
class BigIntDef implements TypeDef {
  private _type: string = 'bigint'

  get type(): string { return this._type }
  get schema(): Schema { return bigintSchema }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions): bigint {
    const valueNode = defs?.getV(node) || node
    const rawValue = typeof (valueNode as any)?.toValue === 'function' ? (valueNode as any).toValue(defs) : valueNode
    let { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    value = this.validate(memberDef, value, node)

    return value
  }

  load(value: any, memberDef: MemberDef, defs?: Definitions): bigint {
    const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value)
    if (changed) return checkedValue

    return this.validate(memberDef, value)
  }

  stringify(value: any, memberDef: MemberDef): string {
    // Validate before stringifying
    this.validate(memberDef, value)

    // A display `format` only changes the BASE, never the type. The base prefix and the `n`
    // suffix are both required, or the output no longer re-parses as the bigint it came from
    // (bare `ff` is an open string, and `0xff` is a number). See the specification
    // `serialization/value-formatting.md`.
    const radix = RADIX_FORMATS[memberDef.format as keyof typeof RADIX_FORMATS]
    if (radix) {
      const [prefix, base] = radix
      const negative = value < 0n
      return `${negative ? '-' : ''}${prefix}${(negative ? -value : value).toString(base)}n`
    }

    // Scientific. A bigint has no fractional part, so the mantissa stays an integer and the
    // exponent is never negative: trailing zeros move into the exponent (`1200000n` -> `12e5n`)
    // and a value with none is written `e0` (`255n` -> `255e0n`). Anything else — a fractional
    // mantissa, a negative exponent — is not a valid bigint literal.
    if (memberDef.format === 'scientific') {
      const digits = (value < 0n ? -value : value).toString()
      const mantissa = digits.replace(/0+$/, '')
      // An all-zero magnitude leaves nothing behind; `0` is its own mantissa.
      const trimmed = mantissa === '' ? '0' : mantissa
      const exponent = digits.length - trimmed.length
      return `${value < 0n ? '-' : ''}${trimmed}e${exponent}n`
    }

    // Default (and the explicit `decimal` format) is the plain IO literal form.
    return value.toString() + 'n'
  }

  /**
   * Validates bigint value
   */
  validate(memberDef: MemberDef, value: any, node?: Node): bigint {
    const valueType = typeof value === "bigint" ? "bigint" : NUMBER_MAP[typeof value] ? "number" : ""

    if (valueType === "") {
      throw new ValidationError(
        ErrorCodes.expectedBigInt,
        `Expecting a value of type '${memberDef.type}' for '${memberDef.path}'`,
        node
      )
    }

    // The code must come from the REGISTRY, never be built from the declared type name. This site
    // used to emit `not-a-${memberDef.type}` -- yielding `not-a-bigint`, and for the number typedef
    // `not-a-uint32`, `not-a-int8` and so on: codes that appear in no enum, that no port could know
    // to expect, and that CONFORMANCE.md §5.1 explicitly forbids. They survived the ADR 0002 rename
    // because they are runtime strings rather than `ErrorCodes.*` references, so the compiler could
    // not point at them.
    if (valueType !== "bigint") {
      throw new ValidationError(
        ErrorCodes.expectedBigInt,
        `Invalid value encountered for '${memberDef.path}'`,
        node
      )
    }

    const { min, max, multipleOf } = memberDef

    // Split so the DIRECTION survives: one combined check reported the same code whether the value
    // was below `min` or above `max`, and a caller could not tell which constraint had rejected it.
    if (min !== undefined && min !== null && value < min) {
      throwError(ErrorCodes.mismatchedMin, memberDef.path!, value, node)
    }
    if (max !== undefined && max !== null && value > max) {
      throwError(ErrorCodes.mismatchedMax, memberDef.path!, value, node)
    }

    // Validate multipleOf constraint
    if (multipleOf !== undefined && multipleOf !== null) {
      const remainder = value % BigInt(multipleOf)
      if (remainder !== 0n) {
        throw new ValidationError(
          ErrorCodes.mismatchedMultipleOf,
          `The value ${value} for '${memberDef.path}' must be a multiple of ${multipleOf}`,
          node
        )
      }
    }

    return value
  }
}

export default BigIntDef
