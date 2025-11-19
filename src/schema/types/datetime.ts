import Definitions            from '../../core/definitions';
import ErrorCodes             from '../../errors/io-error-codes';
import ValidationError        from '../../errors/io-validation-error';
import Node                   from '../../parser/nodes/nodes';
import TokenNode              from '../../parser/nodes/tokens';
import Schema                 from '../../schema/schema';
import TypeDef                from '../../schema/typedef';
import TokenType              from '../../parser/tokenizer/token-types';
import * as dt                from '../../utils/datetime';
import doCommonTypeCheck      from './common-type';
import MemberDef              from './memberdef';

const DATETIME_TYPES = ['datetime', 'date', 'time']

const schema = new Schema(
  "datetime",
  { type:     { type: "string",   optional: false, null: false, choices: DATETIME_TYPES } },
  { default:  { type: "datetime", optional: true,  null: false  } },
  { choices:  { type: "array",    optional: true,  null: false, of: { type: "datetime" } } },
  { min:      { type: "datetime", optional: true,  null: false } },
  { max:      { type: "datetime", optional: true,  null: false } },
  { optional: { type: "bool",     optional: true } },
  { null:     { type: "bool",     optional: true } }
)

class DateTimeDef implements TypeDef {
  #type: string

  public get type() { return this.#type }
  public get schema() { return schema }

  public constructor(type: string = 'datetime') { this.#type = type }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions): Date {
    const valueNode = defs?.getV(node) || node
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs, this.#dateTimeEqualityComparator)
    if (changed) return value

    if (valueNode.type !== TokenType.DATETIME) {
      throw new ValidationError(ErrorCodes.invalidDateTime, `Expecting a ${memberDef.type.toUpperCase()} value for ${memberDef.path}, currently ${valueNode.value}, a ${valueNode.type} value`, node as TokenNode)
    }

    // Validate the value
    this.#validate(value, memberDef, node, defs)

    return value
  }

  load(value: any, memberDef: MemberDef, defs?: Definitions): Date {
    const { value: checkedValue, changed } = doCommonTypeCheck(memberDef, value, undefined, defs, this.#dateTimeEqualityComparator)
    if (changed) return checkedValue

    // Type validation - must be a Date object
    if (!(value instanceof Date)) {
      throw new ValidationError(
        ErrorCodes.invalidType,
        `Expecting a Date object for '${memberDef.path}', got ${typeof value}`
      )
    }

    // Validate constraints
    this.#validate(value, memberDef, undefined, defs)

    return value
  }

  public stringify(value: Date): string {
    return dt.dateToIOString(value, this.#type as any)
  }

  #normalizeToDate = (v: any, defs?: Definitions): Date | undefined => {
    if (!v) return undefined

    // Already a Date instance (min/max from schema are already Date objects)
    if (v instanceof Date) return v

    // Resolve TokenNode to underlying value
    if (v instanceof TokenNode) {
      if (v.value instanceof Date) return v.value
      // Try resolving through definitions
      if (defs) {
        const resolved = defs.getV(v)
        if (resolved instanceof Date) return resolved
        if (resolved instanceof TokenNode && resolved.value instanceof Date) return resolved.value
      }
    }

    // If wrapper exposes toValue(defs)
    if (typeof v === 'object' && typeof (v as any).toValue === 'function') {
      const resolved = (v as any).toValue(defs)
      return this.#normalizeToDate(resolved, defs)
    }

    return undefined
  }

  #dateTimeEqualityComparator = (value: any, choice: any): boolean => {
    const valDate = value instanceof Date ? value : undefined
    const choiceDate = this.#normalizeToDate(choice)

    if (!valDate || !choiceDate) return false
    return valDate.getTime() === choiceDate.getTime()
  }

  #validate(value:Date, memberDef: MemberDef, node?: Node, defs?: Definitions) {
    const dateType:any = memberDef.type

    if (memberDef.min) {
      const min = this.#normalizeToDate(memberDef.min, defs)
      if (min && value < min) {
        throw new ValidationError(
          ErrorCodes.outOfRange,
          `Expecting the value ${memberDef.path ? `for '${memberDef.path}'` : ''} to be greater than or equal to '${dt.dateToSmartString(min, dateType)}'`,
          node
        )
      }
    }

    if (memberDef.max) {
      const max = this.#normalizeToDate(memberDef.max, defs)
      if (max && value > max) {
        throw new ValidationError(
          ErrorCodes.outOfRange,
          `Expecting the value ${memberDef.path ? `for '${memberDef.path}'` : ''} to be less than or equal to '${dt.dateToSmartString(max, dateType)}'`,
          node
        )
      }
    }
  }

  public static get types() { return DATETIME_TYPES }
}

export default DateTimeDef
