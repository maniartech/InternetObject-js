import { isDataType, isArray, isParserTree, isKeyVal } from '../utils/is'
import { ASTParserTree } from '.'

export default class DataParser {
  public static parse(tree: ASTParserTree) {
    if (tree.values.length === 0) {
      return
    } else if (tree.values.length === 1) {
      return tree.values[0]
    }

    return generateObject(tree, {})
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
      else {
        container[value.key] = value.value
      }
    }
    else {
      container[index] = value
    }
  }
  return container
}