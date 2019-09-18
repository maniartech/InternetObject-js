import { ParserTreeValue } from '../parser/index';
import { isToken } from '../utils/is';
import { InternetObjectError } from '../errors/io-error';
import MemberDef from './memberdef';


export function doCommonTypeCheck (data:ParserTreeValue, memberDef: MemberDef):any {

  // If value is not provided, and optional is allowed, and default is
  if (data === null) {
    if (memberDef.optional) return memberDef.default
    throw new InternetObjectError("value-required", `Value is missing for '${memberDef.path}'.`)
  }

  // Token specific validation
  if (isToken(data)) {
    if (data.value === null) {
      if (memberDef.null) return null
      throw new InternetObjectError("null-not-allowed", `${ memberDef.path} does not support null.` )
    }
  }

  // If everything is okay, return same data
  return data
}


export function doCommonTypeCheckForObject (data:any, memberDef: MemberDef):any {

  // If value is not provided, and optional is allowed, and default is
  if (data === undefined) {
    if (memberDef.optional) return memberDef.default
    throw new InternetObjectError("value-required", `Value is missing for '${memberDef.path}'.`)
  }

  // Token specific validation
  if (data === null) {
    if (memberDef.null) return null
    throw new InternetObjectError("null-not-allowed", `${ memberDef.path} does not support null.` )
  }


  // If everything is okay, return same data
  return data
}