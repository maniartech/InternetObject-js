
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

  /**
   * Create a token.
   * @param {number} pos - The starting position of the token in the input.
   * @param {number} row - The row number of the token's starting position.
   * @param {number} col - The column number of the token's starting position.
   * @param {string} token - The raw text of the token from the input.
   * @param {any} value - The parsed value of the token.
   * @param {string} type - A descriptive type name for the token.
   */
  constructor(pos: number, row: number, col: number, token: string, value: any, type: string, subType?: string) {
      this.pos = pos;
      this.row = row;
      this.col = col;
      this.token = token;
      this.value = value;
      this.type = type;

      if (subType) {
        this.subType = subType;
      }
  }
}


export default Token;