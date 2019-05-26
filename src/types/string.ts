import InternetObjectError from '../errors/io-error';
import { ParserTreeValue } from '../parser/index';
import { isNumber, isToken } from '../utils/is';
import MemberDef from './memberdef';
import TypeDef from './typedef';
import { doCommonTypeCheck } from './utils';
import ErrorCodes from '../errors/io-error-codes';
import { Token } from '../parser/token';

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

  if (type === "string" && memberDef.pattern !== undefined) {
    const pattern = new RegExp(memberDef.pattern)
    console.log(pattern)
    if (!pattern.test(token.value)) {
      throw new InternetObjectError(ErrorCodes.invalidValue)
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

