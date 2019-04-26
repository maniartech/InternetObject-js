import { isDataType, isArray, isParserTree, isKeyVal, isToken } from '../utils/is'
import { ASTParserTree } from '../parser'
import { print } from '../utils';


/**
 * Parses the ASTParserTree into the data that makes sense.
 */
export default class DataParser {
  public static parse(dataTree:ASTParserTree) {

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

const _parse = (root:ASTParserTree, container:any) => {
  for (let index=0; index < root.values.length; index += 1) {
    let value = root.values[index]

    if (isParserTree(value)) {
      // Object
      if(value.type === 'object') {
        container[index] = _parse(value, {})
      }
      // Array
      else if(value.type === 'array') {
        container[index] = _parse(value, [])
      }
    }
    else if(isKeyVal(value)) {
      if (isParserTree(value.value)) {
        container[value.key] = _parse(value.value,
          value.value.type === "object" ? {} : [])
      }
      else if (isKeyVal(value.value)) {
        console.warn("Validate this case!")
      }
      else {
        container[value.key] = value.value === null ? undefined : value.value.value
      }
    }
    else {
      container[index] = value === null ? undefined : value.value
    }
  }
  return container
}