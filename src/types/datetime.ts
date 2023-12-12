import ValidationError from '../errors/io-validation-error'
import ErrorCodes from '../errors/io-error-codes'
import Node from '../parser/nodes/nodes'
import MemberDef from './memberdef';
import TypeDef from '../schema/typedef'
import { doCommonTypeCheck } from './common-type'

import {
  dateToDatetimeString,
  dateToDateString,
  dateToTimeString
} from '../utils/datetime'
import Definitions from '../core/definitions'
import Schema from '../schema/schema'
import { TokenNode } from '../parser/nodes'

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
        const replaced = defs.getV(value)
        value = replaced !== undefined ? replaced : value
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

  serialize = (data: any, memberDef: MemberDef): string => {
    const validatedData = doCommonTypeCheck(memberDef, data)

    if (validatedData === undefined) return ''
    else if (validatedData === null) return 'N'

    if (data instanceof Date) {
      return _getSerializer(this._type)(data)
    }

    throw new ValidationError(
      ErrorCodes.invalidDateTime,
      `Expecting the value of type '${this._type}'`
    )
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

function _serializeDateTime(date: Date): string {
  return dateToDatetimeString(date, true, true) || ''
}

function _serializeDate(date: Date): string {
  return dateToDateString(date, true) || ''
}

function _serializeTime(date: Date): string {
  return dateToTimeString(date, true) || ''
}

function _getSerializer(type: string) {
  if (type === 'datetime') {
    return _serializeDateTime
  } else if (type === 'date') {
    return _serializeDate
  }
  return _serializeTime
}

export default DateTimeDef
