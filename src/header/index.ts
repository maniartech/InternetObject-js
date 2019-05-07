import DataParser from '../data';
import InternetObjectError from '../errors/io-error';
import ErrorCodes from '../errors/io-error-codes';
import { ASTParserTree } from '../parser';
import { SCHEMA } from '../parser/constants';
import { isKeyVal, isParserTree, isString, isToken } from '../utils/is';
import Schema from './schema';
import ASTParser from '../parser/ast-parser';

export default class Header {

  private _keys:string[]
  private _map:any

  private constructor(o:any) {
    this._keys = o.keys
    this._map = o.map
  }

  public length (): number {
    return this._keys.length
  }

  public get keys (): string[] {
    return this._keys
  }

  public get (key:string):any {
    return this._map[key]
  }

  public get schema (): Schema {
    return this._map[SCHEMA]
  }

  public static compile(header:string|ASTParserTree):Header {

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
      return new Header({
        keys: [SCHEMA],
        map: {
          [SCHEMA]: Schema.compile(tree)
        },
        defs: {}
      })
    }

    // If it not collection, throw and invalid header error
    if (tree.type !== "collection") {
      throw new InternetObjectError(ErrorCodes.invlidHeader, "Invalid value found in header")
    }

    return new Header(_parseCollection(tree))

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

