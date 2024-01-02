import Definitions from "../../core/definitions";
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

  get row(): number {
    if (this.key) return this.key.row;
    return this.value.row;
  }

  get col(): number {
    if (this.key) return this.key.col;
    return this.value.col;
  }

  get pos(): number {
    if (this.key) return this.key.pos;
    return this.value.pos;
  }

  toValue(defs?: Definitions):any {
    if (this.key) {
      return {
        [this.key.value]: this.value.toValue(defs),
      }
    } else {
      return this.value.toValue(defs);
    }
  }

}

export default MemberNode;
