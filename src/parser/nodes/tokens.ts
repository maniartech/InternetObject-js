import Token from "../../tokenizer/tokens";
import Node from "./nodes";


class TokenNode extends Token implements Node {
  constructor (token: Token) {
    super(token.pos, token.row, token.col, token.token, token.value, token.type, token.subType);
  }

  toValue: () => any = () => {
    return this.value;
  }
}

export default TokenNode;
