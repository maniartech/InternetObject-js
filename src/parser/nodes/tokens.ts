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

  toValue: () => any = () => {
    return this.value;
  }
}

export default TokenNode;
