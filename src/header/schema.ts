import '../types/index'

import DataParser from '../data/index'
import ASTParser from '../parser/ast-parser'
import ErrorCodes from '../errors/io-error-codes'

import { ASTParserTree, Token } from '../parser'
import { ParserTreeValue } from '../parser/index'
import { InternetObjectError, InternetObjectSyntaxError } from '../errors/io-error'
import { TypedefRegistry } from '../types/typedef-registry'
import { isString, isParserTree, isKeyVal, isArray, isDataType, isToken } from '../utils/is'
import KeyValueCollection from './index'

/**
 * Represents the Internet Object Schema class which is responsible for
 * compiling schemas and applying them to data objects.
 */
export default class Schema {
  private _schema: any

  /**
   *
   * @param schema Initializes the new instance of the `Schema` class.
   *
   * @param schema {string, ASTParser}
   */
  private constructor(schema: any) {
    this._schema = schema
  }

  /**
   * Returns the underlaying schema structure
   */
  public get schema() {
    return this._schema
  }

  /**
   * Applies the schema to specified data and returns the
   * mapped
   */
  public apply(data: any, vars?: KeyValueCollection) {
    if (data === undefined || data === null) {
      return data
    }

    return _apply(data, this._schema, {}, vars)
  }

  /**
   * Converts and returns the string version of current schema.
   */
  public toString() {
    // TODO: Need to work on this function.
  }

  public static compile = (schema: any, vars?: KeyValueCollection): Schema => {
    let parsedSchema: any = null

    // When string is passed, first parse it with ASTParser
    if (isString(schema)) {
      let parser = new ASTParser(schema, true)
      // TODO: Ensure what happens when parsing is failed
      parser.parse()
      parsedSchema = parser.header
    } else if (isParserTree(schema)) {
      parsedSchema = schema
    }

    if (isToken(parsedSchema)) {
      throw new InternetObjectSyntaxError(
        ErrorCodes.invalidSchema,
        'Expecting a valid schema',
        parsedSchema
      )
    }

    const compiledSchema = _compileObjectSchema(parsedSchema, undefined, vars)

    return new Schema(compiledSchema)
  }
}

const _getCompileValue = (
  value: ParserTreeValue,
  path?: string,
  vars?: KeyValueCollection
): any => {
  // Process Token
  if (isToken(value)) {
    if (vars && isString(value.value)) {
      const foundValue = vars.getV(value.value)

      // In the case of variable, if value is found, return
      if (foundValue !== undefined) {
        if (foundValue instanceof Schema) {
          return {
            type: 'object',
            schema: foundValue.schema,
            path
          }
        }
        return foundValue
      }
    }

    if (isDataType(value.value)) {
      return {
        type: value.value,
        path
      }
    }

    // return value.value

    // console.log("+++", value.value)
    // TODO: Throw better  error
    throw new InternetObjectError('invalid-datatype', 'Invalid data type', value)
  }

  if (isParserTree(value)) {
    if (_isMemberDef(value)) {
      return _compileMemberDefTree(value, path, vars)
    }
    const arrayDef = value.type === 'array'
    return {
      type: value.type,
      schema: arrayDef
        ? _compileArraySchema(value, path, vars)
        : _compileObjectSchema(value, path, vars)
    }
  }

  // TODO: Throw better error
  throw new InternetObjectError(ErrorCodes.invalidValue)
}

const _compileMemberDefTree = (root: ASTParserTree, path?: string, vars?: KeyValueCollection) => {
  if (root.values.length === 0) {
    return {
      type: root.type,
      schema: root.type === 'object' ? {} : [],
      path
    }
  }

  const firstVal = root.values[0]

  // Array Root
  if (root.type === 'array') {
    // Arrays can't have multiple schemas
    if (root.values.length > 1) {
      // TODO: Throw better  error
      throw new InternetObjectError('invalid-array-definition')
    }
    if (isToken(firstVal)) {
      if (isDataType(firstVal.value)) {
        return {
          type: 'array',
          schema: {
            type: firstVal.value,
            path: _concatPath('[', path)
          },
          path
        }
      } else {
        // TODO: Throw better  error
        throw new InternetObjectError('invalid-array-definition')
      }
    } else if (isParserTree(firstVal)) {
      return {
        type: 'array',
        schema: _compileArraySchema(firstVal, path, vars),
        path
      }
    }
  }

  // Object Root
  const memberDef: any = {}

  if (isToken(firstVal) && isString(firstVal.value)) {
    const ioType = _varOrVal(firstVal, vars)
    if (isDataType(ioType)) {
      memberDef.type = ioType
    } else {
      throw new InternetObjectSyntaxError(ErrorCodes.invalidType, ioType, firstVal)
    }
  } else if (isParserTree(firstVal)) {
    memberDef.type = firstVal.type
    memberDef.schema =
      firstVal.type === 'object'
        ? _compileObjectSchema(firstVal, path, vars)
        : _compileArraySchema(firstVal, path, vars)
  }

  for (let index = 1; index < root.values.length; index++) {
    const item = root.values[index]
    if (isKeyVal(item)) {
      let val = item.value

      if (isToken(val)) {
        memberDef[item.key] = _varOrVal(val, vars)
      } else if (isParserTree(val)) {
        memberDef[item.key] = DataParser.parse(val, vars)
      } else {
        // TODO: Consider this case when memberdef key = {object value}
        console.warn('Check this case', 'invalid-option', val)
        // throw new InternetObjectError("invalid-option")
      }
    } else if (isToken(item)) {
      memberDef[item.value] = true
    } else {
      // TODO: Throw better error
      throw new InternetObjectError('invalid-value')
    }
  }

  memberDef.path = path

  return memberDef
}

const _varOrVal = (token: Token, vars?: KeyValueCollection) => {
  if (isString(token.value) && vars) {
    const val = vars.getV(token.value)
    return val !== undefined ? val : token.value
  }
  return token.value
}

const _compileArraySchema = (
  root: ASTParserTree,
  path?: string,
  vars?: KeyValueCollection
): any => {
  const array = root.values
  const arrayPath = _concatPath('[', path)

  if (array.length === 0) {
    return {
      type: 'any',
      path: _concatPath('[', path)
    }
  }

  if (_isMemberDef(root)) {
    return _compileMemberDefTree(root, _concatPath('[', path), vars)
  } else if (isParserTree(root)) {
    return {
      type: root.type,
      schema:
        root.type === 'object'
          ? _compileObjectSchema(root, arrayPath, vars)
          : _compileArraySchema(root, arrayPath, vars),
      path: arrayPath
    }
  }
  // TODO: Throw better error
  throw new InternetObjectError('invalid-array-schema')
}

const _compileObjectSchema = (root: ASTParserTree, path?: string, vars?: KeyValueCollection) => {
  if (root.values.length === 0) return {}

  const schema: any = {
    keys: [],
    defs: {}
  }

  for (let index = 0; index < root.values.length; index += 1) {
    let item = root.values[index]

    // Item = Tree
    if (isParserTree(item)) {
      // TODO: Throw better error
      throw new InternetObjectError(
        'key-required',
        'Encountered an array or an object while expecting key.'
      )
    }
    // Item = KeyVal
    else if (isKeyVal(item)) {
      const { name, optional, nullable } = _parseKey(item.key)
      const currentPath = _concatPath(name, path)

      const value: any = _getCompileValue(item.value, currentPath, vars)
      schema.keys.push(name)

      // When value is a memberDef
      if (value.type) {
        value.optional = value.optional || optional || false
        value.null = value.null || nullable || false
        value.path = currentPath
        schema.defs[name] = value
      } else if (isDataType(value)) {
        schema.defs[name] = {
          type: value,
          optional: optional || false,
          null: nullable || false,
          path: currentPath
        }
      } else {
        throw new InternetObjectSyntaxError(ErrorCodes.invalidType, JSON.stringify(value), item)
      }
    } else if (isToken(item)) {
      const value = _varOrVal(item, vars)
      const { name, optional, nullable } = _parseKey(value)
      const currentPath = _concatPath(name, path)
      schema.keys.push(name)
      schema.defs[name] = {
        type: 'any',
        optional: optional || false,
        null: nullable || false,
        path: currentPath
      }
    }
  }
  return schema
}

const _isMemberDef = (root: ASTParserTree) => {
  if (!root || !root.values) return false

  if (root.values.length === 0) return false

  const first = root.values[0]

  if (isToken(first) && isDataType(first.value)) {
    return true
  } else if (isParserTree(first)) {
    return true
  }
  return false
}

const _parseKey = (key: string) => {
  const optionalExp = /\?$/
  const nullExp = /\*$/
  const optNullExp = /\?\*$/

  if (!isString(key)) {
    throw new InternetObjectSyntaxError(ErrorCodes.invalidKey)
  }

  if (key.match(optNullExp)) {
    return {
      name: key.substr(0, key.length - 2),
      optional: true,
      nullable: true
    }
  } else if (key.match(nullExp)) {
    return {
      name: key.substr(0, key.length - 1),
      optional: false,
      nullable: true
    }
  } else if (key.match(optionalExp) !== null) {
    return {
      name: key.substr(0, key.length - 1),
      optional: true,
      nullable: false
    }
  }
  return { name: key, optional: false, nullable: false }
}

// Concats the path
const _concatPath = (newPath: string, oldPath?: string) => {
  let path = newPath
  if (oldPath) {
    path =
      oldPath.endsWith('[') || newPath === '[' ? `${oldPath}${newPath}` : `${oldPath}.${newPath}`
  }
  return path
}

function _apply(data: any, schema: any, container?: any, vars?: KeyValueCollection): any {
  const objectDef = TypedefRegistry.get('object')
  const schemaDef = {
    type: 'object',
    path: '',
    schema
  }

  if (isParserTree(data)) {
    if (data.type === 'collection') {
      const collection: any[] = []
      data.values.forEach((item: any) => {
        collection.push(objectDef.parse(item, schemaDef, vars))
      })
      return collection
    }
    return objectDef.parse(data, schemaDef, vars)
  } else if (isArray(data)) {
    const collection = data.forEach((item: any) => {
      return objectDef.load(item, schemaDef)
    })
    return collection
  } else {
    return objectDef.load(data, schemaDef)
  }
}
