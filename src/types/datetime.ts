import Definitions        from '../core/definitions';
import ErrorCodes         from '../errors/io-error-codes';
import ValidationError    from '../errors/io-validation-error';
import Node               from '../parser/nodes/nodes';
import TokenNode          from '../parser/nodes/tokens';
import Schema             from '../schema/schema';
import TypeDef            from '../schema/typedef';
import TokenType          from '../tokenizer/token-types';
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

class DateTimeDef implements TypeDef {
  #type: string

  public get type() { return this.#type }
  public get schema() { return schema }

  public constructor(type: string = 'datetime') { this.#type = type }

  parse(node: Node, memberDef: MemberDef, defs?: Definitions): Date {
    const valueNode = defs?.getV(node) || node
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    if (valueNode.type !== TokenType.DATETIME) {
      throw new ValidationError(ErrorCodes.invalidDateTime, `Expecting a ${memberDef.type.toUpperCase()} value for ${memberDef.path}, currently ${valueNode.value}, a ${valueNode.type} value`, node as TokenNode)
    }

    // Validate the value
    this.#validate(value, memberDef)

    return value
  }

  #validate(value:Date, memberDef: MemberDef) {
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

  public static get types() { return DATETIME_TYPES }
}

export default DateTimeDef
