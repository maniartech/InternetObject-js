import Token from '../token';
import { throwError } from '../errors';
import {
  isDataType, isArray,
  isParserTree, isKeyVal } from '../utils/is'
import { ASTParserTree, ParserTreeValue } from '.';
import SchemaParser from './schema-parser';
import DataParser from './data-parser';
import { print } from '../utils/index';


export default class ASTParser {
  public tree:any = {
    header: null,
    data: null
  }
  public stack:ASTParserTree[] = []
  private lastObj:any = null
  private lastToken:Token|null = null

  process = (token:Token, isFinalToken:boolean = false) => {
    let stack = this.stack

    let obj = this.getObject()

    if (token.value === "{") {
      // this.stack.push("{")
      this.push()
      // return
    }
    else if(token.value === "[") {
      // this.stack.push("[")
      this.push("array")
      // return
    }

    else if (token.value === ':') {
      let lastVal = obj.values[obj.values.length - 1]

      if (lastVal && ['string', 'number', 'boolean'].indexOf(typeof lastVal) > -1) {
        obj.values[obj.values.length - 1] = {
          key: lastVal.toString(),
          value: undefined
        }
        // console.log(obj.values)
      }
      else {
        // TODO:Handle null and other types
        // Throw Invalid key error!
      }
    }
    // Empty token
    else if (token.value === ",") {
      if(this.lastToken !== null && this.lastToken.value === ",") {
        this.addValue("")
      }
    }
    else if (token.value === "}" || token.value === "]") {
      this.pop(token.value === "}"
        ? "object"
        : "array", token)
    }

    // Ready for schema generation
    else if (token.type === "datasep") {
      console.log("--------", this.stack)
      if (this.tree.header === null) {
        this.tree.header = {
          schema: {...this.stack[0]}
        }
        this.stack.length = 0
      }
    }
    // else if(token.type !== "sep") {
    else {
      this.addValue(token.value)
    }

    this.lastToken = token
  }

  public done = () => {
    if (this.stack.length === 0) return
    let data = this.stack[0]
    if (this.tree.data === null) {
      this.tree.data = data
    }
    print(this.tree)
  }

  public toObject = () => {
    if (this.stack.length === 0) return null
    const data = this.tree.data
    if (data) {
      return DataParser.parse(data)
    }
    return null
  }

  public toSchema = () => {
    if (this.stack.length === 0) return null
    const schema = (this.tree.header || {}).schema || null
    if (schema) {
      return SchemaParser.parse(schema)
    }
    return null
  }

  private addValue = (value:any) => {
    let obj = this.getObject()

    // If last token is : then
    if (this.lastToken !== null && this.lastToken.value === ":") {
      let lastVal = obj.values[obj.values.length - 1]
      // console.log("---", lastVal)
      if (lastVal && isKeyVal(lastVal)) {
        // obj.values[obj.values.length - 1].value = value
        lastVal.value = value
      }
      else {
        // TODO: Verify this case!
        console.warn("Verify this case!")
      }
    }
    else {
      obj.values.push(value)
    }
  }

  private getObject = () => {
    if (this.stack.length === 0) {
      this.stack.push({
        type: "object",
        values: []
      })
    }

    let obj = this.stack[this.stack.length-1]
    return obj
  }

  private push = (type="object", values=[]) => {
    let object = this.getObject()
    let newObject = { type, values }
    this.addValue(newObject)
    this.stack.push(newObject)
  }

  private pop = (type:string, token:Token) => {
    const obj = this.getObject()

    if (obj.type !== type) {
      const message = `Expecting "${
          obj.type === "object" ? "}" : "]"
        }" but found "${
          obj.type === "object" ? "]" : "}"
        }"`
      throwError(token, message)
    }
    this.stack.pop()
  }

}

