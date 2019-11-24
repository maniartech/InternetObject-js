import DataParser from '../data'
import { InternetObjectError } from '../errors/io-error'
import ErrorCodes from '../errors/io-error-codes'
import { ASTParserTree } from '../parser'
import { SCHEMA } from '../parser/constants'
import { isKeyVal, isParserTree, isString, isToken } from '../utils/is'
import Schema from './schema'
import ASTParser from '../parser/ast-parser'
import { print } from '../utils'

export default class KeyValueCollection {
  private _keys: any = []
  private _map: any = {}

  public length(): number {
    return this._keys.length
  }

  public get keys(): string[] {
    return [...this._keys]
  }

  /**
   * Gets a value for specified key
   * @param key {string} The key
   * @returns Value
   */
  public get(key: string): any {
    return this._map[key]
  }

  /**
   * Sets the value for the key.
   * @param key {string} The key
   * @param val {any} The associated value for that key.
   */
  public set(key: string, val: any): KeyValueCollection {
    if (key in this._map === false) {
      this._keys.push(key)
    }
    this._map[key] = val
    return this
  }

  /**
   * Removes the specified key from the collection.
   * @param key {string} The key of the collection item, which needs to be removed.
   */
  public remove(key: string): KeyValueCollection {
    if (key in this._map === false) return this
    const index = this._keys.indexOf(key)
    this._keys.splice(index)
    delete this._map[key]
    return this
  }

  /**
   * Gets schema
   */
  public get schema(): Schema {
    return this._map[SCHEMA] || null
  }

  /**
   * Sets schema
   */
  public set schema(schema: Schema) {
    if (!this.schema) {
      this._keys.push(SCHEMA)
    }
    this._map[SCHEMA] = schema
  }

  /**
   *
   * @param collection The collection string that needs to be compiled!
   * @param schema The schema
   */
  public static compile(collection: any, schema?: Schema | string): KeyValueCollection {
    let tree: ASTParserTree
    const newCollection = new KeyValueCollection()

    if (isString(collection)) {
      const parser = new ASTParser(collection, true)
      parser.parse()
      tree = parser.header
    } else if (isParserTree(collection)) {
      tree = collection
    } else {
      throw new Error('invlid-collection')
    }

    // If it is object, it must be schema. Then convert it into
    // collection.
    if (tree.type === 'object') {
      const compiledSchema = Schema.compile(tree)
      newCollection.set(SCHEMA, compiledSchema)
    }
    // If it not collection, throw and invalid header error
    else if (tree.type !== 'collection') {
      throw new InternetObjectError(ErrorCodes.invlidHeader, 'Invalid value found in header')
    } else {
      // Setup new header
      const { keys, map } = _parseCollection(tree)
      newCollection._keys = keys
      newCollection._map = map
    }

    // Override the schema with the supplied one
    if (schema) {
      let compiledSchema = schema
      if (isString(schema)) {
        compiledSchema = Schema.compile(tree)
      }
      newCollection.set(SCHEMA, compiledSchema)
    }

    return newCollection
  }
}

function _parseCollection(tree: ASTParserTree): any {
  const map: any = {}
  const keys: string[] = []

  for (let index = 0; index < tree.values.length; index += 1) {
    const item = tree.values[index]

    // Verify item is an object and contains only 1 key-value pair!
    if (!isParserTree(item)) {
      console.warn('>>', tree)
      // TODO: Throw better error
      throw new InternetObjectError(ErrorCodes.invalidHeaderItem)
    }

    if (item.type !== 'object') {
      // TODO: Throw better error
      throw new InternetObjectError(ErrorCodes.invalidHeaderItem)
    }

    if (item.values.length !== 1) {
      console.log('***', item, item.values)
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
    } else if (isParserTree(value)) {
      map[key] = DataParser.parse(value)
    } else if (isToken(value)) {
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
