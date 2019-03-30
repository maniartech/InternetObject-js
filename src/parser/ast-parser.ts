import { Token } from './token'
import { isDataType, isArray, isParserTree, isKeyVal } from '../utils/is'
import { ASTParserTree, ParserTreeValue } from '.'
// import SchemaParser from './bak-schema-compiler'
import DataParser from './data-parser'
import { print } from '../utils/index'
import InternetObjectSchema from './schema'
import Tokenizer from './tokenizer'
import InternetObjectError from '../errors/io-error';

const NOT_STARTED = 'not-started'
const STARTED = 'started'
const FINISHED = 'finished'
const ERROR = 'error'

/** @internal */
export default class ASTParser {
  private _tokenizer: Tokenizer
  private _schemaOnly:boolean
  private _text:string
  public stack: ASTParserTree[] = []
  private lastToken: Token | null = null

  public status = NOT_STARTED
  public tree: any = {}

  constructor(text: string, schemaOnly:boolean = false) {
    this._text = text
    this._tokenizer = new Tokenizer(text)
    this._schemaOnly = schemaOnly
  }

  parse = () => {
    let token = this._tokenizer.read()
    while (token) {
      this._process(token)
      token = this._tokenizer.read()
    }
    this._finalize()
  }

  public get schema() {
    if (this.status !== FINISHED) {
      throw new Error('parsing-not-finished')
    }
    return this.tree.schema
  }

  public get data() {
    if (this.status !== FINISHED) {
      throw new Error('parsing-not-finished')
    }
    return this.tree.data
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
    const schema = (this.tree.header || {}).schema
      ? this.tree.header.schema
      : this.tree.data || null
    // console.log("...", schema)

    return null
  }

  private _process = (token: Token, isFinalToken: boolean = false) => {
    let stack = this.stack
    let obj = this._getObject()

    this.status = STARTED

    if (token.value === '{') {
      // this.stack.push("{")
      this._push()
      // return
    } else if (token.value === '[') {
      // this.stack.push("[")
      this._push('array')
      // return
    } else if (token.value === ':') {
      let lastVal: any = obj.values[obj.values.length - 1]

      if (lastVal && ['string', 'number', 'boolean'].indexOf(typeof lastVal.value) > -1) {
        obj.values[obj.values.length - 1] = {
          key: lastVal.value,
          value: null
        }
        // console.log(obj.values)
      } else {
        // TODO:Handle null and other types
        // Throw Invalid key error!
      }
    }
    // Empty token
    else if (token.value === ',') {
      if (this.lastToken !== null && this.lastToken.value === ',') {
        this._addValue(null)
      }
    } else if (token.value === '}' || token.value === ']') {
      this._pop(token.value === '}' ? 'object' : 'array', token)
    }

    // Ready for schema generation
    else if (token.type === 'datasep') {
      if (!this.tree.schema) {
        // TODO: Consider the scenario when more than 1 item exists in the stack!
        if (this.stack.length > 1) {
          console.warn("Invalid Stack")
        }
        this.tree.schema = { ...this.stack[0] }
        this.stack.length = 0
      }
    }
    // else if(token.type !== "sep") {
    else {
      this._addValue(token)
    }

    this.lastToken = token
  }

  private _finalize = () => {
    this.status = FINISHED

    // If no data found just return
    if (this.stack.length === 0) return

    // TODO: Consider the scenario when more than 1 item exists in the stack!
    if (this.stack.length > 1) {
      console.warn(this._text, this.stack)
      console.warn("Invalid Stack")
    }

    let data = this.stack[0]
    if (this.tree.data === undefined) {
      if (this._schemaOnly) {
        this.tree.schema = data
      }
      else {
        this.tree.data = data
      }
    }
  }

  private _addValue = (value: any) => {
    let obj = this._getObject()

    // If last token is : then
    if (this.lastToken !== null && this.lastToken.value === ':') {
      let lastVal = obj.values[obj.values.length - 1]
      // console.log("---", lastVal)
      if (lastVal && isKeyVal(lastVal)) {
        // obj.values[obj.values.length - 1].value = value
        lastVal.value = value
      } else {
        // TODO: Verify this case!
        console.warn('Verify this case!')
      }
    } else {
      obj.values.push(value)
    }
  }

  private _getObject = () => {
    if (this.stack.length === 0) {
      this.stack.push({
        type: 'object',
        values: []
      })
    }

    let obj = this.stack[this.stack.length - 1]
    return obj
  }

  private _push = (type = 'object', values = []) => {
    let object = this._getObject()
    let newObject = { type, values }
    this._addValue(newObject)
    this.stack.push(newObject)
  }

  private _pop = (type: string, token: Token) => {
    const obj = this._getObject()

    if (obj.type !== type) {
      const message = `Expecting "${obj.type === 'object' ? '}' : ']'}" but found "${
        obj.type === 'object' ? ']' : '}'
      }"`
      this.status = ERROR
      // throwError(token, message)
      throw new InternetObjectError("parser-error", message, token)
    }
    this.stack.pop()
  }
}
