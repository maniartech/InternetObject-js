import Definitions    from "../../core/definitions";
import { Position } from '../../core/positions';
import Token from "../tokenizer/tokens";
import ContainerNode  from "./containers";
import Node           from "./nodes";


class ArrayNode extends ContainerNode {
  openBracket: Token;
  closeBracket: Token;

  constructor(children: Array<Node | undefined> = [], openBracket: Token, closeBracket: Token) {
    super('array', children);

    this.openBracket = openBracket;
    this.closeBracket = closeBracket;
  }

  toValue(defs?: Definitions):any {
    return this.children.map((child) => {
      if (child?.toValue) { // This is a Node
        return child.toValue(defs);
      }

      return child // other non-node values such null, undefined, etc.
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
