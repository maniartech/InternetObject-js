import Decimal from '../../core/decimal/decimal'
import Definitions from '../../core/definitions'
import InternetObjectError from '../../errors/io-error'
import ErrorCodes from '../../errors/io-error-codes'
import ValidationError from '../../errors/io-validation-error'
import Node from '../../parser/nodes/nodes'
import Schema from '../../schema/schema'
import TypeDef from '../../schema/typedef'
import doCommonTypeCheck from './common-type'
import MemberDef from './memberdef'
import { NUMBER_TYPES, NUMBER_MAP, RADIX_FORMATS, throwError, expectedCodeFor } from './common-number'
import BigIntDef from './bigint'
import DecimalDef from './decimal'

// Schema number types that are integer-only (a fractional value is rejected as `not-an-integer`).
// `number` / `float*` are excluded — they accept fractions.
const INTEGER_NUMBER_TYPES = new Set([
  'int', 'uint', 'int8', 'int16', 'int32', 'uint8', 'uint16', 'uint32'
])

const numberSchema = new Schema(
  "number",
  { type:       { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:    { type: "number", optional: true,  null: false  } },
  { choices:    { type: "array",  optional: true,  null: false, of: { type: "number" } } },
  { min:        { type: "number", optional: true,  null: false } },
  { max:        { type: "number", optional: true,  null: false } },
  { multipleOf: { type: "number", optional: true,  null: false } },
  { format:     { type: "string", optional: true, null: false, choices: ["decimal", "hex", "octal", "binary", "scientific"] } },
  { optional:   { type: "bool",   optional: true } },
  { null:       { type: "bool",   optional: true } },
)

/**
 * Represents the various number related data types in Internet Object.
 * Delegates to specialized types (BigIntDef, DecimalDef) when appropriate.
 *
 * @internal
 */
class NumberDef implements TypeDef {
  private _type: string
  private _delegateTypeDef?: TypeDef

  get type(): string { return this._type }
  get schema(): Schema {
    if (this._delegateTypeDef) {
      return this._delegateTypeDef.schema
    }
    return numberSchema
  }

  constructor(type: string = 'number') {
    this._type = type

    // Delegate to specialized type definitions
    if (type === 'bigint') {
      this._delegateTypeDef = new BigIntDef()
    } else if (type === 'decimal') {
      this._delegateTypeDef = new DecimalDef()
    }
  }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions): number | bigint | Decimal {
    // Delegate to specialized type if available
    if (this._delegateTypeDef) {
      return this._delegateTypeDef.parse(node, memberDef, defs)
    }

    // Handle standard number types
    const valueNode = defs?.getV(node) || node
    const rawValue = typeof (valueNode as any)?.toValue === 'function' ? (valueNode as any).toValue(defs) : valueNode
    let { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    value = this.validateInteger(memberDef, value, node)

    return value
  }

  /** Load: JS Value → Validated JS Value */
  load(value: any, memberDef: MemberDef, defs?: Definitions): number | bigint | Decimal {
    // Delegate to specialized type if available
    if (this._delegateTypeDef && 'load' in this._delegateTypeDef) {
      return (this._delegateTypeDef as any).load(value, memberDef, defs)
    }

    const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (changed) return checkedValue

    const validated = this.validateInteger(memberDef, value)
    return validated
  }

  stringify(value: any, memberDef: MemberDef, defs?: Definitions): string {
    // Handle null/undefined first
    const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value, undefined, defs)
    if (changed) {
      if (checkedValue === null) return 'N'
      if (checkedValue === undefined) return ''
    }

    // Delegate to specialized type if available
    if (this._delegateTypeDef && 'stringify' in this._delegateTypeDef) {
      return (this._delegateTypeDef as any).stringify(checkedValue, memberDef, defs)
    }

    // `Infinity`/`NaN` are JS spellings that do not re-parse as IO values; IO spells them
    // `Inf` / `-Inf` / `NaN`.
    if (typeof checkedValue === 'number' && !Number.isFinite(checkedValue)) {
      if (Number.isNaN(checkedValue)) return 'NaN'
      return checkedValue > 0 ? 'Inf' : '-Inf'
    }

    // Handle standard number types
    if (memberDef.format === 'scientific') { return checkedValue.toExponential() }

    // A radix `format` needs its IO prefix (`0xff`, not `ff`) or the output re-parses as an
    // open string rather than a number. It also only makes sense for integers — a fractional
    // value has no IO radix literal at all, so fall back to the decimal spelling.
    const radix = RADIX_FORMATS[memberDef.format as keyof typeof RADIX_FORMATS]
    if (radix && Number.isInteger(checkedValue)) {
      const [prefix, base] = radix
      const negative = checkedValue < 0
      return `${negative ? '-' : ''}${prefix}${Math.abs(checkedValue).toString(base)}`
    }

    return checkedValue.toString()
  }

  /**
   * Validates integer and float types
   */
  validateInteger(memberDef: MemberDef, value: any, node?: Node): number {
    const valueType = typeof value === "bigint" ? "bigint" : NUMBER_MAP[typeof value] ? "number" : ""

    if (valueType === "") {
      throw new ValidationError(
        expectedCodeFor(memberDef.type),
        `Expecting a value of type '${memberDef.type}' for '${memberDef.path}'`,
        node
      )
    }

    // A registry code, not one built from the declared type name -- see the note in bigint.ts.
    if (valueType !== "number") {
      throw new ValidationError(
        expectedCodeFor(memberDef.type),
        `Invalid value encountered for '${memberDef.path}'`,
        node
      )
    }

    // `int` and the sized-int schema types are integer-only: a `number` value carrying a fractional
    // part (e.g. `3.7`) is rejected with the designated `not-an-integer` code. `number`/`float`
    // accept fractions. (Internet Object value types are number/decimal/bigint; int is a schema type.)
    if (INTEGER_NUMBER_TYPES.has(this._type) && !Number.isInteger(value)) {
      throw new ValidationError(
        ErrorCodes.expectedInteger,
        `Expecting an integer value for '${memberDef.path}', but received ${value}`,
        node
      )
    }

    // Get type-specific bounds
    const { min: typeBoundMin, max: typeBoundMax } = this.getTypeBounds(this._type)

    // TWO different faults, which one combined check used to report identically.
    //
    //   the TYPE's own range     `int8` given 200 -- the author declared no bound, the limit is
    //                            intrinsic to the type, so the TYPE is at fault: out-of-range-integer
    //   a DECLARED constraint    `{int, max: 120}` given 200 -- the author wrote `max`, so the
    //                            CONSTRAINT is at fault: mismatched-max
    //
    // They also need opposite fixes: widen the type, or change the data. Reporting one code for both
    // meant a caller could not tell which -- nor even whether the value was too low or too high,
    // since the combined check collapsed the direction as well.
    const declaredMin = memberDef.min !== undefined && memberDef.min !== null ? memberDef.min : null
    const declaredMax = memberDef.max !== undefined && memberDef.max !== null ? memberDef.max : null

    if (declaredMin !== null && value < declaredMin) {
      throwError(ErrorCodes.mismatchedMin, memberDef.path!, value, node)
    }
    if (declaredMax !== null && value > declaredMax) {
      throwError(ErrorCodes.mismatchedMax, memberDef.path!, value, node)
    }
    if ((typeBoundMin !== null && value < typeBoundMin) || (typeBoundMax !== null && value > typeBoundMax)) {
      throwError(ErrorCodes.outOfRangeInteger, memberDef.path!, value, node)
    }

    // Validate multipleOf constraint
    if (memberDef.multipleOf !== undefined && memberDef.multipleOf !== null) {
      if (value % memberDef.multipleOf !== 0) {
        throw new ValidationError(
          ErrorCodes.mismatchedMultipleOf,
          `The value ${value} for '${memberDef.path}' must be a multiple of ${memberDef.multipleOf}`,
          node
        )
      }
    }

    return value
  }

  /**
   * Get min/max bounds for a specific number type
   */
  private getTypeBounds(type: string): { min: number | null, max: number | null } {
    switch (type) {
      case 'uint':
        return { min: 0, max: null }
      case 'int8':
        return { min: -(2 ** 7), max: 2 ** 7 - 1 }
      case 'uint8':
        return { min: 0, max: 2 ** 8 - 1 }
      case 'int16':
        return { min: -(2 ** 15), max: 2 ** 15 - 1 }
      case 'uint16':
        return { min: 0, max: 2 ** 16 - 1 }
      case 'int32':
        return { min: -(2 ** 31), max: 2 ** 31 - 1 }
      case 'uint32':
        return { min: 0, max: 2 ** 32 - 1 }
      case 'uint64':
      case 'int64':
      case 'float32':
      case 'float64':
        throw new ValidationError(ErrorCodes.reservedType, `The number type '${type}' is not supported.`)
      default:
        return { min: null, max: null }
    }
  }

  static get types() {
    return NUMBER_TYPES
  }
}

export default NumberDef
