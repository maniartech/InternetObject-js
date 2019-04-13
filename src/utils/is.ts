import { ASTParserTree, KeyVal } from '../parser/index';
import { Token } from "../parser/token";
import TypedefRegistry from "../types/typedef-registry";


/**
 * Checks whether specified value is number or not.
 *
 * @param val The value to be tested for number check!
 * @returns `true` if the value is a number otherwise `false`
 */
export const isNumber = (val:any): val is number => {
  return typeof val === "number"
}

/**
 * Checks whether specified value is string or not.
 *
 * @param val The value to be tested for string check
 * @returns `true` if the value is a string otherwise `false`
 */
export const isString = (val:any): val is string => {
  return typeof val === "string"
}

/**
 * Checks whether specified value is boolean or not.
 *
 * @param val The value to be tested for number check!
 * @returns `true` if the value is a boolean otherwise `false`
 */
export const isBoolean = (val:any): val is boolean => {
  return typeof val === "boolean"
}

/**
 * Checks whether specified value is an array or not.
 *
 * @param val The value to be tested for an array check!
 * @returns `true` if the value is an array otherwise `false`
 */
export const isArray = (val:any): val is Array<any> => {
  return val instanceof Array
}

/**
 * Checks whether specified value reprents datatype.
 *
 * @param val The value to be tested for an datatype check!
 * @returns `true` if the value is a datatype otherwise `false`
 */
export const isDataType = (val:string): boolean => {
  return TypedefRegistry.isRegisteredType(val)
}

export function isParserTree(obj: any): obj is ASTParserTree {
  try {
    return "type" in obj && "values" in obj
  }
  catch {
    return false
  }
}

/**
 * Checks whether the specified object is a Token or not!
 * @param obj The object to be validated for the Token check
 * @returns `true` if the value is a Token otherwise `false`
 */
export function isToken(obj: any): obj is Token {
  try {
    return obj.type !== undefined && obj.col !== undefined && obj.row !== undefined
  }
  catch {
    return false
  }
}


export function isDefined<T>(val: T | null | undefined): val is T {
	return val !== null && val !== undefined;
}

/**
 * Checks whether the specified object is a KeyVal or not!
 * @param obj The object to be validated for the KeyVal check
 * @returns `true` if the value is a KeyVal otherwise `false`
 */
export function isKeyVal(obj: any): obj is KeyVal {
  try {
    return "key" in obj && "value" in obj
  }
  catch {
    return false
  }
}

/**
 *
 * @param obj
 */
export const isSchemaDef = (obj:any) => {
  if (isArray(obj)) {
    return typeof obj[0] === "string" && isDataType(obj[0])
  }
}

// export function isToken(val: any): val is Token {
//   if (!val) return false

//   if (typeof val !== 'obj') return false

//   const keys = Object.keys(val)



// }
