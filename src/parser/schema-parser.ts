import { isDataType, isArray } from '../is';
import { ASTParserTree, instanceOfParserTree,
         instanceOfKeyVal, ParserTreeValue } from '.';


export default class SchemaParser {

  public static parse(tree:ASTParserTree) {

    if (tree.values.length === 0) {
      return
    }
    else if (tree.values.length === 1) {
      return tree.values[0]
    }

    return generateObject(tree, {})
  }

}

const generateObject = (root:ASTParserTree, container:any) => {
  for (let index=0; index < root.values.length; index += 1) {
    let value = root.values[index]

    if (instanceOfParserTree(value)) {
      // Object
      if(value.type === 'object') {
        container[index] = generateObject(value, {})
      }
      // Array
      else {
        container[index] = generateObject(value, [])
      }
    }
    else if(instanceOfKeyVal(value)) {
      if (instanceOfParserTree(value.value)) {
        container[value.key] = generateObject(value.value,
          value.value.type === "object" ? {} : [])
      }
      else if(instanceOfKeyVal(value.value)) {
        console.log(">>>", value.value)
      }
      else {
        console.log("--->", value)
        container[value.key] = value.value
      }
    }
    else if (value) {
      if (index === 0 && isDataType(value.toString())) {
        if (isArray(container)) {
          container.push(value)
        }
        else {
          container["type"] = value
        }
      }
      else if (isArray(container)) {
        container.push(value)
      }
      else {
        container[value.toString()] = "any"
      }
    }
    else {
      console.log("~~~", value)
    }
  }
  return container
}