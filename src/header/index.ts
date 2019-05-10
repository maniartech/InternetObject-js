import DataParser from '../data';
import InternetObjectError from '../errors/io-error';
import ErrorCodes from '../errors/io-error-codes';
import { ASTParserTree } from '../parser';
import { SCHEMA } from '../parser/constants';
import { isKeyVal, isParserTree, isString, isToken } from '../utils/is';
import Schema from './schema';
import ASTParser from '../parser/ast-parser';

export default class Header {

  private _keys:any
  private _map:any

  public length (): number {
    return this._keys.length
  }

  public get keys (): string[] {
    return [...this._keys]
  }

  /**
   * Gets a value for specified key
   * @param key {string} The key
   * @returns Value
   */
  public get (key:string):any {
    return this._map[key]
  }

  /**
   * Sets the key and associated value in the header. If key already
   * @param key {string} The header key
   * @param val {any} The associated value for that key in the header.
   */
  public set(key:string, val:any):Header {
    if (key in this._map === false) {
      this._keys.push(key)
    }
    this._map[key] = val
    return this
  }

  /**
   * Removes the specified key from the header.
   * @param key {string} The key of the header item, which needs to be removed.
   */
  public remove(key:string):Header {
    if(key in this._map === false) return this
    const index = this._keys.indexOf(key)
    this._keys.splice(index)
    delete this._map[key]
    return this
  }

  /**
   * Gets schema
   */
  public get schema (): Schema {
    return this._map[SCHEMA]
  }

  /**
   * Sets schema
   */
  public set schema (schema:Schema) {
    if (!this.schema) {
      this._keys.push(SCHEMA)
    }
    this._map[SCHEMA] = schema
  }

  /**
   *
   * @param header The header string that needs to be compiled!
   * @param schema The schema
   */
  public static compile(header:string|ASTParserTree, schema?:Schema):Header {

    let tree:ASTParserTree

    if (isString(header)) {
      const parser = new ASTParser(header, true)
      parser.parse()
      tree = parser.header
    }
    else {
      tree = header
    }

    // If it is object, it must be schema. Then convert it into
    // collection.
    if (tree.type === "object") {
      const compiledSchema = Schema.compile(tree)
      return (new Header).set(SCHEMA, compiledSchema)
    }

    // If it not collection, throw and invalid header error
    if (tree.type !== "collection") {
      throw new InternetObjectError(ErrorCodes.invlidHeader, "Invalid value found in header")
    }

    const newHeader = new Header()
    const {keys, map} = _parseCollection(tree)
    newHeader._keys = keys
    newHeader._map = map
    return newHeader
  }
}


function _parseCollection (tree:ASTParserTree):any {
  const map:any = {}
  const defs:any = {}
  const keys:string[] = []

  for(let index=0; index < tree.values.length; index += 1) {
    const item = tree.values[index]

    // Verify item is an object and contains only 1 key-value pair!
    if (!isParserTree(item)) {
      // TODO: Throw better error
      throw new InternetObjectError(ErrorCodes.invalidHeaderItem)
    }

    if (item.type !== "object") {
      // TODO: Throw better error
      throw new InternetObjectError(ErrorCodes.invalidHeaderItem)
    }

    if (item.values.length !== 1) {
      // TODO: Throw better error
      throw new InternetObjectError(ErrorCodes.invalidHeaderItem)
    }

    const keyVal = item.values[0]
    if (!isKeyVal(keyVal)) {
      throw new InternetObjectError(ErrorCodes.invalidHeaderItem)
    }

    const key = keyVal.key
    let value = keyVal.value

    // When key is a SCHEMA, compile the value and create schema
    if (key === SCHEMA) {
      map[key] = Schema.compile(value)
    }
    else if (isParserTree(value)) {
      map[key] = DataParser.parse(value)
    }
    else if (isToken(value)) {
      map[key] = value.value
    }
    // When value is null or of KeyVal type!
    else {
      // TODO: Fix this error
      throw new InternetObjectError(ErrorCodes.invalidHeaderItem)
    }
    keys.push(key)

  }

  return { keys, map }
}

