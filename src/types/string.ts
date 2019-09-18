import { InternetObjectError, ErrorArgs } from '../errors/io-error'
import { ParserTreeValue, Node } from '../parser/index'
import { isNumber, isToken } from '../utils/is'
import MemberDef from './memberdef'
import TypeDef from './typedef'
import { doCommonTypeCheck } from './utils'
import ErrorCodes from '../errors/io-error-codes'
import { Token } from '../parser'
import { isString } from 'util'

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
  private _type: string

  constructor(type: string = 'string') {
    this._type = type
  }

  getType() {
    return this._type
  }

  parse(data: ParserTreeValue, memberDef: MemberDef): string {
    const node = isToken(data) ? data : undefined
    const value = node ? node.value : undefined

    return _process(memberDef, value, node)

    // if (!isToken(data)) {
    //   throw new InternetObjectError(ErrorCodes.notAString)
    // }

    // const validatedData = doCommonTypeCheck(data, memberDef)
    // if (validatedData !== data) return validatedData

    // _validatePattern(memberDef, data.value, data)

    // // choices check
    // if (memberDef.choices !== undefined && data.value in memberDef.choices === false) {
    //   throw new InternetObjectError(..._invlalidChoice(memberDef.path, data, memberDef.choices))
    // }

    // // Typeof check
    // if (typeof data.value !== "string") {
    //   throw new InternetObjectError(..._notAString(memberDef.path, data))
    // }

    // const maxLength = memberDef.maxLength

    // // Max length check
    // if (maxLength !== undefined && isNumber(maxLength)) {
    //   if (data.value.length > maxLength) {
    //     throw new InternetObjectError(..._invlalidMaxLength(memberDef.path, data, memberDef.maxLength))
    //   }
    // }

    // const minLength = memberDef.minLength
    // // Max length check
    // if (minLength !== undefined && isNumber(minLength)) {
    //   if (data.value.length > minLength) {
    //     throw new InternetObjectError(..._invlalidMinLength(memberDef.path, data, memberDef.minLength))
    //   }
    // }

    // return data.value
  }

  load(data: any, memberDef: MemberDef): string {
    return _process(memberDef, data)

    //   if (!isString(data)) {
    //     throw new InternetObjectError(ErrorCodes.notAString)
    //   }

    //   const validatedData = doCommonTypeCheckForObject(data, memberDef)
    //   if (validatedData !== data) return validatedData

    //   // TODO: Validate Data for subtypes
    //   // _validatePattern(memberDef.type, data, memberDef)

    //   // choices check
    //   if (memberDef.choices !== undefined && data in memberDef.choices === false) {
    //     throw new InternetObjectError(ErrorCodes.invalidChoice, `Invalid choice for ${ memberDef.path }.`)
    //   }

    //   // Typeof check
    //   if (typeof data !== "string") {
    //     throw new InternetObjectError(ErrorCodes.invalidValue, `Invalid value for ${ memberDef.path }.`)
    //   }

    //   const maxLength = memberDef.maxLength

    //   // Max length check
    //   if (maxLength !== undefined && isNumber(maxLength)) {
    //     if (data.length > maxLength) {
    //       throw new InternetObjectError(ErrorCodes.invalidMaxLength, `Invalid maxLength for ${ memberDef.path }.`)
    //     }
    //   }

    //   const minLength = memberDef.minLength
    //   // Max length check
    //   if (minLength !== undefined && isNumber(minLength)) {
    //     if (data.length > minLength) {
    //       throw new InternetObjectError(ErrorCodes.invalidMinLength, `Invalid minLength for ${ memberDef.path }.`)
    //     }
    //   }

    //   return data
  }
}

function _process(memberDef: MemberDef, value: string, node?: Token): string {
  if (!isString(value)) {
    throw new InternetObjectError(ErrorCodes.notAString)
  }

  const validatedData = doCommonTypeCheck(memberDef, value, node)
  if (validatedData !== value) return validatedData

  // TODO: Validate Data for subtypes
  _validatePattern(memberDef, value, node)

  // choices check
  // if (memberDef.choices !== undefined && data in memberDef.choices === false) {
  //   throw new InternetObjectError(ErrorCodes.invalidChoice, `Invalid choice for ${ memberDef.path }.`)
  // }

  // Typeof check
  if (typeof value !== 'string') {
    throw new InternetObjectError(ErrorCodes.invalidValue, `Invalid value for ${memberDef.path}.`)
  }

  const maxLength = memberDef.maxLength

  // Max length check
  if (maxLength !== undefined && isNumber(maxLength)) {
    if (value.length > maxLength) {
      throw new InternetObjectError(
        ErrorCodes.invalidMaxLength,
        `Invalid maxLength for ${memberDef.path}.`
      )
    }
  }

  const minLength = memberDef.minLength
  // Max length check
  if (minLength !== undefined && isNumber(minLength)) {
    if (value.length > minLength) {
      throw new InternetObjectError(
        ErrorCodes.invalidMinLength,
        `Invalid minLength for ${memberDef.path}.`
      )
    }
  }
  return value
}

function _validatePattern(memberDef: MemberDef, value: string, node?: Node) {
  const type = memberDef.type

  // Validate user defined pattern
  if (type === 'string' && memberDef.pattern !== undefined) {
    let re = memberDef.re
    if (!re) {
      let pattern = memberDef.pattern
      // Add ^ and $ at the begging and end of the pattern respectively
      // if these characters are not set in the pattern
      pattern = pattern.startsWith('^') ? pattern : `^${pattern}`
      pattern = pattern.endsWith('$') ? pattern : `${pattern}$`

      // Compile the expression and cache it into the memberDef
      re = memberDef.re = new RegExp(pattern)
    }
    if (!re.test(value)) {
      throw new InternetObjectError(ErrorCodes.invalidValue)
    }
  }
  // Validate email
  else if (type === 'email') {
    if (!emailExp.test(value)) {
      throw new InternetObjectError(ErrorCodes.invalidEmail)
    }
  }
  // Validate url
  else if (type === 'url') {
    if (!urlExp.test(value)) {
      throw new InternetObjectError(ErrorCodes.invalidUrl)
    }
  }
}

function _notAString(path: string, data: Token): ErrorArgs {
  return [ErrorCodes.notAString, `Expecting a string value for "${path}"`, data]
}

function _invlalidChoice(path: string, data: Token, choices: number[]): ErrorArgs {
  return [
    ErrorCodes.invalidValue,
    `The value of "${path}" must be one of the [${choices.join(',')}]. Currently it is ${
      data.value
    }.`,
    data
  ]
}

function _invlalidMinLength(path: string, data: Token, minLength: number): ErrorArgs {
  return [
    ErrorCodes.invalidMinLength,
    `The length of "${path}" must be ${minLength} or more. Currently it is ${data.value.length}.`,
    data
  ]
}

function _invlalidMaxLength(path: string, data: Token, maxLength: number): ErrorArgs {
  return [
    ErrorCodes.invalidMaxLength,
    `The length of "${path}" must be ${maxLength} or more. Currently it is ${data.value.length}.`,
    data
  ]
}
