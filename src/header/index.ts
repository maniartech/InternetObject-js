import '../types/index'

import ASTParser from "../parser/ast-parser";
import TypedefRegistry from '../types/typedef-registry';
import InternetObjectError from '../errors/io-error';

import { ASTParserTree } from "../parser";
import { isString, isParserTree, isKeyVal, isArray, isDataType, isToken } from "../utils/is";
import { Token } from '../parser/token';
import { ParserTreeValue } from '../parser/index';
import DataParser from '../parser/data-parser';

export default class IObjectSchema {

  private _schema:any

  private constructor(schema:any) {
    this._schema = schema
  }

  /**
   * Applies the schema to specified data and returns the
   * mapped
   */
  public apply (data:any) {
    return _apply(data, this._schema, {})
  }

  /**
   * Converts and returns the string version of current schema.
   */
  public toString () {
    // TODO: Need to work on this function.
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

const _getCompileValue = (value:ParserTreeValue, path?:string):any => {

  // Process Token
  if (isToken(value)) {
    if (isDataType(value.value)) {
      return {
        "type": value.value,
        path
      }
    }
    // TODO: Throw better  error
    throw new InternetObjectError("invalid-datatype", "Invalid data type", value)
  }

  if (isParserTree(value)) {
    if (_isMemberDef(value)) {
      return _compileMemberDefTree(value, path)
    }
    const arrayDef = value.type === "array"
    return {
      type: value.type,
      schema: arrayDef ? _compileArraySchema(value, path) : _compileObjectSchema(value, path)
    }
  }

  // TODO: Throw better error
  throw new InternetObjectError("invalid-value")
}

const _compileMemberDefTree = (root: ASTParserTree, path?:string) => {

  if (root.values.length === 0) {
    return {
      "type": root.type,
      "schema": root.type === "object" ? {} : [],
      path
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
          schema: {
            type: firstVal.value,
            path: _concatPath("[", path)
          },
          path
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
        schema: _compileArraySchema(firstVal, path),
        path
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
      ? _compileObjectSchema(firstVal, path)
      : _compileArraySchema(firstVal, path)
  }

  for (let index=1; index<root.values.length; index++) {
    const item = root.values[index]
    if (isKeyVal(item)) {
      if (isToken(item.value)) {
        memberDef[item.key] = item.value.value
      }
      else if (isParserTree(item.value)) {
        memberDef[item.key] = DataParser.parse(item.value)
      }
      else {
        // TODO: Consider this case when memberdef key = {object value}
        console.warn("Check this case", "invalid-option", item.value)
        // throw new InternetObjectError("invalid-option")
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

  memberDef.path = path

  return memberDef
}

const _compileArraySchema = (root: ASTParserTree, path?:string) => {
  const array = root.values
  if (array.length > 1) {
    // TODO: Throw better error
    throw new InternetObjectError("invalid-array-schema")
  }

  if (array.length === 0) {
    return {
      type: "any",
      path: _concatPath('[', path)
    }
  }

  const item = array[0]
  let currentPath = _concatPath('[', path)

  const value = _getCompileValue(item, currentPath)
  return value
}

const _compileObjectSchema = (root: ASTParserTree, path?:string) => {

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
      const currentPath = _concatPath(name, path)
      const value:any = _getCompileValue(item.value, currentPath)
      schema.keys.push(name)

      // When value is a memberDef
      if (value.type) {
        value.optional = value.optional || optional || undefined
        value.path = currentPath
        schema.defs[name] = value
      }
      else {
        schema.defs[name] = {
          type: value,
          optional: optional || undefined,
          path: currentPath
        }
      }
    }
    else if (isToken(item)) {
      const {name, optional} = _parseKeyForOptional(item.value)
      const currentPath = _concatPath(name, path)
      schema.keys.push(name)
      schema.defs[name] = {
        type: "any",
        optional: optional || undefined,
        path: currentPath
      }
    }
  }

  return schema
}

const _isMemberDef = (root:ASTParserTree) => {

  if (!root || !root.values) return false

  if (root.values.length === 0) return false

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

// Concats the path
const _concatPath = (newPath:string, oldPath?:string) => {
  let path = newPath
  if (oldPath) {
    path = (oldPath.endsWith("[") || newPath === "[")
      ? `${oldPath}${newPath}`
      : `${oldPath}.${newPath}`
  }

  return path
}

function _apply(data:any, schema:any, container?:any):any {
  const objectDef = TypedefRegistry.get("object")
  return objectDef.process(data, { type: "object", path: "", schema })
}
