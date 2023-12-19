import Definitions        from '../core/definitions';
import ErrorCodes         from '../errors/io-error-codes';
import ValidationError    from '../errors/io-validation-error';
import Node               from '../parser/nodes/nodes';
import TokenNode          from '../parser/nodes/tokens';
import Schema             from '../schema/schema';
import TypeDef            from '../schema/typedef';
import doCommonTypeCheck  from './common-type';
import MemberDef          from './memberdef';

const DATETIME_TYPES = ['datetime', 'date', 'time']

const schema = new Schema(
  "datetime",
  { type:     { type: "string",   optional: false, null: false, choices: DATETIME_TYPES } },
  { default:  { type: "datetime", optional: true,  null: false  } },
  { choices:  { type: "array",    optional: true,  null: false, of: { type: "datetime" } } },
  { min:      { type: "datetime", optional: true,  null: false } },
  { max:      { type: "datetime", optional: true,  null: false } },
  { optional: { type: "bool",     optional: true,  null: false, default: false } },
  { null:     { type: "bool",     optional: true,  null: false, default: false } }
)

/**
 * Represents the various datetime related data types
 *
 * @internal
 */
class DateTimeDef implements TypeDef {
  private _type: string

  constructor(type: string = 'datetime') { this._type = type }
  get type() { return this._type }
  get schema() { return schema }

  parse(data: Node, memberDef: MemberDef, defs?: Definitions): Date {
    const node:TokenNode | undefined = data instanceof TokenNode ? data : undefined
    let value = node ? node.value : undefined

    const validatedData = doCommonTypeCheck(memberDef, value, node)

    if (validatedData === undefined || validatedData === null) {
      return validatedData
    }

    if (defs && typeof value === 'string') {
      if (value.startsWith('$')) {
        value = defs.getV(value)
      }
    }

    // Validate the value
    this._validate(value, memberDef)

    return value
  }

  load(data: any, memberDef: MemberDef): any {
    const value = doCommonTypeCheck(memberDef, data)

    if (value === undefined || value === null) {
      return value
    }

    if (value instanceof Date === false) {
      throw new ValidationError(
        ErrorCodes.invalidDateTime,
        `Expecting the value of type '${this._type}'`
      )
    }

    return value
  }

  _validate(value:Date, memberDef: MemberDef) {
    if (memberDef.min) {
      const min = memberDef.min
      if (min && value < min) {
        throw new ValidationError(
          ErrorCodes.invalidMinValue,
          `Expecting the value to be greater than or equal to '${memberDef.min}'`
        )
      }
    }

    if (memberDef.max) {
      const max = memberDef.max
      if (max && value > max) {
        throw new ValidationError(
          ErrorCodes.invalidMaxValue,
          `Expecting the value to be less than or equal to '${memberDef.max}'`
        )
      }
    }
  }
}

export default DateTimeDef
