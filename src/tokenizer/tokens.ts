
/**
* Represents a parsed token.
*/
class Token {
  pos: number;
  row: number;
  col: number;
  token: string;
  value: any;
  type: string;
  subType?: string;

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
   * @param {number} pos - The starting position of the token in the input.
   * @param {number} row - The row number of the token's starting position.
   * @param {number} col - The column number of the token's starting position.
   * @param {string} token - The raw text of the token from the input.
   * @param {any} value - The parsed value of the token.
   * @param {string} type - A descriptive type name for the token.
   */
  static init(pos: number, row: number, col: number, token: string, value: any, type: string, subType?: string): Token {
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
}


export default Token;