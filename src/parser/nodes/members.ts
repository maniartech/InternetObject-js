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
