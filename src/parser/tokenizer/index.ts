import assertNever      from '../../errors/asserts/asserts';
import ErrorCodes       from '../../errors/io-error-codes';
import SyntaxError      from '../../errors/io-syntax-error';
import * as dtParser    from '../../utils/datetime';
import * as is          from './is';
import Literals         from './literals';
import Position         from '../../core/position';
import Symbols          from './symbols';
import TokenType        from './token-types';
import Token            from './tokens';
import PositionRange    from '../../core/position-range';
import Decimal          from '../../core/decimal';

const regexHex4 = /^[0-9a-fA-F]{4}$/;
const regexHex2 = /^[0-9a-fA-F]{2}$/;
const reFloatDigit = /^[0-9.]+$/;

const reIntDigit = /^[0-9]+$/;
const reHex = /^[0-9a-fA-F]+$/;
const reOctal = /^[0-7]+$/;
const reBinary = /^[01]+$/;

// https://regex101.com/r/HOVtCj/1
// const reSectionSchemaName = /^(?<schema>\$[\p{L}\p{M}\p{N}\-_]+)(?:[ \t]*:[ \t]*(?<name>[\p{L}\p{M}\p{N}\-_]+))?/u;

// https://regex101.com/r/jaWr0V/2
const reSectionSchemaName = /^(?:(?:(?<name>[\p{L}\p{M}\p{N}\-_]+)(?<sep>[ \t]*:[ \t]*)?)(?<schema>\$[\p{L}\p{M}\p{N}\-_]+)?|(?<schema2>\$[\p{L}\p{M}\p{N}\-_]+))/u

const nonDecimalPrefixes = ["x", "X", "o", "O", "b", "B"];
const reAnotatedStrStart = /^(?<name>[a-zA-Z]{1,4})(?<quote>['"])/;

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
      if (is.isWhitespace(this.input[this.pos])) {
        value += this.skipWhitespaces();
        continue;
      }

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
          throw new SyntaxError(
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

  private get currentPosition(): PositionRange {
    const getPos = () => {
      return {
        pos: this.pos,
        row: this.row,
        col: this.col
      }
    }

    return {
      getStartPos: getPos,
      getEndPos: getPos
    };
  }


  private checkIfAnotatedString(): Annotation | null {
    // Annotated strings starts with a letter and can have a maximum of 4 letters
    // followed by a quotation mark (single or double).
    const match = reAnotatedStrStart.exec(this.input.substring(this.pos, this.pos + 5));
    if (!match) {
      return null;
    }

    return match.groups as Annotation;
  }

  private parseAnotatedString(annotation: Annotation): Token {
    const start    = this.pos;
    const startRow = this.row;
    const startCol = this.col;

    // Skip over the annotation characters
    for (let i = 0; i < annotation.name.length; i++) {
      this.advance();
    }

    if (this.reachedEnd) {
      assertNever(this.input[this.pos]);
    }

    this.advance(); // Move past the opening quotation mark
    while (!this.reachedEnd && this.input[this.pos] !== annotation.quote) {
      this.advance();
    }

    if (this.reachedEnd) {
      throw new SyntaxError(ErrorCodes.stringNotClosed,void 0, this.currentPosition);
    }

    this.advance(); // Move past the closing quotation mark

    const tokenText = this.input.substring(start, this.pos);
    const value = tokenText.substring(annotation.name.length + 1, tokenText.length - 1); // Extract the inner value

    // Prepare the token
    const token = new Token();
    token.pos   = start;
    token.row   = startRow;
    token.col   = startCol;
    token.token = tokenText;
    token.value = value;

    return token;
  }

  private parseRawString(annotation: Annotation): Token {
    const token = this.parseAnotatedString(annotation);
    token.type = TokenType.STRING;
    token.subType = "RAW_STRING";
    return token;
  }

  private parseByteString(annotation: Annotation): Token {
    const token = this.parseAnotatedString(annotation);
    token.type = TokenType.BINARY;
    token.subType = "BINARY_STRING";

    // Conver the base64 string to a byte array
    token.value = Buffer.from(token.value, "base64");
    return token;
  }

  private parseDateTime(annotation:Annotation): Token {
    const token = this.parseAnotatedString(annotation);
    let fn = (value: string): Date | null => null

    switch (annotation.name) {
      case "dt":
        fn = dtParser.parseDateTime;
        token.subType = TokenType.DATETIME
        break;
      case "d":
        fn = dtParser.parseDate;
        token.subType = TokenType.DATE
        break;
      case "t":
        fn = dtParser.parseTime;
        token.subType = TokenType.TIME
        break;
      default:
      assertNever(annotation);
    }

    const dt = fn(token.value);
    if (!dt) {
      throw new SyntaxError(ErrorCodes.invalidDateTime, token.value, token);
    }

    token.value = dt;
    token.type = TokenType.DATETIME;
    return token;
  }

  private parseNumber(): Token | null {
      const start = this.pos;
      const startRow = this.row;
      const startCol = this.col;
      let rawValue = "";
      let base = 10; // default is decimal
      let hasDecimal = false;
      let hasExponent = false;
      let prefix = "";
      let subType: string | undefined;

      // Check if current position points to a plus or minus sign.
      if (this.input[this.pos] === "+" || this.input[this.pos] === "-") {
          const sign = this.input[this.pos];
          // If sign is followed by "Inf", handle infinite literal.
          if (this.input.startsWith("Inf", this.pos + 1)) {
              const infLiteral = sign + "Inf";
              this.advance(4); // sign + "Inf"
              return Token.init(
                  start,
                  startRow,
                  startCol,
                  infLiteral,
                  sign === "+" ? Infinity : -Infinity,
                  TokenType.NUMBER
              );
          }
          // Otherwise, allow sign only if immediately followed by a digit or dot.
          if (is.isDigit(this.input[this.pos + 1]) || this.input[this.pos + 1] === ".") {
              rawValue += sign;
              this.advance();
          } else {
              return null;
          }
      }
      // Also support an Inf literal without a sign.
      else if (this.input.startsWith("Inf", this.pos)) {
          const infLiteral = "Inf";
          this.advance(3);
          return Token.init(
              start,
              startRow,
              startCol,
              infLiteral,
              Infinity,
              TokenType.NUMBER
          );
      }

      if (this.input[this.pos] === ".") {
          // If there is a dot, ensure it is followed by a digit.
          if (!reFloatDigit.test(this.input[this.pos + 1])) {
              return null;
          }
      }

      // Determine the number format
      if (this.input[this.pos] === "0" && nonDecimalPrefixes.includes(this.input[this.pos + 1])) {
          switch (this.input[this.pos + 1]) {
              case "X":
              case "x":
                  base = 16;
                  subType = "HEX";
                  prefix = this.input[this.pos] + this.input[this.pos + 1];
                  this.advance(2);
                  while (reHex.test(this.input[this.pos])) {
                      rawValue += this.input[this.pos];
                      this.advance();
                  }
                  break;

              case "O":
              case "o":
                  base = 8;
                  subType = "OCTAL";
                  prefix = this.input[this.pos] + this.input[this.pos + 1];
                  this.advance(2);
                  while (reOctal.test(this.input[this.pos])) {
                      rawValue += this.input[this.pos];
                      this.advance();
                  }
                  break;

              case "B":
              case "b":
                  base = 2;
                  subType = "BINARY";
                  prefix = this.input[this.pos] + this.input[this.pos + 1];
                  this.advance(2);
                  while (reBinary.test(this.input[this.pos])) {
                      rawValue += this.input[this.pos];
                      this.advance();
                  }
                  break;
              default:
                  assertNever(this.input[this.pos + 1]);
          }
      } else {
          // Parse whole part
          while (reIntDigit.test(this.input[this.pos])) {
              rawValue += this.input[this.pos];
              this.advance();
          }

          // Parse decimal point and fractional part
          if (this.input[this.pos] === ".") {
              hasDecimal = true;
              rawValue += ".";
              this.advance();
              while (reIntDigit.test(this.input[this.pos])) {
                  rawValue += this.input[this.pos];
                  this.advance();
              }
          }

          // Parse scientific notation (e.g., e10 or E10)
          if (this.input[this.pos] === "e" || this.input[this.pos] === "E") {
              hasExponent = true;
              rawValue += this.input[this.pos];
              this.advance();
              if (this.input[this.pos] === "+" || this.input[this.pos] === "-") {
                  rawValue += this.input[this.pos];
                  this.advance();
              }
              while (reIntDigit.test(this.input[this.pos])) {
                  rawValue += this.input[this.pos];
                  this.advance();
              }
          }
      }

      let tokenType = TokenType.NUMBER;
      let numberValue: number | bigint | Decimal;

      // if the next char is 'n', then it is a BigInt literal
      if (this.input[this.pos] === "n") {
          tokenType = TokenType.BIGINT;
          numberValue = BigInt(prefix + rawValue);
          rawValue += "n";
          this.advance();
      } else if (this.input[this.pos] === "m") {
          // Decimal literal
          tokenType = TokenType.DECIMAL;
          numberValue = new Decimal(rawValue);
          rawValue += "f";
          this.advance();
      } else {
          if (base === 10 && (hasDecimal || hasExponent)) {
              numberValue = parseFloat(rawValue);
          } else {
              numberValue = parseInt(rawValue, base);
              if (isNaN(numberValue as number)) {
                  assertNever("Expected a number but got NaN", this.currentPosition.getStartPos());
              }
          }
      }

      return Token.init(
          start,
          startRow,
          startCol,
          prefix + rawValue,
          numberValue,
          tokenType,
          subType
      );
  }

  private parseLiteralOrOpenString(): Token | null {
    const start = this.pos;
    const startRow = this.row;
    const startCol = this.col;

    let value = "";
    let normalizeString = false;

    while (!this.reachedEnd && is.isValidOpenStringChar(this.input[this.pos])) {
      let char = this.input[this.pos];

      if (is.isWhitespace(char)) {
        value += this.skipWhitespaces();
        continue;
      }

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
      this.advance();
    }

    value = value.trimEnd();

    if (normalizeString) {
      value = value.normalize("NFC");
    }

    if (value === "") {
      return null
      // assertNever(this.input[this.pos])
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
      case Literals.Inf:
      case Literals.NaN:
        return Token.init(
          start,
          startRow,
          startCol,
          value,
          value === Literals.Inf ? Infinity : NaN,
          TokenType.NUMBER
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
      token.value = first.token + second.value.toString();
      token.type = second.type;
      token.subType = second.subType;
      return token;
    }

  /**
   * Skip over any whitespaces and return them as a string.
   * @returns {string} The skipped whitespaces.
   */
  private skipWhitespaces(hspacesOnly:boolean = false):string {
    let spaces = '';
    while (!this.reachedEnd && is.isWhitespace(this.input[this.pos], hspacesOnly)) {
      const space = this.input[this.pos];
      // replace \r\n or \r with \n. This behavior is configurable
      // with the normalizeNewline option
      if (space === '\r') {
        if (this.input[this.pos + 1] === '\n') {
          this.advance();
        }
        spaces += '\n';
      } else {
        spaces += space;
      }
      this.advance();
    }

    return spaces;
  }

  /**
   * Tokenize the input string.
   * @returns {Token[]} Array of parsed tokens.
   */
  public tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.input.length) {
      const ch = this.input[this.pos];

      // Whitespaces
      if (is.isWhitespace(ch)) {
        // Skip over the whitespace
        this.advance();
        continue;
      }

      // Single-line comments
      else if (ch === Symbols.HASH) {
        this.parseSingleLineComment();
      }

      // Regular strings
      else if (ch === Symbols.DOUBLE_QUOTE || ch === Symbols.SINGLE_QUOTE) {
        tokens.push(this.parseRegularString(ch));
      }

      // Special symbols (e.g., curly braces, brackets, etc.)
      else if (is.isSpecialSymbol(ch)) {
        const startRow = this.row;
        const startCol = this.col;
        tokens.push(
          Token.init(
            this.pos,
            startRow,
            startCol,
            ch,
            ch,
            is.getSymbolTokenType(ch)
          )
        );
        this.advance();
      }

      // Numbers
      else if (ch === Symbols.PLUS || ch === Symbols.MINUS || ch === Symbols.DOT ||is.isDigit(ch)) {
        // Check if it is a SECTION_SEP ---
        if (ch === Symbols.MINUS) {
          // If the next two chars are -- that means it is a
          // data seperator.
          if (this.input.substring(this.pos, this.pos + 3) === "---") {
            this.parseSectionSeparator(tokens);
            continue;
          }
        }

        const token = this.parseNumber();

        if (token) {
          const spaces = this.skipWhitespaces();
          if (!this.reachedEnd) {
            // If the next character (2abc) is not a symbol or whitespace, then
            // it must be a literal or open string. Parse it and merge it
            // with the number token.
            if (
              !is.isSpecialSymbol(this.input[this.pos]) &&
              !is.isWhitespace(this.input[this.pos])
            ) {
              const nextToken = this.parseLiteralOrOpenString();
              if (nextToken) {
                nextToken.type = TokenType.STRING;
                nextToken.subType = "OPEN_STRING";
                if (spaces.length > 0) {
                  nextToken.token = spaces + nextToken.token;
                  nextToken.value = spaces + nextToken.value;
                }
                tokens.push(this.mergeTokens(token, nextToken));
              } else {
                tokens.push(token);
              }
            } else {
              tokens.push(token);
            }
          } else {
            tokens.push(token);
          }
        } else {
          // It wasn't a number, so it must be a literal or open string
          const token = this.parseLiteralOrOpenString();
          if (token) {
            tokens.push(token);
          }
        }
      }

      // Literals or open strings
      else {
        const annotation = this.checkIfAnotatedString();
        if (annotation) {
          switch (annotation.name) {
            case "r":
              tokens.push(this.parseRawString(annotation));
              break;

            case "b":
              tokens.push(this.parseByteString(annotation));
              break;

            case "d":
            case "dt":
            case "t":
              tokens.push(this.parseDateTime(annotation));
              break;

            default:
              throw new SyntaxError(ErrorCodes.unsupportedAnnotation, `The annotation '${annotation.name}' is not supported`, this.currentPosition);
          }
        } else {
          const token = this.parseLiteralOrOpenString();
          if (token) {
            tokens.push(token);
          }
        }
      }
    }

    return tokens;
  }

  private parseSectionSeparator(tokens: Token[]) {
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
    this.advance(3); // Advance past the "---"
    this.skipWhitespaces(true);

    const match = reSectionSchemaName.exec(this.input.substring(this.pos));

    if (match) {
      let schema: string | undefined;
      let name: string | undefined;
      let sep = match.groups?.sep;
      let schema2: string | undefined;

      if (match.groups) {
        schema = match.groups.schema;
        name = match.groups.name;
        schema2 = match.groups.schema2;
      }


      // When only a schema is provided, the schema is the name
      if (schema2) {
        tokens.push(
            Token.init(
                this.pos,
                this.row,
                this.col,
                schema2,
                schema2,
                TokenType.STRING,
                TokenType.SECTION_SCHEMA
            )
        );
        this.advance(schema2.length);
        this.skipWhitespaces(true);
      } else if (name) {
        tokens.push(
            Token.init(
                this.pos,
                this.row,
                this.col,
                name,
                name,
                TokenType.STRING,
                TokenType.SECTION_NAME
            )
        );
        this.advance(name.length);
        this.skipWhitespaces(true);

        if (sep) {
          // skip over the separator when it is present
          this.advance(sep.length);
          this.skipWhitespaces(true);

          // Once the sep is detected, the schema must be present
          if (!schema) {
            throw new SyntaxError(ErrorCodes.schemaMissing, void 0, this.currentPosition);
          }

          tokens.push(
            Token.init(
              this.pos,
              this.row,
              this.col,
              schema,
              schema,
              TokenType.STRING,
              TokenType.SECTION_SCHEMA
            )
          );
          this.advance(schema.length);
          this.skipWhitespaces(true);
        }
      }
    }
  }
}

type Annotation = {
  name: string;
  quote: string;
}

export default Tokenizer;
