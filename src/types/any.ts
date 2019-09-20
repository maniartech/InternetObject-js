import DataParser from '../data'
import { ParserTreeValue } from '../parser/index'
import MemberDef from './memberdef'
import TypeDef from './typedef'
import { doCommonTypeCheck } from './utils'
import { isToken, isParserTree } from '../utils/is'

/**
 * Represents the `any` type, performs the following validations.
 */
export default class AnyDef implements TypeDef {
  getType(): string {
    return 'any'
  }

  parse(data: ParserTreeValue, memberDef: MemberDef): any {
    const validatedData = doCommonTypeCheck(memberDef, data, data)

    if (validatedData !== data || validatedData === undefined) return validatedData

    if (isToken(data)) return data.value

    if (isParserTree(data)) {
      return DataParser.parse(data)
    }

    // TODO: check this case
    console.assert(false, 'Check this case!')
    console.warn(data, memberDef)
  }

  load(data: any, memberDef: MemberDef): any {
    const validatedData = doCommonTypeCheck(memberDef, data)
    if (validatedData !== data) return validatedData
    return data
  }
}
