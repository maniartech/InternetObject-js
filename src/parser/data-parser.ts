import { isDataType, isArray, isParserTree, isKeyVal, isToken } from '../utils/is'
import { ASTParserTree } from '.'

/**
 * Parses the ASTParserTree into the data that makes sense.
 */
export default class DataParser {
  public static parse(dataTree:ASTParserTree) {

    if (dataTree.values.length === 0) {
      return
    } else if (dataTree.values.length === 1) {
      const val = dataTree.values[0]
      if (isToken(val)) {
        return val.value
      }
    }

    return generateObject(dataTree, {})
  }
}

const generateObject = (root:ASTParserTree, container:any) => {
  for (let index=0; index < root.values.length; index += 1) {
    let value = root.values[index]

    if (isParserTree(value)) {
      // Object
      if(value.type === 'object') {
        container[index] = generateObject(value, {})
      }
      // Array
      else if(value.type === 'array') {
        container[index] = generateObject(value, [])
      }
    }
    else if(isKeyVal(value)) {
      if (isParserTree(value.value)) {
        container[value.key] = generateObject(value.value,
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