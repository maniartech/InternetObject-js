import { DataType } from "../schema/base";
import { ASTParserTree, KeyVal } from '../parser/index';


/**
 * Checks whether specified value is number or not.
 *
 * @param val The value to be tested for number check!
 * @returns `true` if the value is a number otherwise `false`
 */
export const isNumber = (val:any) => {
  return typeof val === "number"
}

/**
 * Checks whether specified value is string or not.
 *
 * @param val The value to be tested for string check
 * @returns `true` if the value is a string otherwise `false`
 */
export const isString = (val:any) => {
  return typeof val === "string"
}

/**
 * Checks whether specified value is boolean or not.
 *
 * @param val The value to be tested for number check!
 * @returns `true` if the value is a boolean otherwise `false`
 */
export const isBoolean = (val:any) => {
  return typeof val === "boolean"
}

/**
 * Checks whether specified value is an array or not.
 *
 * @param val The value to be tested for an array check!
 * @returns `true` if the value is an array otherwise `false`
 */
export const isArray = (val:any) => {
  return val instanceof Array
}

/**
 * Checks whether specified value reprents datatype.
 *
 * @param val The value to be tested for an datatype check!
 * @returns `true` if the value is a datatype otherwise `false`
 */
export const isDataType = (val:string) => {
  return val in DataType
}

export function isParserTree(object: any): object is ASTParserTree {
  try {
    return "type" in object && "values" in object
  }
  catch {
    return false
  }
}

export function isKeyVal(object: any): object is KeyVal {
  try {
    return "key" in object && "value" in object
  }
  catch {
    return false
  }
}

export const isSchemaDef = (o:any) => {
  if (isArray(o)) {
    return typeof o[0] === "string" && isDataType(o[0])
  }
}
