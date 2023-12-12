import TypedefRegistry from '../schema/typedef-registry'
import { datetimeExp, datetimePlainExp } from './datetime'

/**
 * Checks whether specified value is date or not.
 *
 * @param val The value to be tested for date check!
 * @returns `true` if the value is a date otherwise `false`
 */
export const isDTTypeString = (val: any): val is string => {
  return isDateTimeString(val) || isDateString(val) || isTimeString(val)
}

/**
 * Checks whether specified value is datetime or not.
 *
 * @param val The value to be tested for number check!
 * @returns `true` if the value is a datetime otherwise `false`
 */
export const isDateTimeString = (val: any): val is string => {
  const exp = /[\-\:]/.test(val) ? datetimeExp.datetime : datetimePlainExp.datetime
  return exp.test(val)
}

/**
 * Checks whether specified value is date or not.
 *
 * @param val The value to be tested for date check!
 * @returns `true` if the value is a date otherwise `false`
 */
export const isDateString = (val: any): val is string => {
  const exp = /\-/.test(val) ? datetimeExp.date : datetimePlainExp.date
  return exp.test(val)
}

/**
 * Checks whether specified value is time or not.
 *
 * @param val The value to be tested for time check!
 * @returns `true` if the value is a date otherwise `false`
 */
export const isTimeString = (val: any): val is string => {
  const exp = /\:/.test(val) ? datetimeExp.time : datetimePlainExp.time
  return exp.test(val)
}

/**
 * Checks whether specified value is an array or not.
 *
 * @param val The value to be tested for an array check!
 * @returns `true` if the value is an array otherwise `false`
 */
export const isArray = (val: any): val is Array<any> => {
  return val instanceof Array
}

export const isPlainObject = (val: any) => {
  if (typeof val !== 'object') return false

  // If has modified constructor
  const ctor = val.constructor
  if (typeof ctor !== 'function') return false

  // If has modified prototype
  const prot = ctor.prototype
  if (typeof prot !== 'object') return false

  // If constructor does not have an Object-specific method
  if (prot.hasOwnProperty('isPrototypeOf') === false) {
    return false
  }

  // Most likely a plain Object
  return true
}

/**
 * Checks whether specified value reprents datatype.
 *
 * @param val The value to be tested for an datatype check!
 * @returns `true` if the value is a datatype otherwise `false`
 */
export const isDataType = (val: string): boolean => {
  return TypedefRegistry.isRegisteredType(val)
}


export function isDefined<T>(val: T | null | undefined): val is T {
  return val !== null && val !== undefined
}


/**
 *
 * @param obj
 */
export const isSchemaDef = (obj: any) => {
  if (isArray(obj)) {
    return typeof obj[0] === 'string' && isDataType(obj[0])
  }
}

// export function isToken(val: any): val is Token {
//   if (!val) return false

//   if (typeof val !== 'obj') return false

//   const keys = Object.keys(val)

// }
