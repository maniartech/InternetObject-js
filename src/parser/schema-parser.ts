import { isDataType, isArray, isParserTree, isKeyVal, isSchemaDef } from '../is'
import { ASTParserTree, ParserTreeValue } from '.'
import { isString } from '../is'
import { KeyVal } from './index'

export default class SchemaParser {
  public static parse(tree: ASTParserTree) {
    if (tree.values.length === 0) {
      return
    } else if (tree.values.length === 1) {
      return tree.values[0]
    }

    return generateObject(tree, {})
  }
}

const generateObject = (root: ASTParserTree, container: any) => {
  const keys: string[] | null = isArray(container) ? null : []

  if (keys) {
    container['keys'] = keys
    container['defs'] = {}
  }

  for (let index = 0; index < root.values.length; index += 1) {
    let value = root.values[index]
    let key: string = ''

    if (isParserTree(value)) {
      // Object
      if (value.type === 'object') {
        container[index] = generateObject(value, {})
      }
      // Array
      else {
        container[index] = generateObject(value, [])
      }
    } else if (isKeyVal(value)) {
      key = value.key
      if (isParserTree(value.value)) {
        container.defs[key] = generateObject(value.value, value.value.type === 'object' ? {} : [])
      } else if (isKeyVal(value.value)) {
        console.log('>>>', value.value)
      } else {
        container.defs[key] = value.value
      }
    } else if (value) {
      if (index === 0 && isDataType(value.toString())) {
        if (isArray(container)) {
          container.push(value)
        } else {
          key = 'type'
          container.defs[key] = value
        }
      } else if (isArray(container)) {
        container.push(value)
      } else {
        key = value.toString()
        container.defs[key] = 'any'
      }
    } else {
      console.log('~~~', value)
    }
    if (key && keys) {
      keys.push(key)
    }
  }

  if(container.defs && container.defs.type && container.keys[0] === "type") {
    return container.defs
  }

  return container
}
