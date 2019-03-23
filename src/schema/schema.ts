import Tokenizer from "../tokenizer";
import ASTParser from "../parser/ast-parser";
import { ASTParserTree } from "../parser";
import { isString, isParserTree, isKeyVal, isArray, isDataType } from "../utils/is";
import { print } from "../utils/index";

export default class IObjectSchema {

  private _schema:any

  private constructor(schema:any) {
    this._schema = schema
  }

  /**
   * Applies the schema to specified data and returns the
   * mapped
   */
  public apply = (data:any) => {
    return _apply(data, this._schema, {})
  }

  public static compile = (schema:any): IObjectSchema => {
    let parsedSchema:any = null
    if (isString(schema)) {
      let parser = new ASTParser(schema, true)
      parser.parse()
      parsedSchema = parser.schema
    }
    else {
      parsedSchema = schema
    }

    const compiledSchema = _compile(parsedSchema, {})

    return new IObjectSchema(compiledSchema)
  }
}

// Merges the data with schema and returns complete JSON object
function _apply(data:any, schema:any, container?:any):any {
  if(!schema) return data

  schema.keys.forEach((key:string, index:number) => {
    const memberDef = schema.defs[key]
    let item = data.values[index]

     if (typeof memberDef === "string" || memberDef.type) {
      container[key] = item.value
    }
    else if (memberDef.keys) {
      container[key] = _apply(item, memberDef, {})
    }
  })

  return container
}

// Compiles the parsed ast into processebile schema object
const _compile = (root: ASTParserTree, container: any) => {

  const keys: string[] | null = isArray(container) ? null : []

  if (keys) {
    container['keys'] = keys
    container['defs'] = {}
  }

  for (let index = 0; index < root.values.length; index += 1) {
    let item = root.values[index]
    let key: string = ''

    if (isParserTree(item)) {
      // Object
      if (item.type === 'object') {
        container[index] = _compile(item, {})
      }
      // Array
      else {
        container[index] = _compile(item, [])
      }
    } else if (isKeyVal(item)) {
      key = item.key
      if (isParserTree(item.value)) {
        container.defs[key] = _compile(item.value, item.value.type === 'object' ? {} : [])
      } else if (isKeyVal(item.value)) {
        console.warn('See this case!', item.value)
      } else {
        container.defs[key] = item.value === null ? undefined : item.value.value
      }
    } else if (item !== null && item.value) {
      if (index === 0 && isDataType(item.value.toString())) {
        if (isArray(container)) {
          container.push(item.value)
        } else {
          key = 'type'
          container.defs[key] = item.value
        }
      } else if (isArray(container)) {
        container.push(item.value)
      } else {
        key = item.value.toString()
        container.defs[key] = 'any'
      }
    } else {
      // TODO: Verify this case!
      console.warn('Verify this case!', item)
    }

    // If key found, add it into the keys
    if (key && keys) {
      keys.push(key)
    }

  }

  if(container.defs && container.defs.type && container.keys[0] === "type") {
    return container.defs
  }

  return container
}
