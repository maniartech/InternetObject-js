import InternetObjectError from '../errors/io-error';
import { ParserTreeValue } from '../parser/index';
import { isNumber, isToken } from '../utils/is';
import MemberDef from './memberdef';
import TypeDef from './typedef';
import { doCommonTypeCheck } from './utils';
import ErrorCodes from '../errors/io-error-codes';
import { Token } from '../parser/token';

// Reference: RFC 5322 Official Standard
// http://emailregex.com
const emailExp = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/

// http://urlregex.com
const urlExp = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/

/**
 * Represents the InternetObject String, performs following validations.
 *
 * - Value is number
 * - Value is optional
 * - Value is nullable
 * - Value length <= maxLength
 * - Value length >= minLength
 * - Value is in choices
 */
export default class StringDef implements TypeDef {

  private _type:string

  constructor(type:string = "string") {
    this._type = type
  }

  getType() {
    return this._type
  }

  process (data:ParserTreeValue, memberDef: MemberDef):string {

    if (!isToken(data)) {
      throw new InternetObjectError(ErrorCodes.notAString)
    }

    const validatedData = doCommonTypeCheck(data, memberDef)
    if (validatedData !== data) return validatedData

    _validatePattern(memberDef.type, data, memberDef)

    // choices check
    if (memberDef.choices !== undefined && data.value in memberDef.choices === false) {
      throw new InternetObjectError(..._invlalidChoice(memberDef.path, data, memberDef.choices))
    }

    // Typeof check
    if (typeof data.value !== "string") {
      throw new InternetObjectError(..._notAString(memberDef.path, data))
    }

    const maxLength = memberDef.maxLength

    // Max length check
    if (maxLength !== undefined && isNumber(maxLength)) {
      if (data.value.length > maxLength) {
        throw new InternetObjectError(..._invlalidMaxLength(memberDef.path, data, memberDef.maxLength))
      }
    }

    const minLength = memberDef.minLength
    // Max length check
    if (minLength !== undefined && isNumber(minLength)) {
      if (data.value.length > minLength) {
        throw new InternetObjectError(..._invlalidMinLength(memberDef.path, data, memberDef.minLength))
      }
    }

    return data.value
  }
}

function _validatePattern(type:string, token:Token, memberDef:MemberDef) {
  // Validate user defined pattern
  if (type === "string" && memberDef.pattern !== undefined) {
    let re = memberDef.re
    if (!re) {
      let pattern = memberDef.pattern
      // Add ^ and $ at the begging and end of the pattern respectively
      // if these characters are not set in the pattern
      pattern = pattern.startsWith("^") ? pattern : `^${pattern}`
      pattern = pattern.endsWith("$") ? pattern : `${pattern}$`

      // Compile the expression and cache it into the memberDef
      re = memberDef.re = new RegExp(pattern)
    }
    if (!re.test(token.value)) {
      throw new InternetObjectError(ErrorCodes.invalidValue)
    }
  }
  // Validate email
  else if (type === "email") {
    if (!emailExp.test(token.value)) {
      throw new InternetObjectError(ErrorCodes.invalidEmail)
    }
  }
  // Validate url
  else if (type === "url") {
    if (!urlExp.test(token.value)) {
      throw new InternetObjectError(ErrorCodes.invalidUrl)
    }
  }
}

function _notAString(path: string, data: Token) {
  return [
    ErrorCodes.notAString,
    `Expecting a string value for "${path}"`,
    data
  ]
}

function _invlalidChoice(path: string, data: Token, choices:number[]) {
  return [
    ErrorCodes.invalidValue,
    `The value of "${path}" must be one of the [${choices.join(",")}]. Currently it is ${data.value}.`,
    data
  ]
}

function _invlalidMinLength(path: string, data: Token, minLength: number) {
  return [
    ErrorCodes.invalidMinLength,
    `The length of "${path}" must be ${minLength} or more. Currently it is ${data.value.length}.`,
    data
  ]
}

function _invlalidMaxLength(path: string, data: Token, maxLength: number) {
  return [
    ErrorCodes.invalidMaxLength,
    `The length of "${path}" must be ${maxLength} or more. Currently it is ${data.value.length}.`,
    data
  ]
}

