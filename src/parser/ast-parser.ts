import InternetObjectError from '../errors/io-error';
import { print } from '../utils/index';
import { isKeyVal, isSchemaDef } from '../utils/is';
import { ASTParserTree, ParserTreeValue } from './';
import { Token } from './token';
import Tokenizer from './tokenizer';
import { COMMA, CURLY_CLOSED, SQUARE_CLOSED, TILDE } from './constants';
import ErrorCodes from '../errors/io-error-codes';

const NOT_STARTED = 'not-started'
const STARTED = 'started'
const FINISHED = 'finished'
const ERROR = 'error'

/** @internal */
export default class ASTParser {
  private _tokenizer: Tokenizer
  private _schemaOnly: boolean
  private _text: string
  public stack: ASTParserTree[] = []
  private lastToken: Token | null = null
  private _isCollection = false
  private _isHeaderOpen = true

  public status = NOT_STARTED
  public tree: any = {}

  constructor(text: string, schemaOnly: boolean = false) {
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
    return this.tree.header
  }

  public get data() {
    if (this.status !== FINISHED) {
      throw new Error('parsing-not-finished')
    }
    return this.tree.data
  }

  // Process the tokens and build ast.
  private _process = (token: Token, isFinalToken: boolean = false) => {
    let stack = this.stack

    this.status = STARTED

    // Push new object
    if (token.value === '{') {
      this._push("object")
    }

    // Push new array
    else if (token.value === '[') {
      this._push("array")
    }

    // Key Value found
    else if (token.value === ':') {
      const obj = this._getObject()
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

    // New Token
    else if (token.value === COMMA) {
      // Empty Token Found
      if (this.lastToken !== null && this.lastToken.value === ',') {
        this._addValue(null)
      }
    }

    // Close object and close array
    else if (token.value === CURLY_CLOSED || token.value === SQUARE_CLOSED) {
      this._pop(token.value === CURLY_CLOSED ? 'object' : 'array', token)
    }

    else if (token.value === TILDE) {
      // The ~ sign can occur in any section (header/data) first.
      // If it is a new tree, or header/schema is already been established,
      // set the collection mode to true.
      if (this.stack.length === 0) {
        this._isCollection = true
      }
      // When the TILDE is encountered second time check collection mode is on,
      // if not, throw an error
      else if (!this._isCollection && !this.tree.data) {
        // TODO: Throw and error here
        console.log(this.tree)
        console.log(this.stack)
        throw new InternetObjectError(ErrorCodes.invalidCollection, null, token)
      }
      else {
        this._processObject()
      }

    }

    // Ready for schema generation
    else if (token.type === 'datasep') {
      // Header is closed when, datasep is found. After the header
      // is closed, throw an error when another datasep is sent!
      if (!this._isHeaderOpen) {
        throw new InternetObjectError(ErrorCodes.multipleHeaders,"Multiple headers are not allowed.", token)
      }
      this._processObject()
      this._isHeaderOpen = false
      this._isCollection = false
      this.stack.length = 0
      // this._addToHeader()

    }
    else {
      this._addValue(token)
    }

    this.lastToken = token
  }

  private _processObject = () => {
    const isCollection = this._isCollection
    const isHeaderOpen = this._isHeaderOpen
    const data = this.stack[0]

    // Nothing to process
    if (this.stack.length === 0) {
      // TODO: Handle this case
    }

    // When there are open objects and arrays, stack will contain
    // more than one items.
    if (this.stack.length > 1) {
      // TODO: Throw a proper error here
      throw new Error("open-bracket")
    }

    // Process header section
    if (isHeaderOpen) {
      if (isCollection) {
        if (!this.tree.header) {
          this.tree.header = [data]
        }
        else {
          this.tree.header.push(data)
        }
      }
      else {
        this.tree.header = data
      }
    }
    else {
      // Process data section
      if (isCollection) {
        if (!this.tree.data) {
          this.tree.data = [data]
        }
        else {
          this.tree.data.push(data)
        }
      }
      else {
        this.tree.data = data
      }
    }

    // Reset stack
    this.stack.length = 0
  }

  private _finalize = () => {
    this.status = FINISHED

    this._processObject()

    if (this._isHeaderOpen) {
      this.tree.data = this.tree.header
      delete this.tree.header
    }


    return

    // If no data found just return
    if (this.stack.length === 0) return

    // TODO: Consider the scenario when more than 1 item exists in the stack!
    if (this.stack.length > 1) {
      console.warn(this._text, this.stack)
      console.warn("Invalid Stack")
    }

    let data = this.stack[0]

    const tokenCount = this._tokenizer.length

    if (this.tree.data === undefined) {
      if (this._schemaOnly) {
        this.tree.header = data
        // TODO: Handle the case when compiling for schema
        // and token count is 1
        console.warn("Compiling for schema while token count is 1")
      }
      else {
        if (tokenCount === 1) {
          data.type = "scalar"
        }
        this.tree.data = data
      }
    }
  }

  private _addToHeader = () => {
    if (!this.tree.header) {
      // When more than 1 item exists in the stack, it means
      // one or more bracket is still open.
      if (this.stack.length > 1) {
        // TODO: Throw a proper error
        console.warn("Invalid Stack")
      }
      this.tree.header = this.stack[0]
      this.stack.length = 0
    }
    else {
      // TODO: Handle this case!
      console.warn("multiple-headers")
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
