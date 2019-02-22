

/**
 * Represents an enmu that has all the data types.
 */
export enum DataType {
  Id        = "id",
  Any       = "any",
  String    = "string",
  Number    = "number",
  Boolean   = "boolean",
  Date      = "date"
}


/**
 * Parses the key to see if it is optional.
 * @param key
 */
export const parseKey = (key:string):{ name:string, optional:boolean } =>  {

  const optional = key.endsWith("?")
  return {
    name: optional ? key.substr(0, key.length - 1): key,
    optional
  }

}