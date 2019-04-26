import DataParser from '../data/data-parser';
import { ParserTreeValue } from '../parser/index';
import MemberDef from './memberdef';
import TypeDef from './typedef';
import { doCommonTypeCheck } from './utils';
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

  getType () {
    return "any"
  }

  process (data:ParserTreeValue, memberDef: MemberDef):any {
    const validatedData = doCommonTypeCheck(data, memberDef)

    if (validatedData !== data) return validatedData

    if (isToken(data)) return data.value

    if (isParserTree(data)) {
      return DataParser.parse(data)
    }

    console.assert(false, "Check this case!")
  }

}