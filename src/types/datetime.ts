import { InternetObjectValidationError, ErrorArgs, InternetObjectError } from '../errors/io-error'
import ErrorCodes from '../errors/io-error-codes'
import { ParserTreeValue, Node } from '../parser/index'
import { isDateTimeString, isDateString, isTimeString, isToken, isString } from '../utils/is'
import MemberDef from './memberdef'
import TypeDef from './typedef'
import { doCommonTypeCheck } from './utils'
import KeyValueCollection from '../header/index'
import {
  parseDateTime,
  parseDate,
  parseTime,
  dateToDatetimeString,
  dateToDateString,
  dateToTimeString
} from '../utils/datetime'

const DATETIME_TYPES = ['datetime', 'date', 'time']

/**
 * Represents the various number related data types
 * (such as number, int, byte, int16, int32) in Internet Object.
 *
 * @internal
 */
class DateTimeDef implements TypeDef {
  private _type: string

  constructor(type: string = 'datetime') {
    this._type = type
  }

  getType() {
    return this._type
  }

  parse(data: ParserTreeValue, memberDef: MemberDef, vars?: KeyValueCollection): Date {
    const parse = _getParser(this._type)
    const ofMatchingType = _getTypeChecker(this._type)

    const node = isToken(data) ? data : undefined
    let value = node ? node.value : data

    const validatedData = doCommonTypeCheck(memberDef, value, node)

    if (validatedData === undefined || validatedData === null) {
      return validatedData
    }

    if (vars && isString(value) && value.startsWith('$')) {
      const replaced = vars.getV(value)
      value = replaced !== undefined ? replaced : value
    }

    let parsed = false
    if (ofMatchingType(value)) {
      value = parse(value)
      parsed = true
    }

    // console.warn(parsed, ofMatchingType(value), value, memberDef)
    if (parsed === false || value === null) {
      throw new InternetObjectValidationError(
        ErrorCodes.invalidDateTime,
        `Expecting the value of type '${this._type}'`
      )
    }

    return value
  }

  load(data: any, memberDef: MemberDef): any {
    const value = doCommonTypeCheck(memberDef, data)

    if (value === undefined || value === null) {
      return value
    }

    if (value instanceof Date === false) {
      throw new InternetObjectValidationError(
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

    throw new InternetObjectValidationError(
      ErrorCodes.invalidDateTime,
      `Expecting the value of type '${this._type}'`
    )
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

function _getParser(type: string) {
  if (type === 'datetime') {
    return parseDateTime
  } else if (type === 'date') {
    return parseDate
  }
  return parseTime
}

function _getTypeChecker(type: string) {
  if (type === 'datetime') {
    return isDateTimeString
  } else if (type === 'date') {
    return isDateString
  }
  return isTimeString
}

export default DateTimeDef
