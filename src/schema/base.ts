

/**
 * Represents an enmu that has all the data types.
 */
export const DataType = {
  id        :"id",
  any       :"any",
  string    :"string",
  number    :"number",
  boolean   :"boolean",
  date      :"date"
}

export interface MemberDef {
  type:string,
  optional?:boolean,
  null?:any,
  default?:any,
  choices?:any[],
  [index:string]:any
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