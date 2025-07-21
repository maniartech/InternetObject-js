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
    const { value, changed } = doCommonTypeCheck(memberDef, valueNode, node, defs)
    if (changed) return value

    if (valueNode.type !== TokenType.DATETIME) {
      throw new ValidationError(ErrorCodes.invalidDateTime, `Expecting a ${memberDef.type.toUpperCase()} value for ${memberDef.path}, currently ${valueNode.value}, a ${valueNode.type} value`, node as TokenNode)
    }

    // Validate the value
    this.#validate(value, memberDef, node)

    return value
  }

  public strinfigy(value: Date): string {
    return dt.dateToIOString(value, this.#type as any)
  }

  #validate(value:Date, memberDef: MemberDef, node: Node) {
    const dateType:any = memberDef.type

    if (memberDef.min) {
      const min = memberDef.min
      if (min && value < min) {
        throw new ValidationError(
          ErrorCodes.outOfRange,
          `Expecting the value ${memberDef.path ? `for '${memberDef.path}'` : ''} to be greater than or equal to '${dt.dateToSmartString(memberDef.min, dateType)}'`,
          node
        )
      }
    }

    if (memberDef.max) {
      const max = memberDef.max
      if (max && value > max) {
        throw new ValidationError(
          ErrorCodes.outOfRange,
          `Expecting the value ${memberDef.path ? `for '${memberDef.path}'` : ''} to be less than or equal to '${dt.dateToSmartString(memberDef.max, dateType)}'`,
          node
        )
      }
    }
  }

  public static get types() { return DATETIME_TYPES }
}

export default DateTimeDef
