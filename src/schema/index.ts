import '../types/index'

import ASTParser from "../parser/ast-parser";
import { ASTParserTree } from "../parser";
import { isString, isParserTree, isKeyVal, isArray, isDataType } from "../utils/is";
import { print } from "../utils/index";
import TypedefRegistry from '../types/typedef-registry';
import InternetObjectError from '../errors/io-error';
import { Token } from '../parser/token';

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
    let isTree = false

    // Item = Tree
    if (isParserTree(item)) {
      const compiled = _compile(item, item.type === 'object' ? {} : [])
      container[index] = compiled
      isTree = true
    }
    // Item = KeyVal
    else if (isKeyVal(item)) {
      key = item.key
      // Item = Tree
      if (isParserTree(item.value)) {
        const compiled = _compile(item.value, item.value.type === 'object' ? {} : [])
        container.defs[key] = compiled
        isTree = true
      }
      // Item = KeyVal
      else if (isKeyVal(item.value)) {
        console.warn('See this case!', item.value)
      }
      // Item = Token
      else {
        container.defs[key] = item.value === null ? undefined : item.value.value
      }
    }
    // Token
    else if (item !== null) {
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
    }
    // Null
    else {
      // TODO: Verify this case!
      console.warn('Verify this case!')
    }

    // If key found, add it into the keys
    if (key && keys) {
      let name:string = key
      let def = container.defs[key]
      let keyPath = path ? `${path}.${key}` : 'key'

      if (isArray(def)) {
        def = {
          type: def
        }
      }

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

        // Identify non string types and fix it.
        // if (!isString(def['type'])) {
        //   const schema:any = def['type']
        //   def['type'] = isArray(schema) ? "array" : "object"
        //   def["schema"] = schema
        // }
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

      if (isTree) {
        print("---", key, def)
        if (!isString(def.type)) {
          const schema = def.type
          def.type = isArray(schema) ? "array" : "object"
          def.schema = schema
        }
      }

    }
  }

  // Fix the Object and Array type structure
  if (container["0"] !== undefined && keys) {
    console.warn(container[0])
    const type = container["0"]
    container.keys.unshift("type")
    container.defs.type = type
    delete container["0"]
  }

  // if (container["0"] !== undefined && keys) {
  //   const schema = container["0"]
  //   const type = isArray(schema) ? "array" : "object"
  //   // container.keys.unshift("type")
  //   // container.defs.type = type

  //   delete container["0"]
  // }

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

  // print("====>", container.type, container)

  // return {
  //   type: arrayConatiner ? "array" : "object",
  //   schema: container
  // }

  return container
}
