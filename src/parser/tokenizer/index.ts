import Decimal        from '../../core/decimal/decimal';
import PositionRange  from '../../core/positions';
import assertNever    from '../../errors/asserts/asserts';
import ErrorCodes     from '../../errors/io-error-codes';
import SyntaxError    from '../../errors/io-syntax-error';
import { unclosedConstructRange, createPosition } from '../../errors/error-range-utils';
import * as dtParser  from '../../utils/datetime';
import { fromBase64 } from '../../utils/base64'
import * as is        from './is';
import { CHAR_CODES, isDigitCode, isWhitespaceCode } from './is';
import Literals       from './literals';
import Symbols        from './symbols';
import TokenType      from './token-types';
import Token, { TokenErrorValue, isIOError } from './tokens';

// Cached regex patterns for performance optimization
const REGEX_CACHE = {
  hex4: /^[0-9a-fA-F]{4}$/,
  hex2: /^[0-9a-fA-F]{2}$/,
  floatDigit: /^[0-9.]+$/,
  intDigit: /^[0-9]+$/,
  hex: /^[0-9a-fA-F]+$/,
  octal: /^[0-7]+$/,
  binary: /^[01]+$/,
  sectionSchemaName: /^(?:(?:(?<name>[\p{L}\p{M}\p{N}\-_]+)(?<sep>[ \t]*:[ \t]*)?)(?<schema>\$[\p{L}\p{M}\p{N}\-_]+)?|(?<schema2>\$[\p{L}\p{M}\p{N}\-_]+))/u,
  annotatedStrStart: /^(?<name>[a-zA-Z]{1,4})(?<quote>['"])/,
  base64: /^[A-Za-z0-9+/]*={0,2}$/
} as const;

// Fast hex digit checking using character codes (only used in tokenizer)
const isHexDigitCode = (charCode: number): boolean =>
  isDigitCode(charCode) ||
  (charCode >= CHAR_CODES.A_UPPER && charCode <= CHAR_CODES.F_UPPER) ||
  (charCode >= CHAR_CODES.A_LOWER && charCode <= CHAR_CODES.F_LOWER);

const regexHex4 = REGEX_CACHE.hex4;
const regexHex2 = REGEX_CACHE.hex2;
const reFloatDigit = REGEX_CACHE.floatDigit;
const reIntDigit = REGEX_CACHE.intDigit;
const reHex = REGEX_CACHE.hex;
const reOctal = REGEX_CACHE.octal;
const reBinary = REGEX_CACHE.binary;

// https://regex101.com/r/HOVtCj/1
// const reSectionSchemaName = /^(?<schema>\$[\p{L}\p{M}\p{N}\-_]+)(?:[ \t]*:[ \t]*(?<name>[\p{L}\p{M}\p{N}\-_]+))?/u;

// https://regex101.com/r/jaWr0V/2
// Cached constants for performance
const NON_DECIMAL_PREFIXES = ["x", "X", "o", "O", "b", "B"] as const;

const reSectionSchemaName = REGEX_CACHE.sectionSchemaName;
const nonDecimalPrefixes = NON_DECIMAL_PREFIXES;
const reAnotatedStrStart = REGEX_CACHE.annotatedStrStart;

/**
 * Tokenizer for IO format.
 */
class Tokenizer {
  private pos: number = 0; // Current position within the input string
  private input: string = ""; // Input string to tokenize
  private row: number = 1; // Current row within the input string
  private col: number = 1; // Current column within the input string
  private reachedEnd: boolean = false; // True if the end of the input string has been reached, else false
  private inputLength: number = 0; // Cache input length for performance

  /**
   * Initialize the tokenizer with an input string.
   * @param input - String to be tokenized.
   */
  constructor(input: string) {
    this.input = input;
    this.inputLength = input.length; // Cache length for performance
  }

  /**
   * Fast character checking for special symbols using character codes
   */
  private isSpecialSymbolFast(charCode: number): boolean {
    return charCode === CHAR_CODES.CURLY_OPEN || charCode === CHAR_CODES.CURLY_CLOSE ||
      charCode === CHAR_CODES.BRACKET_OPEN || charCode === CHAR_CODES.BRACKET_CLOSE ||
      charCode === CHAR_CODES.COMMA || charCode === CHAR_CODES.COLON ||
      charCode === CHAR_CODES.TILDE;
  }

  /**
   * Fast token type lookup for special symbols using character codes
   */
  private getSymbolTokenTypeFast(charCode: number): string {
    switch (charCode) {
      case CHAR_CODES.CURLY_OPEN: return TokenType.CURLY_OPEN;
      case CHAR_CODES.CURLY_CLOSE: return TokenType.CURLY_CLOSE;
      case CHAR_CODES.BRACKET_OPEN: return TokenType.BRACKET_OPEN;
      case CHAR_CODES.BRACKET_CLOSE: return TokenType.BRACKET_CLOSE;
      case CHAR_CODES.COMMA: return TokenType.COMMA;
      case CHAR_CODES.COLON: return TokenType.COLON;
      case CHAR_CODES.TILDE: return TokenType.COLLECTION_START;
      default: return TokenType.UNKNOWN;
    }
  }

  /**
   * Create an error token for invalid input and continue tokenizing.
   * @param error - The error that occurred
   * @param startPos - Starting position of the invalid token
   * @param startRow - Starting row of the invalid token
   * @param startCol - Starting column of the invalid token
   * @param tokenText - The invalid token text
   */
  private createErrorToken(error: Error, startPos: number, startRow: number, startCol: number, tokenText: string): Token {
    const errorValue: TokenErrorValue = {
      __error: true,
      message: error.message,
      originalError: error
    };

    // Extract errorCode from IOError instances for typed error handling
    if (isIOError(error)) {
      errorValue.errorCode = error.errorCode;
    }

    return Token.init(
      startPos,
      startRow,
      startCol,
      tokenText,
      errorValue,
      TokenType.ERROR
    );
  }

  /**
   * Skip to the next valid token boundary after an error.
   * This helps recover from parsing errors by advancing to a safe position.
   */
  private skipToNextTokenBoundary(): void {
    // Skip characters until we find a delimiter, whitespace, or special symbol
    while (!this.reachedEnd &&
      !is.isWhitespace(this.input[this.pos]) &&
      !is.isSpecialSymbol(this.input[this.pos]) &&
      this.input[this.pos] !== ',' &&
      this.input[this.pos] !== '\n') {
      this.advance();
    }
  }

  /**
   * Advance the current position and update the row and column accordingly.
   */
  private advance(step: number = 1): void {
    if (this.reachedEnd) {
      return;
    }

    // Optimize for single step (most common case)
    if (step === 1) {
      if (this.input.charCodeAt(this.pos) === CHAR_CODES.NEWLINE) {
        this.row++;
        this.col = 1;
      } else {
        this.col++;
      }
      this.pos++;
      if (this.pos >= this.inputLength) {
        this.reachedEnd = true;
      }
      return;
    }

    // Handle multiple steps
    for (let i = 0; i < step; i++) {
      if (this.input.charCodeAt(this.pos) === CHAR_CODES.NEWLINE) {
        this.row++;
        this.col = 1;
      } else {
        this.col++;
      }
      this.pos++;

      if (this.pos >= this.inputLength) {
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
        try {
          ({ value, needToNormalize } = this.escapeString(
            value,
            needToNormalize
          ));
          // escapeString has already advanced the position, so continue to next iteration
        } catch (error) {
          // For invalid escape sequences, treat them as literal characters without the backslash
          // Note: escapeString has already advanced past the backslash, so pos is at the escape char
          if (!this.reachedEnd) {
            const escapeChar = this.input[this.pos];
            value += escapeChar; // Add the escape character (u, x, etc.) without backslash

            // For \u and \x sequences, we need to add the invalid hex digits too
            if (escapeChar === 'u') {
              // Add the next 4 characters (or until end of input)
              this.advance();
              for (let i = 0; i < 4 && !this.reachedEnd; i++) {
                value += this.input[this.pos];
                this.advance();
              }
              continue;
            } else if (escapeChar === 'x') {
              // Add the next 2 characters (or until end of input)
              this.advance();
              for (let i = 0; i < 2 && !this.reachedEnd; i++) {
                value += this.input[this.pos];
                this.advance();
              }
              continue;
            } else {
              this.advance();
            }
          }
          continue;
        }
      } else {
        value += this.input[this.pos];
        this.advance();
      }
    }

    // If we reached the end without finding the closing quote,
    // create an error token for the unclosed string
    if (this.reachedEnd) {
      const tokenText = this.input.substring(start, this.pos);

      // Create a temporary token for the opening quote to get proper range
      const openingToken = Token.init(start, startRow, startCol, '"', '"', "STRING");
      const currentPos = createPosition(this.pos, this.row, this.col);

      const error = new SyntaxError(
        ErrorCodes.unterminatedString,
        `Unterminated string literal. Expected closing quote '"' before end of input.`,
        unclosedConstructRange(openingToken, currentPos),
        true
      );

      return this.createErrorToken(error, start, startRow, startCol, tokenText);
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
        `Invalid escape sequence at end of input. Expected escape character after backslash.`,
        this.currentPosition, true
      )
    }

    switch (this.input[this.pos]) {
      case "b":
        value += "\b";
        this.advance(); // Move past the escape char
        break;
      case "f":
        value += "\f";
        this.advance(); // Move past the escape char
        break;
      case "n":
        value += "\n";
        this.advance(); // Move past the escape char
        break;
      case "r":
        value += "\r";
        this.advance(); // Move past the escape char
        break;
      case "t":
        value += "\t";
        this.advance(); // Move past the escape char
        break;
      case "u":
        const hex = this.input.substring(this.pos + 1, this.pos + 5);
        if (regexHex4.test(hex)) {
          // /^[0-9a-fA-F]{4}$/
          value += String.fromCharCode(parseInt(hex, 16));
          this.advance(5); // Move past 'u' and the 4 hex digits
          needToNormalize = true;
        } else {
          throw new SyntaxError(
            ErrorCodes.invalidEscapeSequence,
            `Invalid Unicode escape sequence '\\u${hex}'. Expected 4 hexadecimal digits (0-9, A-F).`,
            this.currentPosition);
        }
        break;
      case "x":
        const hexByte = this.input.substring(this.pos + 1, this.pos + 3);
        if (regexHex2.test(hexByte)) {
          // /^[0-9a-fA-F]{2}$/
          value += String.fromCharCode(parseInt(hexByte, 16));
          this.advance(3); // Move past 'x' and the 2 hex digits
          needToNormalize = true;
        } else {
          throw new SyntaxError(
            ErrorCodes.invalidEscapeSequence,
            `Invalid hexadecimal escape sequence '\\x${hexByte}'. Expected 2 hexadecimal digits (0-9, A-F).`,
            this.currentPosition);
        }
        break;
      default:
        value += this.input[this.pos]; // Treat unrecognized escape sequences as literal characters without backslash
        this.advance(); // Move past the escape character
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

  /**
   * @param allowDoubledQuote when true, two consecutive enclosing quotes are ONE literal quote
   *   rather than the end of the string. Raw strings only — it is the only escape they have, and
   *   the other annotations (`b`, `d`, `t`, `dt`) carry content that cannot contain a quote.
   */
  private parseAnotatedString(annotation: Annotation, allowDoubledQuote = false): Token {
    const start = this.pos;
    const startRow = this.row;
    const startCol = this.col;

    // Skip over the annotation characters
    for (let i = 0; i < annotation.name.length; i++) {
      this.advance();
    }

    if (this.reachedEnd) {
      const tokenText = this.input.substring(start, this.pos);

      // Create a temporary token for the opening annotation to get proper range
      const openingToken = Token.init(start, startRow, startCol, annotation.name + annotation.quote, annotation.name, "STRING");
      const currentPos = createPosition(this.pos, this.row, this.col);

      const error = new SyntaxError(
        ErrorCodes.unterminatedString,
        `Unterminated annotated string literal. Expected closing quote '${annotation.quote}' before end of input.`,
        unclosedConstructRange(openingToken, currentPos),
        true
      );

      return this.createErrorToken(error, start, startRow, startCol, tokenText);
    }

    this.advance(); // Move past the opening quotation mark
    while (!this.reachedEnd) {
      if (this.input[this.pos] === annotation.quote) {
        // A doubled enclosing quote is the raw string's only escape: it stands for one literal
        // quote and does NOT close the string. Anything else at this position does close it.
        if (allowDoubledQuote && this.input[this.pos + 1] === annotation.quote) {
          this.advance()
          this.advance()
          continue
        }
        break
      }
      this.advance();
    }

    // The loop above ends either at the closing quote or at end of input. Only the first is a
    // string.
    //
    // This used to "treat it as an annotated string that goes to EOF": `r'Unclosed` yielded the
    // string "Unclosed" with no error, while the regular string `"Unclosed` correctly reported
    // `unterminated-string`. Two spellings of one fault, one of them silent — and silent is the
    // dangerous one, because a truncated value that parses is indistinguishable from an intended
    // one. It applies to every annotation (`r`, `b`, `dt`, `d`, `t`), not just raw strings.
    if (this.reachedEnd && this.input[this.pos] !== annotation.quote) {
      const tokenText = this.input.substring(start, this.pos);
      const openingToken = Token.init(start, startRow, startCol, annotation.name + annotation.quote, annotation.name, "STRING");
      const currentPos = createPosition(this.pos, this.row, this.col);

      const error = new SyntaxError(
        ErrorCodes.unterminatedString,
        `Unterminated annotated string literal. Expected closing quote '${annotation.quote}' before end of input.`,
        unclosedConstructRange(openingToken, currentPos),
        true
      );

      return this.createErrorToken(error, start, startRow, startCol, tokenText);
    }

    this.advance(); // Move past the closing quotation mark
    const fullTokenText = this.input.substring(start, this.pos);
    let value = fullTokenText.substring(annotation.name.length + 1, fullTokenText.length - 1);
    if (allowDoubledQuote) {
      // `''` was scanned as one literal quote above; collapse it in the VALUE too, or the string
      // would read back with the escape still in it.
      value = value.split(annotation.quote + annotation.quote).join(annotation.quote);
    }

    // Prepare the token
    const token = new Token();
    token.pos = start;
    token.row = startRow;
    token.col = startCol;
    token.token = fullTokenText;
    token.value = value;

    return token;
  }

  private parseRawString(annotation: Annotation): Token {
    const token = this.parseAnotatedString(annotation, true);

    // If the annotated string parsing already returned an error token, return it as-is
    if (token.type === TokenType.ERROR) {
      return token;
    }

    token.type = TokenType.STRING;
    token.subType = "RAW_STRING";
    return token;
  }

  private parseByteString(annotation: Annotation): Token {
    const token = this.parseAnotatedString(annotation);

    // If the annotated string parsing already returned an error token, return it as-is
    if (token.type === TokenType.ERROR) {
      return token;
    }

    // Validate base64 format using cached regex
    const valueStr = token.value as string;
    if (!REGEX_CACHE.base64.test(valueStr)) {
      const error = new SyntaxError(
        ErrorCodes.invalidBinary,
        `Invalid base64 format '${valueStr.length > 20 ? valueStr.substring(0, 20) + '...' : valueStr}'. Expected valid base64 characters (A-Z, a-z, 0-9, +, /) with optional '=' padding.`,
        token
      );
      return this.createErrorToken(error, token.pos, token.row, token.col, token.token);
    }

    token.type = TokenType.BINARY;
    token.subType = "BINARY_STRING";

    // Convert the base64 string to a byte array
    token.value = fromBase64(valueStr);
    return token;
  }

  private parseDateTime(annotation: Annotation): Token {
    const token = this.parseAnotatedString(annotation);

    // If the annotated string parsing already returned an error token, return it as-is
    if (token.type === TokenType.ERROR) {
      return token;
    }

    try {
      let fn = (value: string): Date | null => null
      // The marker picks the error code, so a broken `d'...'` reports `invalid-date` rather than
      // naming a type the author never wrote.
      let code: string = ErrorCodes.invalidDateTime

      switch (annotation.name) {
        case "dt":
          fn = dtParser.parseDateTime;
          code = ErrorCodes.invalidDateTime;
          token.subType = TokenType.DATETIME
          break;
        case "d":
          fn = dtParser.parseDate;
          code = ErrorCodes.invalidDate;
          token.subType = TokenType.DATE
          break;
        case "t":
          fn = dtParser.parseTime;
          code = ErrorCodes.invalidTime;
          token.subType = TokenType.TIME
          break;
        default:
          assertNever(annotation);
      }

      const dt = typeof token.value === 'string' ? fn(token.value) : null;
      if (!dt) {
        // The marker chose the code in the switch above, so the code always names the type the
        // author actually wrote.
        const error = new SyntaxError(code,
          `Invalid ${annotation.name === 'dt' ? 'datetime' : annotation.name === 'd' ? 'date' : 'time'} format '${token.value}'. Expected valid ISO 8601 format.`,
          token);
        return this.createErrorToken(error, token.pos, token.row, token.col, token.token);
      }

      token.value = dt;
      token.type = TokenType.DATETIME;
      return token;
    } catch (error) {
      return this.createErrorToken(error as Error, token.pos, token.row, token.col, token.token);
    }
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
    let signStr = "";
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
        signStr = sign;
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
        // REWIND. A sign has already been consumed by this point, and bailing out without
        // restoring the position left the caller resuming AFTER it — so the sign was dropped
        // from the value entirely: `-.j` decoded as the string ".j", losing a character the author
        // wrote. Every other bail-out in this function either rewinds or has not advanced yet.
        this.pos = start;
        this.row = startRow;
        this.col = startCol;
        this.reachedEnd = false;
        return null;
      }
    }

    // Determine the number format
    if (this.input[this.pos] === "0" && nonDecimalPrefixes.includes(this.input[this.pos + 1] as any)) {
      // A sign is spelled BEFORE the base prefix (`-0xff`), never inside the digits. It was
      // buffered into `rawValue` above for the decimal paths; move it into `prefix` here so the
      // assembled literal reads `-0xff` and not `0x-ff` (which is not a number at all).
      rawValue = "";
      switch (this.input[this.pos + 1]) {
        case "X":
        case "x":
          base = 16;
          subType = "HEX";
          prefix = signStr + this.input[this.pos] + this.input[this.pos + 1];
          this.advance(2);
          while (!this.reachedEnd && reHex.test(this.input[this.pos])) {
            rawValue += this.input[this.pos];
            this.advance();
          }
          break;

        case "O":
        case "o":
          base = 8;
          subType = "OCTAL";
          prefix = signStr + this.input[this.pos] + this.input[this.pos + 1];
          this.advance(2);
          while (!this.reachedEnd && reOctal.test(this.input[this.pos])) {
            rawValue += this.input[this.pos];
            this.advance();
          }
          break;

        case "B":
        case "b":
          base = 2;
          subType = "BINARY";
          prefix = signStr + this.input[this.pos] + this.input[this.pos + 1];
          this.advance(2);
          while (!this.reachedEnd && reBinary.test(this.input[this.pos])) {
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

    // A non-decimal prefix (0x/0o/0b) that delivered NO valid digits: `0x`, `0o9`, `0b2`,
    // `0b 1010`. The prefix ANNOUNCES a base, so failing to produce one is a failed number
    // whatever follows it — the space in `0b 1010` does not rescue it.
    //
    // This is the load-bearing half of the rule. The other half is the merge-path check
    // (`isFailedNumericLiteral`), which catches a prefix that decoded and then ran on into
    // junk (`0b12`: `1` is valid binary, `2` is not).
    //
    // Between them they leave prose alone, because prose that begins with a prefix begins with
    // a VALID one: `0xFFn) and bad-value fallbacks` decodes `0xFF` happily and is an open
    // string. That distinction — did the prefix deliver anything? — is what separates a
    // broken literal from a word, and it is why a run with no prefix at all (`013ABSD`, a code
    // of the kind people write every day) is never touched. See ADR 0003 §2.
    //
    // Consume the whole alphanumeric run so the reported text is the literal the author wrote,
    // and so nothing is left for the merge step to glue on.
    if (base !== 10 && rawValue === "") {
      while (!this.reachedEnd && /[0-9A-Za-z_]/.test(this.input[this.pos])) {
        this.advance();
      }
      const tokenText = this.input.substring(start, this.pos);
      const error = new SyntaxError(
        ErrorCodes.invalidNumber,
        `Invalid number literal '${tokenText}'. The '${tokenText.replace(/^[+-]?0/, '0').slice(0, 2)}' prefix requires at least one valid digit for its base (0x hex, 0o octal, 0b binary). To write this as text, quote it: "${tokenText}".`,
        this.currentPosition
      );
      return this.createErrorToken(error, start, startRow, startCol, tokenText);
    }

    let tokenType = TokenType.NUMBER;
    let numberValue: number | bigint | Decimal;

    // An incomplete scientific mantissa — a dangling exponent like "5e" / "12E" / "5e+" — is not a
    // pure number, so a following m/n suffix does NOT form a typed literal. Rewind and let the whole
    // run become an OPEN_STRING (`5em` -> "5em", `5en` -> "5en"). A COMPLETE exponent (`12e5`) is
    // unaffected and continues as a valid scientific bigint / decimal.
    if (
      hasExponent &&
      (this.input[this.pos] === "n" || this.input[this.pos] === "m") &&
      !/[eE][+-]?[0-9]+$/.test(rawValue)
    ) {
      this.pos = start;
      this.row = startRow;
      this.col = startCol;
      this.reachedEnd = false;
      return null;
    }

    // if the next char is 'n', then it is a BigInt literal
    if (this.input[this.pos] === "n") {
      // BigInt is integer-only. A decimal POINT is invalid (a bigint is not a decimal). Scientific
      // notation IS allowed when it denotes an integer — i.e. a non-negative exponent (`12e5n`).
      // Anything else is a designated invalid-bigint ERROR token (never throw, never an OPEN_STRING).
      let bigIntValue: bigint | null = null;
      if (!hasDecimal) {
        if (hasExponent) {
          const sci = (prefix + rawValue).match(/^([+-]?\d+)[eE]\+?(\d+)$/);
          if (sci) {
            bigIntValue = BigInt(sci[1]) * (10n ** BigInt(sci[2]));
          }
        } else {
          // `BigInt()` accepts `0xff` and `-42`, but NOT a signed radix literal like `-0xff`.
          // Negate the unsigned magnitude instead of handing it the sign.
          const literal = prefix + rawValue;
          bigIntValue = literal.startsWith("-")
            ? -BigInt(literal.slice(1))
            : BigInt(literal.startsWith("+") ? literal.slice(1) : literal);
        }
      }
      if (bigIntValue === null) {
        rawValue += "n";
        this.advance(); // consume the 'n' so the token text spans the whole literal
        const tokenText = prefix + rawValue;
        const error = new SyntaxError(
          ErrorCodes.invalidBigInt,
          `Invalid BigInt literal '${tokenText}'. BigInt values must be integers (no decimal point; scientific notation requires a non-negative exponent).`,
          this.currentPosition
        );
        return this.createErrorToken(error, start, startRow, startCol, tokenText);
      }
      tokenType = TokenType.BIGINT;
      numberValue = bigIntValue;
      rawValue += "n";
      this.advance();
    } else if (this.input[this.pos] === "m") {
      // Decimal literal. A malformed mantissa (missing leading digit `.5m`, or missing trailing
      // digit `123.m`) is invalid per the decimal spec — emit a designated invalid-decimal ERROR
      // token (never throw, never silently an OPEN_STRING), mirroring invalid-bigint.
      let decimalValue: Decimal;
      try {
        decimalValue = new Decimal(rawValue);
      } catch {
        rawValue += "m";
        this.advance(); // consume 'm' so the token text spans the whole literal
        const tokenText = prefix + rawValue;
        const error = new SyntaxError(
          ErrorCodes.invalidDecimal,
          `Invalid Decimal literal '${tokenText}'. A decimal must have a digit before and after the decimal point (e.g. '0.5m').`,
          this.currentPosition
        );
        return this.createErrorToken(error, start, startRow, startCol, tokenText);
      }
      tokenType = TokenType.DECIMAL;
      numberValue = decimalValue;
      // The literal ends in 'm', so the token TEXT must too. This appended 'f' — an internal
      // marker with no reader — and the text is not private: when a decimal is followed by more
      // open-string characters the two tokens MERGE, and the marker left the tokenizer as data.
      // `123.45mm` decoded as the string "123.45fm", an `f` the input never contained.
      rawValue += "m";
      this.advance();
    } else {
      if (base === 10 && (hasDecimal || hasExponent)) {
        // RULE 1, all or nothing. A dangling exponent — `1e`, `12E`, `5e+` — is not a complete
        // number, so the whole run is an open string. It is NOT an error: `e` is an ordinary letter
        // and makes no claim, so `1e` is no more a broken number than `013ABSD` is.
        //
        // What must never happen is the third option. `parseFloat("1e")` returns 1, so this used to
        // decode as the NUMBER 1 — a value the author never wrote, with no text left to inspect.
        // Rewinding is what forbids inventing a value from a partial parse.
        if (hasExponent && !/[eE][+-]?[0-9]+$/.test(rawValue)) {
          this.pos = start;
          this.row = startRow;
          this.col = startCol;
          this.reachedEnd = false;
          return null;
        }
        numberValue = parseFloat(rawValue);
      } else {
        // For a radix literal the sign now lives in `prefix`, so apply it to the magnitude.
        numberValue = parseInt(rawValue, base);
        if (base !== 10 && prefix.startsWith("-")) numberValue = -numberValue;
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

  /**
   * Does this run carry a base-prefix CLAIM it failed to keep?
   *
   * RULE 2. `0x`, `0o` and `0b` can only mean "a number follows in this base" — nothing else in
   * the format begins that way. A run that makes the claim and does not keep it is an error, not
   * an open string. (The type suffixes `m` and `n` make the same kind of claim at the other end,
   * and are handled where they are read, as `invalid-decimal` / `invalid-bigint`.)
   *
   * A run that makes NO claim is never touched by this: `013ABSD`, `1.2.3`, `10.0.0.1`, `12mm`,
   * `3pm` and `1e` are all ordinary open strings under Rule 1 (all or nothing).
   *
   * The end-anchor is what keeps prose safe. Without it, an open string that merely begins with a
   * prefix and runs on — "0xFFn) and bad-value fallbacks" — reads as a failed number and takes
   * the whole document down with it. Once punctuation or a space appears, the run is text.
   */
  private static isFailedNumericLiteral(text: string): boolean {
    return /^[+-]?0[xXoObB][0-9A-Za-z_]*$/.test(text)
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
        try {
          ({ value, needToNormalize: normalizeString } = this.escapeString(
            value,
            normalizeString
          ));
          // escapeString has already advanced the position, so continue to next iteration
          continue;
        } catch (error) {
          // For open strings, preserve the backslash and the escape character
          // Note: escapeString has already advanced past the backslash, so pos is at the escape char
          value += "\\";
          if (!this.reachedEnd) {
            const escapeChar = this.input[this.pos];
            value += escapeChar; // Add the escape character (u, x, etc.)

            // For \u and \x sequences, we need to add the invalid hex digits too
            if (escapeChar === 'u') {
              // Add the next 4 characters (or until end of input)
              this.advance();
              for (let i = 0; i < 4 && !this.reachedEnd; i++) {
                value += this.input[this.pos];
                this.advance();
              }
              continue;
            } else if (escapeChar === 'x') {
              // Add the next 2 characters (or until end of input)
              this.advance();
              for (let i = 0; i < 2 && !this.reachedEnd; i++) {
                value += this.input[this.pos];
                this.advance();
              }
              continue;
            } else {
              this.advance();
            }
          }
          continue;
        }
      } else {
        value += char;
        this.advance();
      }
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
    first: Token, second: Token): Token {
    const token = new Token();
    token.pos = first.pos;
    token.row = first.row;
    token.col = first.col;
    token.token = first.token + second.token;
    token.value = first.token + (second.value?.toString() ?? '');
    token.type = second.type;
    token.subType = second.subType;
    return token;
  }

  /**
   * Skip over any whitespaces and return them as a string.
   * @returns {string} The skipped whitespaces.
   */
  private skipWhitespaces(hspacesOnly: boolean = false): string {
    const startPos = this.pos;
    while (!this.reachedEnd && is.isWhitespace(this.input[this.pos], hspacesOnly)) {
      const space = this.input[this.pos];
      // replace \r\n or \r with \n. This behavior is configurable
      // with the normalizeNewline option
      if (space === '\r') {
        if (this.input[this.pos + 1] === '\n') {
          this.advance();
        }
        this.advance();
      } else {
        this.advance();
      }
    }

    // Optimize: use substring instead of character-by-character concatenation
    if (startPos === this.pos) {
      return '';
    }

    let spaces = this.input.substring(startPos, this.pos);
    // Only normalize if we found \r characters
    if (spaces.includes('\r')) {
      spaces = spaces.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    }

    return spaces;
  }

  /**
   * Tokenize the input string.
   * @returns {Token[]} Array of parsed tokens.
   */
  public tokenize(): readonly Token[] {
    // Pre-allocate array with estimated size for better performance
    const estimatedTokens = Math.max(10, Math.floor(this.inputLength / 8));
    const tokens: Token[] = new Array(estimatedTokens);
    let tokenIndex = 0;

    while (this.pos < this.inputLength) {
      const charCode = this.input.charCodeAt(this.pos);

      // Whitespaces - use fast character code checking
      if (isWhitespaceCode(charCode)) {
        // Skip over the whitespace
        this.advance();
        continue;
      }

      // Single-line comments
      else if (charCode === CHAR_CODES.HASH) {
        this.parseSingleLineComment();
      }

      // Regular strings
      else if (charCode === CHAR_CODES.DOUBLE_QUOTE || charCode === CHAR_CODES.SINGLE_QUOTE) {
        tokens[tokenIndex++] = this.parseRegularString(this.input[this.pos]);
      }

      // Special symbols (e.g., curly braces, brackets, etc.) - use fast character code checking
      else if (this.isSpecialSymbolFast(charCode)) {
        const startRow = this.row;
        const startCol = this.col;
        const ch = this.input[this.pos];
        tokens[tokenIndex++] = Token.init(
          this.pos,
          startRow,
          startCol,
          ch,
          ch,
          this.getSymbolTokenTypeFast(charCode)
        );
        this.advance();
      }

      // Numbers
      else if (charCode === CHAR_CODES.PLUS || charCode === CHAR_CODES.MINUS || charCode === CHAR_CODES.DOT || isDigitCode(charCode)) {
        // Check if it is a SECTION_SEP ---
        if (charCode === CHAR_CODES.MINUS) {
          // If the next two chars are -- that means it is a
          // data seperator.
          if (this.input.substring(this.pos, this.pos + 3) === "---") {
            tokenIndex = this.parseSectionSeparator(tokens, tokenIndex);
            continue;
          }
        }

        const token = this.parseNumber();

        if (token && token.type === TokenType.ERROR) {
          // A designated error token is final. Merging it with whatever follows would splice the
          // fault into a larger open string and lose it: `0b 1010` reported `invalid-number` for
          // the `0b`, then glued it to ` 1010` and returned the string "0b 1010" with no error.
          tokens[tokenIndex++] = token;
        } else if (token) {
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
                // Take the value from the TEXT, not from whatever the run parsed as. This token is
                // being forced to an open string, and `parseLiteralOrOpenString` may have read it
                // as a keyword — `T` comes back with the boolean value `true`. Concatenating that
                // spelled the keyword out into the merged string, so `5T` decoded as "5true": two
                // characters in, five out, and a word the author never wrote.
                nextToken.value = nextToken.token;
                if (spaces.length > 0) {
                  nextToken.token = spaces + nextToken.token;
                  nextToken.value = spaces + nextToken.value;
                }
                const merged = this.mergeTokens(token, nextToken);
                // A merged run of only digits and dots (a multi-dot, non-numeric mantissa) ending
                // in a lowercase m/n suffix is a botched typed literal, not a string — e.g.
                // `12.34.56m`. Emit a designated error. The guard is deliberately narrow (digits and
                // dots only) so number-prefixed words like `3pm`/`5km`/`2cm` stay OPEN_STRING.
                const botched = (merged.token as string).match(/^[+-]?[0-9]*(?:\.[0-9]*){2,}([mn])$/);
                if (botched) {
                  const isDec = botched[1] === "m";
                  const error = new SyntaxError(
                    isDec ? ErrorCodes.invalidDecimal : ErrorCodes.invalidBigInt,
                    `Invalid ${isDec ? "Decimal" : "BigInt"} literal '${merged.token}'. A ${isDec ? "decimal" : "bigint"} must be a valid number (a single decimal point at most).`,
                    merged
                  );
                  tokens[tokenIndex++] = this.createErrorToken(error, merged.pos, merged.row, merged.col, merged.token as string);
                } else if (Tokenizer.isFailedNumericLiteral(merged.token as string)) {
                  // A numeric literal that did not decode. Reaching here means the number parser
                  // rewound and the remainder was swept into an open string -- which is how `0xGH`
                  // used to become the STRING "0xGH" with no error at all.
                  const error = new SyntaxError(
                    ErrorCodes.invalidNumber,
                    `Invalid number literal '${merged.token}'. Expected digits valid for the declared base (0x hex, 0o octal, 0b binary) and at most one decimal point.`,
                    merged
                  );
                  tokens[tokenIndex++] = this.createErrorToken(error, merged.pos, merged.row, merged.col, merged.token as string);
                } else {
                  tokens[tokenIndex++] = merged;
                }
              } else {
                tokens[tokenIndex++] = token;
              }
            } else {
              tokens[tokenIndex++] = token;
            }
          } else {
            tokens[tokenIndex++] = token;
          }
        } else {
          // It wasn't a number, so it must be a literal or open string
          const token = this.parseLiteralOrOpenString();
          if (token) {
            tokens[tokenIndex++] = token;
          }
        }
      }

      // Literals or open strings
      else {
        const annotation = this.checkIfAnotatedString();
        if (annotation) {
          switch (annotation.name) {
            case "r":
              tokens[tokenIndex++] = this.parseRawString(annotation);
              break;

            case "b":
              tokens[tokenIndex++] = this.parseByteString(annotation);
              break;

            case "d":
            case "dt":
            case "t":
              tokens[tokenIndex++] = this.parseDateTime(annotation);
              break;

            default:
              const error = new SyntaxError(ErrorCodes.unknownAnnotation,
                `Unsupported annotation '${annotation.name}'. Supported annotations are: 'r' (raw string), 'b' (binary), 'dt' (datetime), 'd' (date), 't' (time).`,
                this.currentPosition);
              const tokenText = this.input.substring(this.pos, this.pos + annotation.name.length + 1);
              tokens[tokenIndex++] = this.createErrorToken(error, this.pos, this.row, this.col, tokenText);
              this.skipToNextTokenBoundary();
          }
        } else {
          const token = this.parseLiteralOrOpenString();
          if (token) {
            tokens[tokenIndex++] = token;
          }
        }
      }
    }

    // Return properly sized array
    tokens.length = tokenIndex;
    return tokens;
  }

  private parseSectionSeparator(tokens: Token[], tokenIndex: number): number {
    tokens[tokenIndex++] = Token.init(
      this.pos,
      this.row,
      this.col,
      "---",
      "---",
      TokenType.SECTION_SEP
    );
    this.advance(3); // Advance past the "---"
    this.skipWhitespaces(true);

    // Bound the schema/name lookahead to the current line rather than copying the
    // entire remaining input. A section header's name/schema always sits on the
    // same line as `---`, and reSectionSchemaName never matches across a newline,
    // so this is behavior-preserving while keeping lookahead bounded — it avoids
    // O(n^2) substring copies on large multi-section documents and unblocks
    // incremental (chunk-fed) tokenization. See the streaming gap tracker (.private/docs/streaming-IMPLEMENTATION-GAPS.md, kept out of the repo), Gap 18.
    const newlineIdx = this.input.indexOf('\n', this.pos);
    const lineEnd = newlineIdx === -1 ? this.inputLength : newlineIdx;
    const match = reSectionSchemaName.exec(this.input.substring(this.pos, lineEnd));

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
        tokens[tokenIndex++] = Token.init(
          this.pos,
          this.row,
          this.col,
          schema2,
          schema2,
          TokenType.STRING,
          TokenType.SECTION_SCHEMA
        );
        this.advance(schema2.length);
        this.skipWhitespaces(true);
      } else if (name) {
        // The section-name production is ANCHORED (io-specs .../data.md). The regex above can only
        // match a legal RUN, so a trailing illegal character shows up as the run stopping early --
        // `user$x` matches `user` and leaves `$x`. Accepting that silently is how a section lost
        // its name and fell back to `data`. A name must be followed by whitespace, `:`, or the end
        // of the line; anything else means the name itself held an illegal character.
        const after = this.input[this.pos + name.length];
        if (after !== undefined && !/[\s:]/.test(after)) {
          const bad = /^[^\s:]+/.exec(this.input.substring(this.pos, lineEnd))?.[0] ?? name;
          const error = new SyntaxError(
            ErrorCodes.invalidSectionName,
            `Invalid section name '${bad}'. A section name may contain only letters, marks, digits, '-' and '_', and cannot be quoted.`,
            this.currentPosition);
          tokens[tokenIndex++] = this.createErrorToken(error, this.pos, this.row, this.col, bad);
          this.advance(bad.length);
          return tokenIndex;
        }

        tokens[tokenIndex++] = Token.init(
          this.pos,
          this.row,
          this.col,
          name,
          name,
          TokenType.STRING,
          TokenType.SECTION_NAME
        );
        this.advance(name.length);
        this.skipWhitespaces(true);

        if (sep) {
          // skip over the separator when it is present
          this.advance(sep.length);
          this.skipWhitespaces(true);

          // Once the sep is detected, the schema must be present
          if (!schema) {
            const error = new SyntaxError(ErrorCodes.missingSchema,
              `Missing schema definition after section separator. Expected schema name starting with '$' (e.g., '$mySchema').`,
              this.currentPosition);
            tokens[tokenIndex++] = this.createErrorToken(error, this.pos, this.row, this.col, "");
            return tokenIndex;
          }

          tokens[tokenIndex++] = Token.init(
            this.pos,
            this.row,
            this.col,
            schema,
            schema,
            TokenType.STRING,
            TokenType.SECTION_SCHEMA
          );
          this.advance(schema.length);
          this.skipWhitespaces(true);
        }
      }
    }

    return tokenIndex;
  }
}

type Annotation = {
  name: string;
  quote: string;
}

export default Tokenizer;
