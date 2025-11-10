import Decimal from '../../core/decimal'
import Definitions from '../../core/definitions'
import ErrorCodes from '../../errors/io-error-codes'
import Node from '../../parser/nodes/nodes'
import Schema from '../../schema/schema'
import TypeDef from '../../schema/typedef'
import doCommonTypeCheck from './common-type'
import MemberDef from './memberdef'
import { NUMBER_TYPES, throwError, getIntegerDigits } from './common-number'

const decimalSchema = new Schema(
  "decimal",
  { type:       { type: "string", optional: false, null: false, choices: NUMBER_TYPES } },
  { default:    { type: "decimal", optional: true,  null: false  } },
  { choices:    { type: "array",  optional: true,  null: false, of: { type: "decimal" } } },
  { precision:  { type: "number", optional: true, null: false } },
  { scale:      { type: "number", optional: true, null: false } },
  { min:        { type: "decimal", optional: true,  null: false } },
  { max:        { type: "decimal", optional: true,  null: false } },
  { optional:   { type: "bool",   optional: true } },
  { null:       { type: "bool",   optional: true } },
)

/**
 * Decimal type definition with support for 4 validation modes:
 * 1. Natural comparison (no precision/scale)
 * 2. Scale-only validation (exact decimal places)
 * 3. Precision-only validation (max significant digits)
 * 4. Strict validation (exact DECIMAL(precision, scale))
 *
 * @internal
 */
class DecimalDef implements TypeDef {
  private _type: string = 'decimal'

  get type(): string { return this._type }
  get schema(): Schema { return decimalSchema }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions): Decimal {
    const valueNode = defs?.getV(node) || node
    let { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    // Type check: reject regular numbers, only accept Decimal instances
    if (typeof value === 'number') {
      throwError(
        ErrorCodes.invalidType,
        memberDef.path!,
        `Expected decimal value (with 'm' suffix), got number`,
        node
      )
    }

    value = this.validate(memberDef, value, node)

    return value
  }  stringify(value: any, memberDef: MemberDef): string {
    return value.toString()
  }

  /**
   * Validates decimal value according to the specified mode
   */
  validate(memberDef: MemberDef, value: any, node?: Node): Decimal {
    let { min, max, precision: requiredPrecision, scale: requiredScale } = memberDef

    const valD: Decimal = Decimal.ensureDecimal(value)

    // Mode check: Determine validation mode based on precision and scale
    const hasRequiredPrecision = requiredPrecision !== null && requiredPrecision !== undefined
    const hasRequiredScale = requiredScale !== null && requiredScale !== undefined

    // Validate scale if specified (modes 2 and 4)
    if (hasRequiredScale) {
      const actualScale = valD.getScale()
      if (actualScale !== requiredScale) {
        throwError(
          ErrorCodes.invalidScale,
          memberDef.path!,
          `Value has scale ${actualScale}, expected ${requiredScale}`,
          node
        )
      }
    }

    // Validate precision if specified (modes 3 and 4)
    if (hasRequiredPrecision) {
      const actualPrecision = valD.getPrecision()

      if (hasRequiredScale) {
        // Mode 4: Strict validation (both precision and scale)
        // Check if value fits within DECIMAL(precision, scale)
        const intDigits = getIntegerDigits(valD)
        const maxIntDigits = requiredPrecision - requiredScale

        if (intDigits > maxIntDigits) {
          throwError(
            ErrorCodes.invalidPrecision,
            memberDef.path!,
            `Integer part has ${intDigits} digits, DECIMAL(${requiredPrecision},${requiredScale}) allows ${maxIntDigits}`,
            node
          )
        }
      } else {
        // Mode 3: Precision-only validation
        if (actualPrecision > requiredPrecision) {
          throwError(
            ErrorCodes.invalidPrecision,
            memberDef.path!,
            `Value has precision ${actualPrecision}, max allowed is ${requiredPrecision}`,
            node
          )
        }
      }
    }

    // Validate min constraint - normalize to same scale for comparison
    if (min !== null && min !== undefined) {
      const minD: Decimal = Decimal.ensureDecimal(min)

      // Use the larger scale for both
      const targetScale = Math.max(valD.getScale(), minD.getScale())

      // Calculate precision needed: max integer digits + target scale
      const valIntDigits = getIntegerDigits(valD)
      const minIntDigits = getIntegerDigits(minD)
      const targetPrecision = Math.max(valIntDigits, minIntDigits) + targetScale

      const normalizedVal = valD.convert(targetPrecision, targetScale)
      const normalizedMin = minD.convert(targetPrecision, targetScale)

      if (normalizedVal.compareTo(normalizedMin) < 0) {
        throwError(ErrorCodes.invalidRange, memberDef.path!, value, node)
      }
    }

    // Validate max constraint - normalize to same scale for comparison
    if (max !== null && max !== undefined) {
      const maxD: Decimal = Decimal.ensureDecimal(max)

      // Use the larger scale for both
      const targetScale = Math.max(valD.getScale(), maxD.getScale())

      // Calculate precision needed: max integer digits + target scale
      const valIntDigits = getIntegerDigits(valD)
      const maxIntDigits = getIntegerDigits(maxD)
      const targetPrecision = Math.max(valIntDigits, maxIntDigits) + targetScale

      const normalizedVal = valD.convert(targetPrecision, targetScale)
      const normalizedMax = maxD.convert(targetPrecision, targetScale)

      if (normalizedVal.compareTo(normalizedMax) > 0) {
        throwError(ErrorCodes.invalidRange, memberDef.path!, value, node)
      }
    }

    // Return the value as-is (don't convert unless necessary)
    return valD
  }
}

export default DecimalDef
