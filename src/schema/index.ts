import '../types/index'

import ASTParser from "../parser/ast-parser";
import TypedefRegistry from '../types/typedef-registry';
import InternetObjectError from '../errors/io-error';

import { ASTParserTree } from "../parser";
import { isString, isParserTree, isKeyVal, isArray, isDataType, isToken } from "../utils/is";
import { Token } from '../parser/token';
import { ParserTreeValue } from '../parser/index';

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
    const compiledSchema = _compileObjectSchema(parsedSchema)

    return new IObjectSchema(compiledSchema)
  }
}

const _getCompileValue = (value:ParserTreeValue):any => {

  // Process Token
  if (isToken(value)) {
    if (isDataType(value.value)) {
      return {
        "type": value.value
      }
    }
    // TODO: Throw better  error
    throw new InternetObjectError("invalid-datatype", "Invalid data type", value)
  }

  if (isParserTree(value)) {
    if (_isMemberDef(value)) {
      return _compileMemberDefTree(value)
    }
    const arrayDef = value.type === "array"
    return {
      type: value.type,
      schema: arrayDef ? _compileArraySchema(value) : _compileObjectSchema(value)
    }
  }

  // TODO: Throw better error
  throw new InternetObjectError("invalid-value")
}

const _compileMemberDefTree = (root: ASTParserTree) => {

  if (root.values.length === 0) {
    return {
      "type": root.type,
      "schema": root.type === "object" ? {} : []
    }
  }

  const firstVal = root.values[0]

  // Array Root
  if (root.type === "array") {
    if (root.values.length > 1) {
      // TODO: Throw better  error
      throw new InternetObjectError("invalid-array-definition")
    }
    if (isToken(firstVal)) {
      if(isDataType(firstVal.value)) {
        return {
          type: "array",
          schema: [firstVal.value]
        }
      }
      else {
        // TODO: Throw better  error
        throw new InternetObjectError("invalid-array-definition")
      }
    }
    else if (isParserTree(firstVal)) {
      return {
        type: "array",
        schema: _compileArraySchema(firstVal)
      }
    }
  }

  // Object Root
  const memberDef:any = {}

  if (isToken(firstVal) && isString(firstVal.value)) {
    memberDef.type = firstVal.value
  }
  else if(isParserTree(firstVal)) {
    memberDef.type = firstVal.type
    memberDef.schema = firstVal.type === "object"
      ? _compileObjectSchema(firstVal)
      : _compileArraySchema(firstVal)
  }

  for (let index=1; index<root.values.length; index++) {
    const item = root.values[index]
    if (isKeyVal(item)) {
      if (isToken(item.value)) {
        memberDef[item.key] = item.value.value
      }
      else {
        // TODO: Consider this case when memberdef key = {object value}
        console.warn("Consider this case")
      }
    }
    else if(isToken(item)) {
      memberDef[item.value] = true
    }
    else {
      // TODO: Throw better error
      throw new InternetObjectError("invalid-value")
    }
  }

  return memberDef
}

const _compileArraySchema = (root: ASTParserTree) => {
  const array = root.values
  if (array.length > 1) {
    // TODO: Throw better error
    throw new InternetObjectError("invalid-array-schema")
  }

  if (array.length === 0) {
    return []
  }

  const item = array[0]
  return [_getCompileValue(item)]
}

const _compileObjectSchema = (root: ASTParserTree) => {

  if (root.values.length === 0) return {}

  const schema:any = {
    keys: [],
    defs: {}
  }

  for (let index = 0; index < root.values.length; index += 1) {
    let item = root.values[index]
    let key:any = index
    let value:any
    let optional:boolean = false

    // Item = Tree
    if (isParserTree(item)) {
      // TODO: Throw better error
      throw new InternetObjectError("key-required", "Encountered an array or an object while expecting key.")
    }
    // Item = KeyVal
    else if (isKeyVal(item)) {
      const {name, optional} = _parseKeyForOptional(item.key)
      const value:any = _getCompileValue(item.value)
      schema.keys.push(name)

      // When value is a memberDef
      if (value.type) {
        value.optional = value.optional || optional || undefined
        schema.defs[name] = value
      }
      else {
        schema.defs[name] = {
          type: value,
          optiona: optional || undefined
        }
      }
    }
    else if (isToken(item)) {
      const {name, optional} = _parseKeyForOptional(item.value)
      schema.keys.push(name)
      schema.defs[name] = {
        type: "any",
        optional: optional || undefined
      }
    }
  }

  return schema
}

const _addToSchema = (schema:any, value:any, keyOrIndex:any) => {
  if (isArray(schema)) {
    schema.push(value)
  }
  else {
    schema.keys.push(keyOrIndex)
    schema.defs[keyOrIndex] = value
  }
}

const _isMemberDef = (root:ASTParserTree) => {
  const first = root.values[0]

  if (isToken(first) && isDataType(first.value)) {
    return true
  }
  else if (isParserTree(first)) {
    return true
  }
  return false
}

const _parseKeyForOptional = (key:string) => {
  if(key.endsWith("?")) {
    return {
      name: key.substr(0, key.length - 1),
      optional: true
    }
  }
  return { name:key, optional: false }
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
