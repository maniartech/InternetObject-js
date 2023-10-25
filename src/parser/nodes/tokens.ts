import Definitions from "../../core/definitions";
import Token from "../../tokenizer/tokens";
import Node from "./nodes";


class TokenNode extends Token implements Node {
  constructor (token: Token) {
    super();

    this.pos = token.pos;
    this.row = token.row;
    this.col = token.col;
    this.token = token.token;
    this.value = token.value;
    this.type = token.type;
    this.subType = token.subType;
  }

  toValue(defs?: Definitions):any {
    if (this.type === 'string' && defs !== undefined) {
      const valueFound = defs.getV(this.value);
      return valueFound === undefined ? this.value : valueFound;
    }
    return this.value;
  }
}

export default TokenNode;
