import { InternetObjectValidationError, ErrorArgs, InternetObjectError } from '../errors/io-error'
import ErrorCodes from '../errors/io-error-codes'
import { ParserTreeValue, Node } from '../parser/index'
import { isDateTimeString, isDateString, isTimeString, isToken, isString } from '../utils/is'
import MemberDef from './memberdef'
import TypeDef from './typedef'
import { doCommonTypeCheck } from './utils'
import KeyValueCollection from '../header/index'
import { parseDateTime, parseDate, parseTime } from '../utils/datetime'

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
    } else if (validatedData === 'now') {
      return new Date()
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
        ErrorCodes.invalidType,
        `Expecting the value of type '${this._type}'`
      )
    }

    return value
    // return this.validate(data, memberDef, vars)
  }

  load(data: any, memberDef: MemberDef): Date {
    const value = doCommonTypeCheck(memberDef, data)

    return value
  }

  serialize = (data: any, memberDef: MemberDef): string => {
    if (DATETIME_TYPES.indexOf(memberDef.type) === -1) {
      throw new InternetObjectError(ErrorCodes.invalidType)
    }
    return this.validate(data, memberDef).toString()
  }

  validate(data: any, memberDef: MemberDef, vars?: KeyValueCollection): number {
    const node = isToken(data) ? data : undefined
    const value = node ? node.value : data
    return _validate(this._type, memberDef, value, node, vars)
  }
}

// Performs following validations.
//  * - Value is datetime, date, time
//  * - Value is optional
//  * - Value is nullable
//  * - Value >= schema.min
//  * - Value <= schema.max
//  * - Value is in choices
function _validate(
  type: any,
  memberDef: MemberDef,
  value: any,
  node?: Node,
  vars?: KeyValueCollection
) {
  const parse = _getParser(type)
  const isOfType = _getTypeChecker(type)

  if (vars && isString(value) && value.startsWith('$')) {
    const valueFound = vars.getV(value)
    value = valueFound !== undefined ? valueFound : value
  }

  const validatedData = doCommonTypeCheck(memberDef, value, node)
  if (validatedData !== value || validatedData === undefined) return validatedData

  if (value instanceof Date === false) {
    if (isOfType(value)) {
      value = parse(value)
    }
  }

  if (!isOfType(value)) {
    throw new InternetObjectValidationError(ErrorCodes.invalidValue)
  } else if (isNaN(Number(value))) {
    throw new InternetObjectValidationError(
      ErrorCodes.notANumber,
      `Invalid number encountered for ${memberDef.path}`
    )
  }

  // if (memberDef.min !== undefined) {
  //   if (!memberDef.minDt) {
  //     memberDef.minDt = parse(memberDef.min)
  //     if (memberDef.minDt === null) {
  //       throw new InternetObjectError(ErrorCodes.invalidMemberDefCondition, `The memberDef.min should be a valid ${type}.`)
  //     }
  //   }
  //   const min: Date = memberDef.minDt
  //   if (value.getTime() < min.getTime()) {
  //     throw new InternetObjectValidationError(..._invlalidMin(memberDef, value, node))
  //   }
  // }

  // if (memberDef.max !== undefined && value > memberDef.max) {
  //   throw new InternetObjectValidationError(..._invlalidMax(memberDef, value, node))
  // }

  return value
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

function _intValidator(min: number, max: number, memberDef: MemberDef, value: any, node?: Node) {
  // Validate for integer
  if (value % 1 !== 0) {
    throw new InternetObjectValidationError(..._notAnInt(memberDef, value, node))
  }

  if ((min !== -1 && value < min) || (max !== -1 && value > max)) {
    throw new InternetObjectValidationError(..._outOfRange(memberDef, value, node))
  }
}

function _outOfRange(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.outOfRange,
    `The value (${value}) set for "${memberDef.path}" is out of range.`,
    node
  ]
}

function _notAnInt(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.notAnInteger,
    `Expecting an integer value for "${memberDef.path}", Currently it is ${value}.`,
    node
  ]
}

function _notANumber(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.notANumber,
    `Expecting a number value for "${memberDef.path}", Currently it is ${value}.`,
    node
  ]
}

function _invlalidMin(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.invalidMinValue,
    `The "${memberDef.path}" must be greater than or equal to ${
      memberDef.min
    }, Currently it is ${value}.`,
    node
  ]
}

function _invlalidMax(memberDef: MemberDef, value: any, node?: Node): ErrorArgs {
  return [
    ErrorCodes.invalidMaxValue,
    `The "${memberDef.path}" must be less than or equal to ${
      memberDef.max
    }, Currently it is ${value}.`,
    node
  ]
}

export default DateTimeDef
