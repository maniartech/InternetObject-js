import Definitions from "../../core/definitions";
import { Position } from '../../core/positions';
import Node from "./nodes";
import TokenNode from "./tokens";

class MemberNode implements Node {
  type: string;
  key?: TokenNode;
  value: Node;

  constructor(value: Node, key?: TokenNode) {
    this.type = 'member';
    this.value = value;
    if (key) {
      this.key = key;
    }
  }

  toValue(defs?: Definitions):any {
    if (this.key) {
      return {
        [this.key.value as string]: this.value.toValue(defs),
      }
    } else {
      return this.value.toValue(defs);
    }
  }
  getStartPos(): Position {
    if (this.key) {
      return this.key.getStartPos();
    }

    return this.value.getStartPos();
  }

  getEndPos(): Position {
    if (this.value) {
      return this.value.getEndPos();
    }

    if (this.key) {
      return this.key.getEndPos();
    }

    return Position.unknown;
  }
}

export default MemberNode;
