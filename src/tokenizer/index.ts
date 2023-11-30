import ErrorCodes from '../errors/io-error-codes';
import SyntaxError from '../errors/io-syntax-error';
import { assertInvalidReach } from '../utils/asserts';
import * as is from './is';
import Literals from './literals';
import Position from './position';
import Symbols from './symbols';
import TokenType from './token-types';
import Token from './tokens';

const regexIntDigit = /^[0-9]+$/;
const regexFloatDigit = /^[0-9.]+$/;
const regexHex = /^[0-9a-fA-F]+$/;
const regexHex4 = /^[0-9a-fA-F]{4}$/;
const regexHex2 = /^[0-9a-fA-F]{2}$/;

const regexOctal = /^[0-7]+$/;
const regexBinary = /^[01]+$/;

const nonDecimalPrefixes = ["x", "X", "c", "C", "b", "B"];

/**
 * Tokenizer for IO format.
 */
class Tokenizer {
  private pos: number = 0; // Current position within the input string
  private input: string = ""; // Input string to tokenize
  private row: number = 1; // Current row within the input string
  private col: number = 1; // Current column within the input string
  private reachedEnd: boolean = false; // True if the end of the input string has been reached, else false

  /**
   * Initialize the tokenizer with an input string.
   * @param {string} input - String to be tokenized.
   */
  constructor(input: string) {
    this.input = input;
  }

  /**
   * Advance the current position and update the row and column accordingly.
   */
  private advance(step: number = 1): void {
    if (this.reachedEnd) {
      return;
    }

    for (let i = 0; i < step; i++) {
      if (this.input[this.pos] === "\n") {
        this.row++;
        this.col = 1; // Reset column to start of the line.
      } else {
        this.col++;
      }
      this.pos++;

      if (this.pos >= this.input.length) {
        this.reachedEnd = true;
        break;
      }
    }
  }

  private parseSingleLineComment(): void {
    while (!this.reachedEnd && this.input[this.pos] !== "\n") {
      this.advance();
    }
  }

  private parseRegularString(encloser: string): Token {
    const start = this.pos;
    const startRow = this.row;
    const startCol = this.col;

    this.advance(); // Move past the opening quotation mark
    let value = "";
    let needToNormalize = false;

    while (!this.reachedEnd && this.input[this.pos] !== encloser) {
      // Check if current character is a backslash (escape character)
      if (this.input[this.pos] === Symbols.BACKSLASH) {
        ({ value, needToNormalize } = this.escapeString(
          value,
          needToNormalize
        ));
      } else {
        value += this.input[this.pos];
      }
      this.advance();
    }

    if (this.reachedEnd) {
      // Handle string not being closed before the end of the input
      throw new SyntaxError(ErrorCodes.stringNotClosed,void 0, this.currentPosition);
    }

    this.advance(); // Move past the closing quotation mark

    const tokenText = this.input.substring(start, this.pos);

    // After building the 'value' string, normalize it:
    if (needToNormalize) {
      value = value.normalize("NFC");
    }

    return Token.init(
      start,
      startRow,
      startCol,
      tokenText,
      value,
      "STRING",
      "REGULAR_STRING"
    );
  }

  private escapeString(value: string, needToNormalize: boolean) {
    this.advance(); // Move past the backslash
    if (this.reachedEnd) {
      throw new SyntaxError(
        ErrorCodes.invalidEscapeSequence,
        void 0, this.currentPosition, true
      )
    }

    switch (this.input[this.pos]) {
      case "b":
        value += "\b";
        break;
      case "f":
        value += "\f";
        break;
      case "n":
        value += "\n";
        break;
      case "r":
        value += "\r";
        break;
      case "t":
        value += "\t";
        break;
      case "u":
        const hex = this.input.substring(this.pos + 1, this.pos + 5);
        if (regexHex4.test(hex)) {
          // /^[0-9a-fA-F]{4}$/
          value += String.fromCharCode(parseInt(hex, 16));
          this.advance(4); // Move past the 4 hex digits
          needToNormalize = true;
        } else {
          throw new SyntaxError(
            ErrorCodes.invalidEscapeSequence,
            hex,this.currentPosition);
        }
        break;
      case "x":
        const hexByte = this.input.substring(this.pos + 1, this.pos + 3);
        if (regexHex2.test(hexByte)) {
          // /^[0-9a-fA-F]{2}$/
          value += String.fromCharCode(parseInt(hexByte, 16));
          this.advance(2); // Move past the 2 hex digits
          needToNormalize = true;
        } else {
          // throw new Error(
          //   `Invalid hex escape sequence \\x${hexByte} at row ${this.row} and column ${this.col}.`
          // );
          new SyntaxError(
            ErrorCodes.invalidEscapeSequence,
            hexByte,this.currentPosition);
        }
        break;
      default:
        value += this.input[this.pos]; // Treat unrecognized escape sequences as the literal character
        break;
    }
    return { value, needToNormalize };
  }

  private get currentPosition(): Position | undefined {
    // if (!this.reachedEnd) {
      return { pos: this.pos, row: this.row, col: this.col };
    // }
  }

  private parseAnotatedString(char: string): Token {
    const start = this.pos;
    const startRow = this.row;
    const startCol = this.col;

    this.advance(); // Move past the 'r' character

    if (this.reachedEnd) {
      throw new Error(
        `Unexpected end of input after '${char}' at row ${startRow} and column ${startCol}.`
      );
    }

    const encloser = this.input[this.pos]; // This should be either ' or "
    if (encloser !== '"' && encloser !== "'") {
      throw new Error(
        `Expected a quotation mark after '${char}' at row ${startRow} and column ${startCol}, but found '${encloser}' instead.`
      );
    }

    this.advance(); // Move past the opening quotation mark
    while (!this.reachedEnd && this.input[this.pos] !== encloser) {
      this.advance();
    }

    if (this.reachedEnd) {
      throw new Error(
        `Raw string starting at row ${startRow} and column ${startCol} is not closed.`
      );
    }

    this.advance(); // Move past the closing quotation mark

    const tokenText = this.input.substring(start, this.pos);
    const value = tokenText.substring(2, tokenText.length - 1); // Extract the inner value

    // Prepare the token
    const token = new Token();
    token.pos = start;
    token.row = startRow;
    token.col = startCol;
    token.token = tokenText;
    token.value = value;
    return token;
  }

  private parseRawString(): Token {
    const token = this.parseAnotatedString("r");
    token.type = TokenType.STRING;
    token.subType = "RAW_STRING";
    return token;
  }

  private parseByteString(): Token {
    const token = this.parseAnotatedString("b");
    token.type = TokenType.BINARY;
    token.subType = "BINARY_STRING";

    // Conver the base64 string to a byte array
    token.value = Buffer.from(token.value, "base64");
    return token;
  }

  private parseDateTime(): Token {
    const token = this.parseAnotatedString("d");

    // Try to parse RFC 3339 date time
    const value = Date.parse(token.value);
    const dt = new Date(value);
    if (isNaN(dt.getTime())) {
      throw new Error(
        `Invalid date time format '${token.value}' at row ${token.row} and column ${token.col}.`
      );
    }

    token.value = dt;
    token.type = TokenType.DATE_TIME;
    token.subType = "RFC3339";

    return token;
  }

  private parseNumber(): Token | null {
    const start: number = this.pos;
    const startRow: number = this.row;
    const startCol: number = this.col;
    let value = "";
    let base = 10; // default is decimal
    let hasDecimal = false;
    let hasExponent = false;
    let subType: string | undefined;

    // Allow for a leading - sign.
    if (this.input[this.pos] === "-") {
      // Check if the next character is a digit.
      if (is.isDigit(this.input[this.pos + 1])) {
        value += this.input[this.pos];
        this.advance();
      } else {
        return null;
      }
    }

    // Allow for a leading + sign.
    if (this.input[this.pos] === "+") {
      value += this.input[this.pos];
      this.advance();
    }

    // Determine the number format
    if (this.input[this.pos] === "0" && nonDecimalPrefixes.includes(this.input[this.pos + 1])) {
      switch (this.input[this.pos + 1]) {
        case "X":
        case "x":
          base = 16; // Hexadecimal
          subType = "HEX";
          value += this.input[this.pos] + this.input[this.pos + 1];
          this.advance(2);
          while (/[0-9a-fA-F]/.test(this.input[this.pos])) {
            value += this.input[this.pos];
            this.advance();
          }
          break;

        case "C":
        case "c":
          base = 8; // Octal
          subType = "OCTAL";
          value += this.input[this.pos] + this.input[this.pos + 1];
          this.advance(2);
          while (/[0-7]/.test(this.input[this.pos])) {
            value += this.input[this.pos];
            this.advance();
          }
          break;

        case "B":
        case "b":
          base = 2; // Binary
          subType = "BINARY";
          value += this.input[this.pos] + this.input[this.pos + 1];
          this.advance(2);
          while (/[01]/.test(this.input[this.pos])) {
            value += this.input[this.pos];
            this.advance();
          }
          break;

        default:
          assertInvalidReach(`Invalid number format '0${this.input[this.pos + 1]}'`);
      }
    } else {
      // Parse whole part
      while (/[0-9]/.test(this.input[this.pos])) {
        value += this.input[this.pos];
        this.advance();
      }

      // Parse decimal point and fractional part
      if (this.input[this.pos] === ".") {
        hasDecimal = true;
        value += ".";
        this.advance();
        while (/[0-9]/.test(this.input[this.pos])) {
          value += this.input[this.pos];
          this.advance();
        }
      }

      // Parse scientific notation (e.g., e10 or E10)
      if (this.input[this.pos] === "e" || this.input[this.pos] === "E") {
        hasExponent = true;
        value += this.input[this.pos];
        this.advance();
        if (this.input[this.pos] === "+" || this.input[this.pos] === "-") {
          value += this.input[this.pos];
          this.advance();
        }
        while (/[0-9]/.test(this.input[this.pos])) {
          value += this.input[this.pos];
          this.advance();
        }
      }
    }

    let numberValue;
    if (base === 10 && (hasDecimal || hasExponent)) {
      numberValue = parseFloat(value);
    } else {
      numberValue = parseInt(value, base);
    }

    return Token.init(
      start,
      startRow,
      startCol,
      value,
      numberValue,
      TokenType.NUMBER,
      subType
    );
  }

  private parseLiteralOrOpenString(): Token {
    const start = this.pos;
    const startRow = this.row;
    const startCol = this.col;

    let value = "";
    let startPos = this.pos;
    let lastPos = this.pos;

    let normalizeString = false;

    while (!this.reachedEnd && is.isValidOpenStringChar(this.input[this.pos])) {
      let char = this.input[this.pos];

      if (char === Symbols.MINUS) {
        // if the next two chars are -- that means it is a
        // section seperator.
        if (this.input.substring(this.pos, this.pos + 3) === "---") {
          break;
        }
      }

      if (char === Symbols.BACKSLASH) {
        ({ value, needToNormalize: normalizeString } = this.escapeString(
          value,
          normalizeString
        ));
        char = this.input[this.pos];
      } else {
        value += char;
      }

      if (!is.isWhitespace(char)) {
        lastPos = this.pos;
      }

      this.advance();
    }

    if (normalizeString) {
      value = value.normalize("NFC");
    }

    value = this.input.substring(startPos, lastPos + 1);

    if (value === "") {
      throw new Error(
        `Unexpected character '${
          this.input[this.pos]
        }' at row ${startRow} and column ${startCol}.`
      );
    }

    switch (value) {
      case Literals.TRUE:
      case Literals.T:
        return Token.init(
          start,
          startRow,
          startCol,
          value,
          true,
          TokenType.BOOLEAN
        );

      case Literals.FALSE:
      case Literals.F:
        return Token.init(
          start,
          startRow,
          startCol,
          value,
          false,
          TokenType.BOOLEAN
        );

      case Literals.NULL:
      case Literals.N:
        return Token.init(
          start,
          startRow,
          startCol,
          value,
          null,
          TokenType.NULL
        );

      default:
        return Token.init(
          start,
          startRow,
          startCol,
          value,
          value,
          TokenType.STRING,
          "OPEN_STRING"
        );
    }
  }

  /**
   * Merges the two tokens into one token. This is used to merge the
   * tokens detected by various tokenizer functions.
   */
  private mergeTokens(
    first:Token, second:Token): Token {
    const token = new Token();
    token.pos = first.pos;
    token.row = first.row;
    token.col = first.col;
    token.token = first.token + second.token;
    token.value = first.value.toString() + second.value.toString();
    token.type = second.type;
    token.subType = second.subType;
    return token;
    }

  /**
   * Tokenize the input string.
   * @returns {Token[]} Array of parsed tokens.
   */
  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];

      // Whitespaces
      if (is.isWhitespace(char)) {
        // Skip over the whitespace
        this.advance();
      }

      // Single-line comments
      else if (char === Symbols.HASH) {
        this.parseSingleLineComment();
      }

      // Regular strings
      else if (char === Symbols.DOUBLE_QUOTE || char === Symbols.SINGLE_QUOTE) {
        tokens.push(this.parseRegularString(char));
      }

      // Raw strings (e.g., r'foo' or r"foo")
      else if (
        char === Symbols.R &&
        (this.input[this.pos + 1] === Symbols.DOUBLE_QUOTE ||
          this.input[this.pos + 1] === Symbols.SINGLE_QUOTE)
      ) {
        tokens.push(this.parseRawString());
      }

      // Datetime strings (e.g., d'2023-09-27')
      else if (
        char === Symbols.D &&
        (this.input[this.pos + 1] === Symbols.DOUBLE_QUOTE ||
          this.input[this.pos + 1] === Symbols.SINGLE_QUOTE)
      ) {
        tokens.push(this.parseDateTime());
      }

      // Byte strings (e.g., b'foo' or b"foo")
      else if (
        char === Symbols.B &&
        (this.input[this.pos + 1] === Symbols.DOUBLE_QUOTE ||
          this.input[this.pos + 1] === Symbols.SINGLE_QUOTE)
      ) {
        tokens.push(this.parseByteString());
      }

      // Special symbols (e.g., curly braces, brackets, etc.)
      else if (is.isSpecialSymbol(char)) {
        const startRow = this.row;
        const startCol = this.col;
        tokens.push(
          Token.init(
            this.pos,
            startRow,
            startCol,
            char,
            char,
            is.getSymbolTokenType(char)
          )
        );
        this.advance();
      }

      // Numbers
      else if (
        char === Symbols.PLUS ||
        char === Symbols.MINUS ||
        is.isDigit(char)
      ) {
        // Check if it is a SECTION_SEP ---
        if (char === Symbols.MINUS) {
          // If the next two chars are -- that means it is a
          // data seperator.
          if (this.input.substring(this.pos, this.pos + 3) === "---") {
            tokens.push(
              Token.init(
                this.pos,
                this.row,
                this.col,
                "---",
                "---",
                TokenType.SECTION_SEP
              )
            );
            this.advance(3);
            continue;
          }
        }

        const token = this.parseNumber();
        if (token) {
          // If the next character (2abc) is not a symbol or whitespace, then
          // it must be a literal or open string. Parse it and merge it
          // with the number token.
          if (
            !is.isSpecialSymbol(this.input[this.pos]) &&
            !is.isWhitespace(this.input[this.pos])
          ) {
            const nextToken = this.parseLiteralOrOpenString();
            tokens.push(this.mergeTokens(token, nextToken));
          } else {
            tokens.push(token);
          }

        } else {
          // It wasn't a number, so it must be a literal or open string
          tokens.push(this.parseLiteralOrOpenString());
        }
      }

      // Literals or open strings
      else {
        tokens.push(this.parseLiteralOrOpenString());
      }
    }

    return tokens;
  }
}

export default Tokenizer;
