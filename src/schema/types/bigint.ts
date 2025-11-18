import Definitions from '../../core/definitions'
import ErrorCodes from '../../errors/io-error-codes'
import ValidationError from '../../errors/io-validation-error'
import Node from '../../parser/nodes/nodes'
import Schema from '../../schema/schema'
import TypeDef from '../../schema/typedef'
import doCommonTypeCheck from './common-type'
import MemberDef from './memberdef'
import { NUMBER_TYPES, NUMBER_MAP, throwError } from './common-number'

const bigintSchema = new Schema(
  "bigint",
  { type:       { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:    { type: "bigint", optional: true,  null: false  } },
  { choices:    { type: "array",  optional: true,  null: false, of: { type: "bigint" } } },
  { min:        { type: "bigint", optional: true,  null: false } },
  { max:        { type: "bigint", optional: true,  null: false } },
  { multipleOf: { type: "bigint", optional: true,  null: false } },
  { format:     { type: "string", optional: true,  null: false, choices: ["decimal", "hex", "octal", "binary"], default:"decimal" } },
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

  stringify(value: any, memberDef: MemberDef): string {
    if (memberDef.format === 'hex') { return value.toString(16) }
    if (memberDef.format === 'octal') { return value.toString(8) }
    if (memberDef.format === 'binary') { return value.toString(2) }
    return value.toString()
  }

  /**
   * Validates bigint value
   */
  validate(memberDef: MemberDef, value: any, node?: Node): bigint {
    const valueType = typeof value === "bigint" ? "bigint" : NUMBER_MAP[typeof value] ? "number" : ""

    if (valueType === "") {
      throw new ValidationError(
        ErrorCodes.invalidType,
        `Expecting a value of type '${memberDef.type}' for '${memberDef.path}'`,
        node
      )
    }

    if (valueType !== "bigint") {
      throw new ValidationError(
        `not-a-${memberDef.type}`,
        `Invalid value encountered for '${memberDef.path}'`,
        node
      )
    }

    const { min, max, multipleOf } = memberDef

    if ((min !== undefined && min !== null && value < min) ||
        (max !== undefined && max !== null && value > max)) {
      throwError(ErrorCodes.invalidRange, memberDef.path!, value, node)
    }

    // Validate multipleOf constraint
    if (multipleOf !== undefined && multipleOf !== null) {
      const remainder = value % BigInt(multipleOf)
      if (remainder !== 0n) {
        throw new ValidationError(
          ErrorCodes.invalidValue,
          `The value ${value} for '${memberDef.path}' must be a multiple of ${multipleOf}`,
          node
        )
      }
    }

    return value
  }
}

export default BigIntDef
