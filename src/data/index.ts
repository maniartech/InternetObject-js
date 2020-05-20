import { isArray, isParserTree, isKeyVal, isToken, isString, isUndefined } from '../utils/is'
import { ASTParserTree } from '../parser'
import { ParserTreeValue } from '../parser/index'
import KeyValueCollection from '../header'

/**
 * Represents the DataParser class, which is responsible for parsing
 * the ASTParserTree into the data that makes sense.
 *
 * @internal
 */
export default class DataParser {
  /**
   * Parses the dataTree and returns the sensible POJO.
   * @param dataTree The parsed dataTree
   * @param defs The defs references, (Not in use currently!)
   *
   * TODO: Implementations on defs-references not yet finalized!
   */
  public static parse(dataTree: ASTParserTree, vars?: KeyValueCollection) {
    if (!isParserTree(dataTree)) return undefined

    if (dataTree.type === 'scalar') {
      const val = dataTree.values[0]
      if (isToken(val)) {
        return val.value
      }
      if (isUndefined(val)) {
        return
      }
    }

    const container = dataTree.type === 'object' ? {} : []
    if (dataTree.values.length === 0) {
      return container
    }

    return _parse(dataTree, container, vars)
  }
}

const _parse = (root: ASTParserTree, container: any, vars?: KeyValueCollection) => {
  for (let index = 0; index < root.values.length; index += 1) {
    let value = root.values[index]

    if (isParserTree(value)) {
      // Object
      if (value.type === 'object') {
        container[index] = _parse(value, {}, vars)
      }
      // Array
      else if (value.type === 'array') {
        container[index] = _parse(value, [], vars)
      }
    } else if (isKeyVal(value)) {
      let parsedValue = null
      if (isParserTree(value.value)) {
        parsedValue = _parse(value.value, value.value.type === 'object' ? {} : [], vars)
      } else if (isKeyVal(value.value)) {
        console.warn('Validate this case!')
      } else {
        // container[value.key] = value.value === null ? undefined : value.value.value
        parsedValue = _getValue(value.value, vars)
      }

      if (isArray(container)) {
        container.push({
          [value.key]: parsedValue
        })
      } else {
        container[value.key] = parsedValue
      }
    } else {
      // container[index] = value === null ? undefined : value.value
      container[index] = _getValue(value, vars)
    }
  }
  return container
}

// TODO: Handle defs!
function _getValue(value: ParserTreeValue, vars?: KeyValueCollection): any {
  if (isToken(value)) {
    if (vars && isString(value.value) && value.value.startsWith('$')) {
      const key = value.value.substr(1)
      const val = vars.get(key)
      return val ? val : value.value
    }
    return value.value
  }
  return
}
