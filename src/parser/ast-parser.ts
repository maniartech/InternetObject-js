import Tokenizer from './tokenizer'
import ErrorCodes from '../errors/io-error-codes'

import { InternetObjectSyntaxError } from '../errors/io-error'
import { isKeyVal, isToken } from '../utils/is'
import { ASTParserTree, Token } from './'
import {
  COMMA,
  CURLY_CLOSED,
  SQUARE_CLOSED,
  TILDE,
  DATASEP,
  SQUARE_OPEN,
  CURLY_OPEN,
  COLON
} from './constants'

const NOT_STARTED = 'not-started'
const STARTED = 'started'
const FINISHED = 'finished'
const ERROR = 'error'

/**
 * Represents the which accepts the raw text and generates abstract syntax tree.
 * The format of the generated AST is somewhat similar to the standard one,
 * but not the same.
 *
 * @internal
 */
export default class ASTParser {
  private _isCollection = false
  private _isHeaderOpen = true
  private _lastToken?: Token = undefined
  private _isHeader: boolean
  private _stack: ASTParserTree[] = []
  private _text: string
  private _tokenizer: Tokenizer
  private _tree: any = {}
  private _isFinalToken = false

  // TODO: Don't use public fields, use btter appraoch
  // such as readonly properties like parser.isFinished...
  public status = NOT_STARTED

  /**
   * Initializes the new instance of `ASTParser` class.
   * @param text {string} The text which needs to be parsed
   * @param isHeader {boolean} Whether the text is schema or not, `true` if it is schema.
   */
  constructor(text: string, isHeader: boolean = false) {
    this._text = text
    this._tokenizer = new Tokenizer(text)
    this._isHeader = isHeader
  }

  /**
   * Parses the text.
   */
  parse = () => {
    const tokenizer = this._tokenizer

    while (!tokenizer.done) {
      let token = tokenizer.read()
      this._isFinalToken = tokenizer.done

      // When the blank string is passed to the parser, tokenizer
      // returns the null value
      if (token !== null) {
        this._process(token)
      }
    }
    this._finalize()
  }

  /**
   * Returns the header part. Throws an error if invoked
   * before the parsing is finished!
   */
  public get header() {
    if (this.status !== FINISHED) {
      throw new Error('parsing-not-finished')
    }
    return this._tree.header
  }

  /**
   * Returns the data part. Throws an error if invoked
   * before the parsing is finished!
   */
  public get data() {
    if (this.status !== FINISHED) {
      throw new Error('parsing-not-finished')
    }
    return this._tree.data
  }

  /**
   * Returns the text this object has parsed or about
   * to be parsed.
   */
  public get text() {
    return this._text
  }

  // Process the tokens and build ast.
  private _process = (token: Token) => {
    const isFinalToken = this._isFinalToken
    let stack = this._stack

    this.status = STARTED

    if (token.type === 'sep' || token.type === 'datasep') {
      // Push new object
      if (token.value === '{') {
        this._push('object', token.index, token.row, token.col)
        // console.log("#####", this._stack)
      }

      // Push new array
      else if (token.value === '[') {
        this._push('array', token.index, token.row, token.col)
      }

      // When a colon is found, consider previous value as key
      // and keep the value slot to null. When the next token arives, push it
      // into the value slot.
      // TODO: Todo check key-value pair is complete.
      else if (token.value === COLON) {
        const obj = this._getObject()
        // TODO: Validate length of the obj.values
        let lastToken: any = obj.values[obj.values.length - 1]

        if (
          isToken(lastToken) &&
          ['string', 'number', 'boolean'].indexOf(typeof lastToken.value) > -1
        ) {
          obj.values[obj.values.length - 1] = {
            key: lastToken.value, // TODO: Test check what happens when an int, null or bool is passed as key
            value: undefined, // No value
            index: lastToken.index,
            row: lastToken.row,
            col: lastToken.col
          }
        } else {
          // TODO:Handle null and other types
          // Throw Invalid key error!
        }
      }

      // New Token
      else if (token.value === COMMA) {
        // Handle consicutive ending commas such as `test,,`
        if (
          isFinalToken &&
          this._lastToken !== undefined &&
          (this._lastToken.value === COMMA || this._lastToken.value === TILDE)
        ) {
          this._addValue(undefined, this._lastToken.index, this._lastToken.row, this._lastToken.col)
          this._addValue(undefined, token.index, token.row, token.col)
        } else if (
          // When the last token is comma such as `value,`
          isFinalToken ||
          // When the first token is comma such as `,value`
          this._lastToken === undefined ||
          // When comma is found after opening of braces, colon or datasep operators
          [CURLY_OPEN, SQUARE_OPEN, COLON, DATASEP].indexOf(this._lastToken.value) > -1 ||
          // When the comma is found just after another comma
          this._lastToken.value === COMMA ||
          // When the comma is found just after the tilde (collection) sign
          this._lastToken.value === TILDE
        ) {
          this._addValue(undefined, token.index, token.row, token.col)
        }
      }

      // Close object and close array
      else if (token.value === CURLY_CLOSED || token.value === SQUARE_CLOSED) {
        this._pop(token.value === CURLY_CLOSED ? 'object' : 'array', token)
      } else if (token.value === TILDE) {
        // The ~ sign can occur in any section (header/data) first.
        // If it is a new tree, or header/schema is already been established,
        // set the collection mode to true.
        if (this._stack.length === 0) {
          this._isCollection = true
        }
        // When the TILDE is encountered second time check collection mode is on,
        // if not, throw an error
        else if (!this._isCollection && !this._tree.data) {
          // TODO: Throw an error here
          throw new InternetObjectSyntaxError(ErrorCodes.invalidCollection, undefined, token)
        } else {
          this._processObject()
        }
      }

      // Ready for schema generation
      else if (token.value === DATASEP) {
        // Header is closed when, datasep is found. After the header
        // is closed, throw an error when another datasep is sent!
        if (!this._isHeaderOpen) {
          throw new InternetObjectSyntaxError(
            ErrorCodes.multipleHeaders,
            'Multiple headers are not allowed.',
            token
          )
        }
        this._processObject()
        this._isHeaderOpen = false
        this._isCollection = false
        this._stack.length = 0
        // this._addToHeader()
      }
    } else {
      this._addValue(token, token.index, token.row, token.col)
    }

    this._lastToken = token
  }

  private _processObject = () => {
    const isCollection = this._isCollection
    const isHeaderOpen = this._isHeaderOpen
    const data = this._stack[0]

    // Nothing to process
    if (this._stack.length === 0) {
      // TODO: Handle this case
      return
    }

    // When there are open objects and arrays, stack will contain
    // more than one items.
    if (this._stack.length > 1) {
      // TODO: Throw a proper error here
      throw new InternetObjectSyntaxError(
        ErrorCodes.openBracket,
        'Expecting bracket to be closed',
        this._lastToken || undefined
      )
    }

    // Process header section
    if (isHeaderOpen) {
      if (isCollection) {
        if (!this._tree.header) {
          this._tree.header = {
            type: 'collection',
            values: [data]
          }
        } else {
          this._tree.header.values.push(data)
        }
      } else {
        this._tree.header = data
      }
    } else {
      // Process data section
      if (isCollection) {
        if (!this._tree.data) {
          this._tree.data = {
            type: 'collection',
            values: [data]
          }
        } else {
          // console.log("3.", data)
          this._tree.data.values.push(data)
        }
      } else {
        this._tree.data = data
      }
    }

    // Reset stack
    this._stack.length = 0
  }

  private _finalize = () => {
    this.status = FINISHED

    this._processObject()

    // console.warn(JSON.stringify(this._tree, null, 2))

    // TODO: Consider the scenario when more than 1 item exists in the stack!
    if (this._stack.length > 1) {
      console.warn('Invalid Stack', this._stack)
    }

    if (this._isHeaderOpen) {
      this._tree.data = this._tree.header
      delete this._tree.header

      if (this._tree.data) {
        if (
          this.data.values.length === 1 &&
          this._isCollection === false &&
          isToken(this.data.values[0])
        ) {
          this._tree.data.type = 'scalar'
        }
        // TODO: Add comment
        else if (this._tree.data.type === 'object' && this._tree.data.values.length === 1) {
          this._tree.data = this._tree.data.values[0]
        }
      }
    }

    if (this._isHeader) {
      this._tree.header = this._tree.data
      this._tree.data = undefined // TODO: Replace this with `undefined`
    }
  }

  private _getOrCreateObject = (index: number, row: number, col: number) => {
    if (this._stack.length === 0) {
      this._stack.push({
        type: 'object',
        values: [],
        index,
        row,
        col
      })
    }

    let obj = this._stack[this._stack.length - 1]
    return obj
  }

  private _getObject = () => {
    // TODO: Verify and remove the commented code!
    // if (this._stack.length === 0) {
    //   this._stack.push({
    //     type: 'object',
    //     values: []
    //   })
    // }

    let obj = this._stack[this._stack.length - 1]
    return obj
  }

  private _addValue = (value: any, index: number, row: number, col: number) => {
    let obj = this._getOrCreateObject(index, row, col)

    // If last token is : then
    if (this._lastToken && this._lastToken.value === ':') {
      let lastVal = obj.values[obj.values.length - 1]

      // When the lastVal is a KeyVal, set the current token as
      // the value of lastVal
      if (lastVal && isKeyVal(lastVal)) {
        lastVal.value = value
      } else {
        // TODO: Verify this case!
        console.warn('Verify this case!')
      }
    } else {
      this._checkValueSlot(value)
      obj.values.push(value)
    }
  }

  // Ensures values can only be added after a separator
  private _checkValueSlot(value: any) {
    const token: any = this._lastToken
    if (token === undefined) return

    if (value === undefined) return // TODO: Check this, replaced null with undefined

    if (isToken(value) && value.value === '') return

    if ([',', ':', '~', '{', '[', '---'].indexOf(token.value) === -1) {
      // console.warn(token, value)
      // TODO: Provide better error
      throw new InternetObjectSyntaxError(ErrorCodes.expectingSeparator, '', value)
    }
  }

  private _push = (type = 'object', index: number, row: number, col: number, values = []) => {
    let object = this._getOrCreateObject(index, row, col)
    let newObject = { type, values, index, row, col }
    this._addValue(newObject, index, row, col)
    this._stack.push(newObject)
  }

  private _pop = (type: string, token: Token) => {
    const obj = this._getObject()

    if (obj.type !== type) {
      const message = `Expecting "${obj.type === 'object' ? '}' : ']'}" but found "${
        obj.type === 'object' ? ']' : '}'
      }"`
      this.status = ERROR
      throw new InternetObjectSyntaxError(ErrorCodes.invalidBracket, message, token)
    }
    this._stack.pop()
  }
}
