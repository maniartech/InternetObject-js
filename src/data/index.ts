import { isDataType, isArray, isParserTree, isKeyVal, isToken, isString } from '../utils/is';
import { ASTParserTree } from '../parser'
import { print } from '../utils';
import { ParserTreeValue } from '../parser/index';


/**
 * Parses the ASTParserTree into the data that makes sense.
 */
export default class DataParser {
  public static parse(dataTree:ASTParserTree, defs?:any) {
    // console.log(">>>>", dataTree)
    if (dataTree.type === "scalar") {
      const val = dataTree.values[0]
      if (isToken(val)) {
        return val.value
      }
      if (val === null) {
        return
      }
    }

    const container = dataTree.type === "object" ? {} : []
    if (dataTree.values.length === 0) {
      return container
    }

    return _parse(dataTree, container)
  }
}

const _parse = (root:ASTParserTree, container:any, defs?:any) => {
  for (let index=0; index < root.values.length; index += 1) {
    let value = root.values[index]

    if (isParserTree(value)) {
      // Object
      if(value.type === 'object') {
        container[index] = _parse(value, {}, defs)
      }
      // Array
      else if(value.type === 'array') {
        container[index] = _parse(value, [], defs)
      }
    }
    else if(isKeyVal(value)) {
      let parsedValue = null
      if (isParserTree(value.value)) {
        parsedValue = _parse(value.value,
          value.value.type === "object" ? {} : [])
      }
      else if (isKeyVal(value.value)) {
        console.warn("Validate this case!")
      }
      else {
        // container[value.key] = value.value === null ? undefined : value.value.value
        parsedValue = _getValue(value.value, defs)
      }

      if (isArray(container)) {
        container.push({
          [value.key]: parsedValue
        })
      }
      else {
        container[value.key] = parsedValue
      }
    }
    else {
      // container[index] = value === null ? undefined : value.value
      container[index] = _getValue(value, defs)
    }
  }
  return container
}

function _getValue(value:ParserTreeValue, defs:any):any {
  if (isToken(value)) {
    if (isString(value.value) && value.value.startsWith("$")) {
      return _getDefValue(value.value, defs)
    }
    return value.value
  }
  return
}

function _getDefValue(def:string, defs:any):any {
  if (!defs) return def

  const value = defs[def]

  if (isParserTree(value)) {
    return (value.type === 'object')  ? _parse(value, {}) : _parse(value, [])
  }

  if (isToken(value)) {
    return _getValue(value, defs)
  }

  // TODO: Verify this case!
  throw new Error("Verify this case!")
}
