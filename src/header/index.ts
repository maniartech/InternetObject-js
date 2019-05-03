import DataParser from '../data';
import InternetObjectError from '../errors/io-error';
import ErrorCodes from '../errors/io-error-codes';
import { ASTParserTree } from '../parser';
import { SCHEMA } from '../parser/constants';
import { isKeyVal, isParserTree, isString, isToken } from '../utils/is';
import IObjectSchema from './schema';
import ASTParser from '../parser/ast-parser';

export default class Header {

  private _keys:string[]
  private _map:any
  private _defs:any

  private constructor(o:any) {
    this._keys = o.keys
    this._map = o.map
    this._defs = o.defs
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

  public get schema (): IObjectSchema {
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

    // If it is object, it must be schema.
    if (tree.type === "object") {
      return new Header({
        keys: [SCHEMA],
        map: {
          [SCHEMA]: IObjectSchema.compile(tree)
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

    // When value is a definition, replace it with a concrete value
    // found from the defs object.
    // In the following example, The color $R is set as "red"
    // ~ $R: red,
    // ~ $G: green,
    // ~ $B: blue,
    // color: $R
    if (isToken(value) && isString(value) && value.startsWith("$")) {
      value = defs[value] || value
    }

    // When key is a def, do not process. Just use it as it is.
    if (key.startsWith("$")) {
      defs[key] = value
    }
    else {
      // When key is a SCHEMA, compile the value and create schema
      if (key === SCHEMA) {
        map[key] = IObjectSchema.compile(value, defs)
      }
      else if (isParserTree(value)) {
        map[key] = DataParser.parse(value, defs)
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
  }

  return { keys, map, defs }
}

