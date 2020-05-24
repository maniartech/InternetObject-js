import {
  DATASEP,
  HYPHEN,
  NEW_LINE,
  SEPARATORS,
  SPACE,
  STRING_ENCLOSER,
  QUOTE,
  TILDE,
  BACKSLASH,
  HASH,
  AT,
  TRUE,
  TRUE_F,
  FALSE,
  FALSE_F,
  NULL,
  NULL_F
} from './constants'
import { Token } from '.'
import ErrorCodes from '../errors/io-error-codes'
import { InternetObjectSyntaxError } from '../errors/io-error'
import { isUndefined } from '../utils/is'

type NullableToken = Token | null

const escapeCharMap: any = {
  '\\': '\\',
  '/': '/',
  '"': '"',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t'
}

export default class Tokenizer {
  private _text: string
  private _tokens: Token[] = []

  // Status
  private _value = ''
  private _lastToken: NullableToken = null
  private _tokenLength = 0
  private _done: boolean = false

  // Positions
  private _index: number = -1
  private _row: number = 1
  private _col: number = 0
  private _start: number = -1
  private _end: number = -1

  // Flags
  private _isQuoatedString: boolean = false
  private _isRawString: boolean = false
  private _isEscaping = false
  private _isCommenting = false

  public constructor(text: string) {
    this._text = text
  }

  public read = (): NullableToken => {
    if (this.done) return null

    const text = this._text
    this._lastToken = {} as Token
    this._value = ''
    this._start = -1
    this._end = -1
    this._tokenLength = 0
    this._isQuoatedString = false
    const token = this._next()

    // No character has found while reading the token yet
    if (this._done && token !== null && isUndefined(token.col)) {
      return null
    }
    return token
  }

  public readAll = () => {
    // let token = this.read()
    while (!this._done) {
      this.read()
    }
    return this
  }

  public get done(): boolean {
    return this._done
  }

  public get length(): number {
    return this._tokens.length
  }

  public push = (...items: Token[]): Tokenizer => {
    this._tokens.push(...items)
    return this
  }

  public get tokens() {
    return this._tokens
  }

  public get(index: number): Token {
    return this._tokens[index]
  }

  private _returnToken = (): NullableToken => {
    const token = this._lastToken
    if (token === null) return null

    // if (this._start === -1 || this._end === -1) return null

    let type = 'string'
    let value: any = this._value
    token.token = this._text.substring(this._start, this._end + (this._isQuoatedString ? 1 : 1))

    // console.log(JSON.stringify(token.token, null, 2), value)
    // const confirmedString = token.token.endsWith(STRING_ENCLOSER) || token.token.endsWith(QUOTE)

    // Trim the white spaces only when the strings does not ends with
    // the string encloser.
    // if (!confirmedString) {
    //   value = this._value.trim()
    // }

    // Process quoted string
    if (token.token.startsWith(STRING_ENCLOSER)) {
      if (!token.token.endsWith(STRING_ENCLOSER)) {
        throw new InternetObjectSyntaxError(
          ErrorCodes.stringNotClosed,
          'String not closed, expecting " at the end of the string.',
          token
        )
      }
    }
    // Process raw string
    else if (token.token.startsWith(QUOTE)) {
      if (!token.token.endsWith(QUOTE)) {
        throw new InternetObjectSyntaxError(
          ErrorCodes.stringNotClosed,
          "String not closed, expecting ' at the end of the string.",
          token
        )
      }
    } else if (token.token.startsWith(HASH)) {
      type = 'comment'
      value = value.substr(1).trim()
    }
    // Process open string
    else {
      // console.warn(">>>", JSON.stringify(token.token), JSON.stringify(value))
      // value = token.token.trim() // Trim surrounding whitespaces
      value = value.trim()
      let numVal = Number(value)

      if (SEPARATORS.indexOf(value) >= 0 || value === TILDE) {
        type = 'sep'
      } else if (value === DATASEP) {
        type = 'datasep'
      }
      // When validating isNaN, check value is not a blank ''.
      // When the value is blank, Number(value) will set the numVal to 0
      else if (!isNaN(numVal) && value.trim() !== '') {
        value = numVal
        type = 'number'
      } else if (value === TRUE || value === TRUE_F) {
        value = true
        type = 'boolean'
      } else if (value === FALSE || value === FALSE_F) {
        value = false
        type = 'boolean'
      } else if (value === NULL || value === NULL_F) {
        value = null
        type = 'null'
      }
    }

    token.value = value
    token.type = type

    this._tokens.push(token)
    this.skipNextWhiteSpaces()
    return token
  }

  private _next = (): NullableToken => {
    // Advance the step
    this._col += 1
    const index = ++this._index

    // Return token when text ends
    let ch = this._text[index]
    let nextCh = this._text[index + 1]

    // Identify char types
    let isWS = ch <= SPACE // Is white space or control char
    let isNewLine = ch === NEW_LINE // Is new line
    let isNextNewLine = nextCh === NEW_LINE

    let isSep = SEPARATORS.indexOf(ch) >= 0 // Is separator
    let isNextSep = SEPARATORS.indexOf(nextCh) >= 0

    const isCollectionSep = ch === TILDE
    let isNextCollectionSep = nextCh === TILDE

    const isStarted = this._start !== -1

    const isDataSep = this._text.substr(index - 2, 3) === DATASEP
    let isNextDataSep = this._text.substr(index + 1, 3) === DATASEP

    if (isUndefined(ch)) {
      // Throw and error when escaping is not closed on last char
      if (this._isEscaping) {
        throw new InternetObjectSyntaxError(
          ErrorCodes.incompleteEscapeSequence,
          'End of the text reached before finishing the escape sequence.'
        )
      }

      this._done = true
      return this._returnToken()
    }

    // console.log("###", this._isCommenting, ch)
    // While the comment mode is active!
    if (this._isCommenting) {
      this._end = index
      this._value += ch

      // Comment mode ends with new line, hence, turn it off when
      // a new line char is encountered.
      if (isNextNewLine) {
        this._isCommenting = false
        return this._returnToken()
      }
      this._tokenLength += 1
      return this._next()
    }

    const token = this._lastToken

    if (!token) return null // Bypass TS check

    // Handle white-spaces
    if (isWS) {
      // Normalize newline to \n char when other newline modes such as '\r\n' & '\r' found
      if (ch === '\r') {
        // Ignore current \r when a newline found in \r\n pair
        if (nextCh === '\n') {
          return this._next()
        }
        ch = '\n' // Else replace \r wit= '\n' // Else replace \r with \n
        isNewLine = true
      }

      if (this._tokenLength > 0) this._value += ch

      // Update values in case of new line
      if (isNewLine) {
        this._row += 1
        this._col = 0
      }

      if (!this._isQuoatedString && !this._isRawString && isStarted) {
        if (isNextSep || isNextCollectionSep || isNextDataSep) {
          if (this._col === 0) this._col = 1
          return this._returnToken()
        } else if (nextCh === HASH) {
          // this._isCommenting = true
          return this._returnToken()
        }
      }

      return this._next()
    }

    // // See if whitespace is escaped! Such as " \n  \t \n "
    // if (this._start === -1 && this._isRawString === false) {
    //   if(ch === BACKSLASH) {
    //   }

    // }

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

    // Process the first char
    if (this._tokenLength === 1) {
      // Start raw string when @" is found
      // if (ch === AT && nextCh === STRING_ENCLOSER) {
      //   this._isRawString = true
      //   return this._next()
      // }
      // Start a raw string when ' is found
      if (ch === QUOTE) {
        this._isRawString = true
        return this._next()
      }
      // When the " is encountered at first char,
      // activate enclosed string mode
      else if (ch === STRING_ENCLOSER) {
        this._isQuoatedString = true
        return this._next()
      }
    }

    // Handle Regular Strings
    if (this._isQuoatedString) {
      if (ch === STRING_ENCLOSER) {
        // Start the string
        // if (this._tokenLength === 1) {
        //   this._isQuoatedString = true
        //   return this._next()
        // }

        // End the string
        if (this._isEscaping === false) {
          this._isQuoatedString = false
          return this._returnToken()
        }
      }

      // Handle string escapes when not a raw string
      if (ch === BACKSLASH && this._isEscaping === false) {
        this._isEscaping = true
        return this._next()
      }

      // When escaping, escape next char!
      if (this._isEscaping) {
        this._isEscaping = false
        this._value += ch in escapeCharMap ? escapeCharMap[ch] : ch
        return this._next()
      }
    }

    // Handle Raw Strings
    if (this._isRawString) {
      if (ch === QUOTE) {
        // Start the string
        // if (this._tokenLength === 1) {
        //   this._isRawString = true
        //   return this._next()
        // }

        // When the first of two consicutive '' are found in the raw string,
        // activate escaping mode and skip to the next char
        if (this._isEscaping === false && nextCh === QUOTE) {
          this._isEscaping = true
          return this._next()
        }

        // When the second of '' are found during escaping mode, just add the signle `
        if (this._isEscaping) {
          this._isEscaping = false
          this._value += "'"
          return this._next()
        }

        // End the string
        if (this._isEscaping === false) {
          this._isRawString = false
          return this._returnToken()
        }
      }
      this._value += ch
      return this._next()
    }

    // Character processing during open mode!
    if (!this._isQuoatedString && !this._isRawString) {
      // Initiate the commenting mode when
      if (nextCh === HASH) {
        this._isCommenting = true
        return this._returnToken()
      }

      if (ch === HASH) {
        this._isCommenting = true
        this._value += ch
        return this._next()
      }

      if (isSep || isNextSep || isCollectionSep || isNextCollectionSep) {
        this._value += ch
        return this._returnToken()
      }

      // Check for data separator
      else if (ch === HYPHEN) {
        // let value = this._text.substring(this._start, this._end + 1)
        if (isDataSep) {
          this._value = '---'
          return this._returnToken()
        }
      }
    }

    this._value += ch
    return this._next()
  }

  private skipNextWhiteSpaces() {
    const ch = this._text[this._index + 1]

    // console.log("wow", ch, this._text.length, this._index)

    // Return token when text ends
    if (isUndefined(ch)) {
      this._done = true
      return
    }

    // If next ch is not ws, return
    if (ch > SPACE) return

    // Advance the step
    this._col += 1
    ++this._index

    if (this._tokenLength > 0) this._value += ch

    // Update values in case of new line
    if (ch === NEW_LINE) {
      this._row += 1
      this._col = 0
    }
    this.skipNextWhiteSpaces()
  }

  private get _node() {
    return {
      index: this._index,
      row: this._row,
      col: this._col
    }
  }
}
