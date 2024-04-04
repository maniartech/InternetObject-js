import Definitions    from "../../core/definitions";
import Position from "../../core/position";
import Token from "../../tokenizer/tokens";
import ContainerNode  from "./containers";
import Node           from "./nodes";


class ArrayNode extends ContainerNode {
  openBracket: Token;
  closeBracket: Token;


  constructor(children: Array<Node | null> = [], openBracket: Token, closeBracket: Token) {
    super('array', children);

    this.openBracket = openBracket;
    this.closeBracket = closeBracket;
  }

  toValue(defs?: Definitions):any {
    return this.children.map((child) => {
      if (child) {
        return child.toValue(defs);
      }

      return undefined;
    });
  }

  getStartPos(): Position {
    return this.openBracket.getStartPos();
  }

  getEndPos(): Position {
    return this.closeBracket.getEndPos();
  }

}

export default ArrayNode;
