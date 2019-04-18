import MemberDef from '../../dist/types/types/memberdef';
import { ParserTreeValue } from '../parser/index';
import { isToken } from '../utils/is';
import InternetObjectError from '../errors/io-error';
import ParserError from '../errors/parser-error';


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

    // choices check
    if (memberDef.choices !== undefined && data.value in memberDef.choices === false) {
      throw new ParserError("value-not-in-choices", data)
    }
  }

  // If everything is okay, return same data
  return data
}
