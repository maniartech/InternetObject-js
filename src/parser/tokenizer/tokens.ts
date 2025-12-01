import Decimal from '../../core/decimal/decimal';
import { Position } from '../../core/positions';
import PositionRange from "../../core/positions";
import IOError from '../../errors/io-error';
import TokenType from './token-types';

/**
 * Represents the error value stored in ERROR tokens.
 * When the originalError is an IOError, errorCode will be available.
 */
export interface TokenErrorValue {
  __error: true;
  errorCode?: string;       // Error code from IOError (e.g., 'string-not-closed')
  message: string;
  originalError: Error;
}

/**
 * Type guard to check if an error is an IOError with an errorCode
 */
export function isIOError(error: Error): error is IOError {
  return error instanceof IOError || 'errorCode' in error;
}

/**
 * Union type representing all possible token values.
 * This provides type safety for the parsed value of each token type.
 */
export type TokenValue =
  | string                  // STRING, OPEN_STRING, RAW_STRING, symbols
  | number                  // NUMBER (includes Infinity, NaN)
  | bigint                  // BIGINT
  | Decimal                 // DECIMAL
  | boolean                 // BOOLEAN
  | null                    // NULL
  | Date                    // DATETIME, DATE, TIME
  | Buffer                  // BINARY
  | TokenErrorValue         // ERROR
  | undefined;              // UNDEFINED

/**
 * String literal type for token subtypes.
 */
export type TokenSubType =
  | 'REGULAR_STRING'
  | 'OPEN_STRING'
  | 'RAW_STRING'
  | 'BINARY_STRING'
  | 'HEX'
  | 'OCTAL'
  | 'BINARY'
  | typeof TokenType.DATETIME
  | typeof TokenType.DATE
  | typeof TokenType.TIME
  | typeof TokenType.SECTION_SCHEMA
  | typeof TokenType.SECTION_NAME
  | undefined;

/**
* Represents a parsed token.
*/
class Token implements PositionRange {
  pos: number;
  row: number;
  col: number;
  token: string;
  value: TokenValue;
  type: TokenType | string;
  subType?: TokenSubType | string;

  constructor() {
    this.pos = -1;
    this.row = -1;
    this.col = -1;
    this.token = '';
    this.value = undefined;
    this.type = '';
    this.subType = '';
  }

  /**
   * Create a token.
   * @param pos - The starting position of the token in the input.
   * @param row - The row number of the token's starting position.
   * @param col - The column number of the token's starting position.
   * @param token - The raw text of the token from the input.
   * @param value - The parsed value of the token.
   * @param type - A descriptive type name for the token.
   * @param subType - Optional subtype for the token.
   */
  static init(pos: number, row: number, col: number, token: string, value: TokenValue, type: TokenType | string, subType?: TokenSubType | string): Token {
    const t = new Token()
    t.pos = pos;
    t.row = row;
    t.col = col;
    t.token = token;
    t.value = value;
    t.type = type;

    if (subType) {
      t.subType = subType;
    }

    return t;
  }

  clone(): Token {
    const t = new Token();
    t.pos = this.pos;
    t.row = this.row;
    t.col = this.col;
    t.token = this.token;
    t.value = this.value;
    t.type = this.type;
    t.subType = this.subType;
    return t;
  }

  getStartPos(): Position {
    return { row: this.row, col: this.col, pos: this.pos };
  }

  /**
   * Returns the ending position (row, col, pos) of the token.
   * Useful for debugging and generating error messages.
   */
  getEndPos(): Position {
    const text      = this.token.trimEnd();
    const lines     = text.split('\n');
    const lastLine  = lines[lines.length - 1];

    const row = this.row + lines.length - 1;
    const col = lines.length > 1 ? lastLine.length : this.col + lastLine.length;
    const pos = this.pos + text.length;

    return { row, col, pos };
  }
}


export default Token;