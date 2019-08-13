import { InternetObjectError } from '../errors/io-error';
import IOErrorCodes from '../errors/io-error-codes';
import { ParserTreeValue, ASTParserTree } from '../parser/index';
import { Token } from '../parser';
import { isParserTree, isKeyVal } from '../utils/is';
import MemberDef from './memberdef';
import TypeDef from './typedef';
import { TypedefRegistry } from './typedef-registry';
import { doCommonTypeCheck, doCommonTypeCheckForObject } from './utils';


// age?: { number, true, 10, min:10, max:20}

/**
 * Represents the InternetObjectNumber, performs following validations.
 * - Value is number
 * - Value is optional
 * - Value is nullable
 * - Value >= schema.min
 * - Value <= schema.max
 * - Value is in choices
 */
class ObjectDef implements TypeDef {

  private _keys:any = null

  public getType () {
    return "object"
  }

  public parse = (data:ParserTreeValue, memberDef: MemberDef):any => {
    const validatedData = doCommonTypeCheck(data, memberDef)
    if (validatedData !== data) return validatedData

    if (!isParserTree(data)) throw new Error("invalid-value")

    const schema = memberDef.schema

    const object:any = {}

    schema.keys.forEach((key:string, index:number) => {

      const memberDef:MemberDef = schema.defs[key]
      const typeDef = TypedefRegistry.get(memberDef.type)
      const dataItem = this._findDataItem(data, key, index)
      const value = typeDef.parse(dataItem, memberDef)
      object[key] = value

    })

    return object
  }

  public load = (data:any, memberDef: MemberDef):any => {
    const validatedData = doCommonTypeCheckForObject(data, memberDef)
    if (validatedData !== data) return validatedData

    // if (typeof data !== "object" || data.con)
    // if (!isParserTree(data)) throw new Error("invalid-value")

    const schema = memberDef.schema

    const object:any = {}

    schema.keys.forEach((key:string, index:number) => {
      const memberDef:MemberDef = schema.defs[key]
      const typeDef = TypedefRegistry.get(memberDef.type)
      const dataItem = data[key]
      const value = typeDef.load(dataItem, memberDef)
      object[key] = value
    })

    return object
  }

  private _findDataItem = (data:ASTParserTree, key:string, index:number) => {
    let dataItem = data.values[index] || null

    if(!isKeyVal(dataItem)) {
      return dataItem
    }

    // Cache the keys
    if (this._keys === null) {
      this._keys = {}
      data.values.forEach((x) => {
        if (isKeyVal(x)) {
          this._keys[x.key] = x.value
        }
      })
    }

    // Return the value
    return this._keys[key]
  }
}

function _invlalidChoice(key:string, token:Token, min:number) {
  return [
    IOErrorCodes.invalidMinValue,
    `The "${ key }" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidMin(key:string, token:Token, min:number) {
  return [
    IOErrorCodes.invalidMinValue,
    `The "${ key }" must be greater than or equal to ${min}, Currently it is "${token.value}".`,
    token
  ]
}

function _invlalidMax(key:string, token:Token, max:number) {
  return [
    IOErrorCodes.invalidMaxValue,
    `The "${ key }" must be less than or equal to ${max}, Currently it is "${token.value}".`,
    token
  ]
}

export default ObjectDef
