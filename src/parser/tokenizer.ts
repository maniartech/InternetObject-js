import { DATASEP, HYPHEN, NEW_LINE, SEPARATORS, SPACE, STRING_ENCLOSER, TILDE, BACKSLASH, HASH } from './constants';
import { Token } from './token';
import ErrorCodes from '../errors/io-error-codes';
import InternetObjectError from '../errors/io-error';

type NullableToken = Token | null

const escapeCharMap:any = {
  "\\": "\\\\",
  "/": "\/",
  "\"": "\"",
  "b": "\b",
  "f": "\f",
  "n": "\n",
  "r": "\r",
  "t": "\t"
}

export default class Tokenizer {
  private _text:string
  private _tokens:Token[] = []

  // Last token specific props
  private _value = ""
  private _lastToken:NullableToken = null
  private _index:number = -1
  private _row:number = 1
  private _col:number = 0
  private _start:number = -1
  private _end:number = -1
  private _tokenLength = 0
  private _isEnclosedString:boolean = false
  private _isEscaping = false
  private _isCommenting = false

  public constructor (text:string) {
    this._text = text
  }

  public read = ():NullableToken => {
    const text = this._text
    this._lastToken = {
    } as Token
    this._value = ""
    this._start = -1
    this._end = -1
    this._tokenLength = 0
    this._isEnclosedString = false

    return this._next()
  }

  public readAll = () => {
    let token = this.read()
    while(token) {
      token = this.read()
    }
  }

  public get length ():number {
    return this._tokens.length
  }

  public push = (...items: Token[]): Tokenizer => {
    this._tokens.push(...items)
    return this;
  }

  public get tokens() {
    return this._tokens
  }

  public get(index:number):Token {
    return this._tokens[index]
  }

  private _returnToken = ():NullableToken => {
    if (this._start === -1 || this._end === -1) return null

    const token = this._lastToken
    if (token === null) return null

    let value:any = this._value
      .replace(/[\s\uFEFF\xA0]+$/g, "") // Trim end spaces
      .replace(/^"+|(\\?")$/g, (g1) => { // Trim end quotes
        return g1 === "\\\"" ? g1 : ""
      })
    // console.log(">>>", value, this._value)
    let numVal = Number(value)
    let type = "string"
    token.token = this._text.substring(this._start, this._end+ (this._isEnclosedString ? 1 : 1))

    if (SEPARATORS.indexOf(value) >= 0 || value === TILDE) {
      type = "sep"
    }
    else if(value === DATASEP) {
      type = "datasep"
    }
    else if(!isNaN(numVal)) {
      value = numVal
      type = "number"
    }
    else if(value === "T") {
      value = true
      type = "boolean"
    }

    else if(value === "F") {
      value = false
      type = "boolean"
    }
    else if(value === "N") {
      value = null
      type = "null"
    }

    token.value = value
    token.type = type

    this._tokens.push(token)
    return token
  }

  private _next = ():NullableToken => {

    // Advance the step
    this._col += 1
    const index = ++this._index

    // Return token when text ends
    let ch = this._text[index]
    if (!ch) return this._returnToken()

    const token = this._lastToken
    let chCode = ch.charCodeAt(0)

    let prevCh = index > 0 ? this._text[index-1] : ''
    if (!token) return null // Bypass TS check

    let nextCh = this._text[index+1]
    let nextChCode = nextCh === undefined ? -1 : nextCh.charCodeAt(0)

    // Identify char types
    let isWS = ch <= SPACE  // Is white space or control char
    let isNewLine = ch === NEW_LINE // Is new line

    let isSep = SEPARATORS.indexOf(ch) >= 0 // Is separator
    let isNextSep = SEPARATORS.indexOf(nextCh) >= 0

    const isCollectionSep = ch === TILDE
    let isNextCollectionSep = nextCh === TILDE

    const isStarted = this._start !== -1

    const isDataSep = this._text.substr(index-2, 3) === DATASEP
    let isNextDataSep = this._text.substr(index+1, 3) === DATASEP

    // While the comment mode is active!
    if (this._isCommenting) {

      // Comment mode ends with new line, hence, turn it off when
      // a new line char is encountered.
      if (isNewLine) {
        this._isCommenting = false
      }
      else {
        // Skip and ignore chars during the comment mode!
        return this._next()
      }
    }

    // Handle white-spaces
    if (isWS) {

      if (this._tokenLength > 0) this._value += ch

      // Update values in case of new line
      if (isNewLine) {
        this._row += 1
        this._col = 0
        return this._next()
      }

      if ((isNextSep || isNextCollectionSep) && isStarted) {
        if (this._col === 0) this._col = 1
        return this._returnToken();
      }
      return this._next()
    }

    // If not whitespace
    // =================

    this._end = index

    // Processing not started yet!
    if (this._start === -1) {
      this._start = index

      // Set the row and col if not set yet.
      if (!token.col) {
        token.index = this._start
        token.col = this._col
        token.row = this._row
      }
    }

    this._tokenLength += 1


    // Handle string escapes
    if (ch === BACKSLASH && this._isEscaping === false) {
      this._isEscaping = true
      return this._next()

      // TODO: Throw and error when escaping is not closed!
    }

    // When escaping, escape next char!
    if (this._isEscaping) {
      this._isEscaping = false
      // if (isNextSep || isSep || isNextDataSep) {
      //   return this._returnToken()
      // }
      // console.log("---", this._start, this._end, ch, prevCh, this._subtext)

      this._value += ch in escapeCharMap ? escapeCharMap[ch] : ch
      return this._next()
    }

    // Process string encloser (")
    if (ch === STRING_ENCLOSER ) {
      if (this._isEnclosedString) {
        this._value += ch
        const token = this._returnToken()
        this._isEnclosedString = false
        // console.error(token)
        return token
      }

      // When the " is encountered at first char,
      // activate enclosed string mode
      if (this._tokenLength === 1) {
        this._isEnclosedString = true
      }

      // Do not allow unescaped quotation mark in the
      // string
      else {
        throw new InternetObjectError(ErrorCodes.invalidChar, `Invalid character '${ch}' encountered at ${this._index}(${ this._row }:${ this._col}).`)
      }
    }

    // When the enclosed string is not active
    if (!this._isEnclosedString) {

      if (ch === HASH) {
        this._isCommenting = true
        return this._next()
      }

      if (isSep || isNextSep || isCollectionSep || isNextCollectionSep) {
        this._value += ch
        return this._returnToken()
      }

      // End token when a separator is found
      // if ((isNextSep || isSep || isNextDataSep) &&
      //     // TODO: Skip the WS only in case of collection start
      //     this._start !== -1 &&
      //     this._end !== -1 /* Skip WS */) {
      //   return this._returnToken()
      // }

      // Check for data separator
      else if (ch === HYPHEN) {
        let value = this._text.substring(this._start, this._end + 1)
        if (value === DATASEP) {
          this._value += ch
          return this._returnToken()
        }
      }

    }
    this._value += ch
    return this._next()
  }

}


