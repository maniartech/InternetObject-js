import { DATASEP, HYPHEN, NEW_LINE, SEPARATORS, SPACE, STRING_ENCLOSER, TILDE } from './constants';
import { Token } from './token';

type NullableToken = Token | null

export default class Tokenizer {
  private _text:string
  private _tokens:Token[] = []
  private _index:number = -1
  private _row:number = 1
  private _col:number = 0
  private _start:number = -1
  private _end:number = -1
  private _lastToken:NullableToken = null
  private _isEnclosedStringActive:boolean = false

  public constructor (text:string) {
    this._text = text
  }

  public read = ():NullableToken => {
    const text = this._text
    this._lastToken = {
    } as Token
    this._start = -1
    this._end = -1
    this._isEnclosedStringActive = false

    return this.next()
  }

  public readAll = () => {
    let token = this.read()
    while(token) {
      // this.push(token)
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
    return this._tokens.slice()
  }

  public get(index:number):Token {
    return this._tokens[index]
  }

  private getToken = ():NullableToken => {
    if (this._start === -1 || this._end === -1) return null

    const token = this._lastToken
    if (token === null) return null

    let value:any = this._text.substring(this._start, this._end+ (this._isEnclosedStringActive ? 2 : 1))
    let numVal = Number(value)
    let type = "string"
    token.token = value

    if (SEPARATORS.indexOf(value) >= 0) {
      type = "sep"
    }
    else if(value === DATASEP) {
      type = "datasep"
    }
    else if(!isNaN(numVal)) {
      value = numVal
      type = "number"
    }
    else if( value === "F" || value === "T") {
      value = value === "T"
      type = "boolean"
    }
    else if(value === "N") {
      value = null
      type = "null"
    }
    else {
      // Trim double-quotes
      value = value.toString().replace(/^"(.*)"$/, '$1')
    }

    token.value = value
    token.type = type
    this._tokens.push(token)
    return token
  }

  private next = ():NullableToken => {
    this._col += 1
    const token = this._lastToken
    const index = ++this._index
    let ch = this._text[index]
    let prevCh = index > 0 ? this._text[index-1] : ''
    if (!token) return null // Bypass TS check
    if (!ch) return this.getToken()

    let nextCh = this._text[index+1]
    let nextChCode = nextCh === undefined ? -1 : nextCh.charCodeAt(0)
    let chCode = ch.charCodeAt(0)

    let isWS = chCode <= SPACE
    let isSep = SEPARATORS.indexOf(ch) >= 0
    let isNextSep = SEPARATORS.indexOf(nextCh) >= 0
    let isNextCollSep = nextCh === '~'
    let isNextDataSep = this._text.substring(index+1, index+4) === DATASEP
    let isChar = !isWS && !isSep
    let isNewLine = ch === NEW_LINE

    if (isNewLine) {
      this._row += 1
      this._col = 0
      return this.next() // continue
    }

    // If not whitespace
    if (!isWS) {

      // Processing not started yet!
      if (this._start === -1) {
        this._start = index

        if (!token.col) {
          token.index = this._start
          token.col = this._col
          token.row = this._row
        }
      }

      // Process string encloser (")
      if (ch === STRING_ENCLOSER ) {
        if (this._isEnclosedStringActive) {
          this._isEnclosedStringActive = false
          return this.getToken()
        }
        this._isEnclosedStringActive = true
      }

      this._end = index
    }

    // When the enclosed string is not active
    if (!this._isEnclosedStringActive) {

      // End token when a separator is found
      if ((isNextSep || isSep || isNextDataSep) &&
          this._start !== -1 &&
          this._end !== -1 /* Skip WS */) {
        return this.getToken()
      }

      // Check for data separator
      else if (ch === HYPHEN) {
        let value = this._text.substring(this._start, this._end + 1)
        if (value === DATASEP) {
          return this.getToken()
        }
      }

    }
    return this.next()
  }

}
