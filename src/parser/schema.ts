import '../types/index'

import ASTParser from "./ast-parser";
import { ASTParserTree } from ".";
import { isString, isParserTree, isKeyVal, isArray, isDataType } from "../utils/is";
import { print } from "../utils/index";
import TypedefRegistry from '../types/typedef-registry';
import InternetObjectError from '../errors/io-error';
import { Token } from './token';

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

    // print("AST", parsedSchema)
    const compiledSchema = _compile(parsedSchema, {})

    return new IObjectSchema(compiledSchema)
  }
}

// Merges the data with schema and returns complete JSON object
function _apply(data:any, schema:any, container?:any):any {
  if(!schema) return data

  schema.keys.forEach((key:string, index:number) => {
    const memberDef = schema.defs[key]
    let token:Token = data.values[index]

    if (typeof memberDef === "string" || memberDef.type) {
      const type = isString(memberDef) ? memberDef : memberDef.type
      const typeDef = TypedefRegistry.getDef(type)
      if (typeDef !== undefined) {
        // Clean and validate values
        const value = typeDef.validate(key, token, memberDef)
        container[key] = value
      }
      else {
        // TODO: Throw error here!
        console.error(token, memberDef, type)
        // throw new InternetObjectError(`Invalid Type "${ type }"`)
        container[key] = token.value
      }
    }
    else if (memberDef.keys) {
      container[key] = _apply(token, memberDef, {})
    }
  })

  return container
}

// Compiles the parsed ast into processebile schema object
const _compile = (root: ASTParserTree, container: any, path:string='') => {

  const arrayConatiner = isArray(container)
  const keys: string[] | null = arrayConatiner ? null : []

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
        // console.warn("Item", index, item)
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
      let name:string = key
      let def = container.defs[key]
      let keyPath = path ? `${path}.${key}` : 'key'

      if (key.endsWith("?")) {
        name = key.substr(0, key.length - 1)
        if (isString(def)) {
          def = {
            type: def,
            optional: true
          }
        }
        else {
          def.optional = true
        }
        delete container.defs[key]
      }

      // Convert string defs into types if required!
      // name:string -> name:{type:string}
      if (isString(def) && key !== "type"){
        def = {
          type:def
        }
      }
      // def.path = keyPath
      container.defs[name] = def
      keys.push(name)
    }

  }

  // Fix the Object and Array type structure
  if (container["0"] !== undefined && keys) {
    const type = container["0"]
    container.keys.unshift("type")
    container.defs.type = type
    delete container["0"]
  }

  // Ideinfy memberDef and normalize them
  if(container.defs && container.defs.type && container.keys[0] === "type") {
    const memberDef:any = {}
    container.keys.forEach((key:string) => {
      let val = container.defs[key]
      if (val.type === "any") {
        val = true
      }
      memberDef[key] = val
    })
    return memberDef // container.defs
  }

  return container
}
