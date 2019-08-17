import DataParser from '../data';
import { ParserTreeValue } from '../parser/index';
import MemberDef from './memberdef';
import TypeDef from './typedef';
import { doCommonTypeCheck, doCommonTypeCheckForObject } from './utils';
import { isToken, isParserTree } from '../utils/is';

// age?: {any, true}

/**
 * Represents the InternetObjectNumber, performs following validations.
 * - Value is number
 * - Value is optional
 * - Value is nullable
 * - Value >= schema.min
 * - Value <= schema.max
 * - Value is in choices
 */
export default class AnyDef implements TypeDef {

  getType ():string {
    return "any"
  }

  parse (data:ParserTreeValue, memberDef: MemberDef):any {
    const validatedData = doCommonTypeCheck(data, memberDef)

    if (validatedData !== data) return validatedData

    if (isToken(data)) return data.value

    if (isParserTree(data)) {
      return DataParser.parse(data)
    }

    // TODO: check this case
    console.assert(false, "Check this case!")
  }

  load (data:any, memberDef: MemberDef):any {
    const validatedData = doCommonTypeCheckForObject(data, memberDef)

    if (validatedData !== data) return validatedData

    return data
    // TODO: check this case
    console.assert(false, "Check this case!")

  }

}