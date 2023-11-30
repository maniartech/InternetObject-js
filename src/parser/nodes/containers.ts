import Definitions from "../../core/definitions";
import Node from "./nodes";

class ContainerNode implements Node {
  type: string;
  children: Array<Node | null>;

  constructor(type:string, children: Array<Node | null> = []) {
    this.type = type;
    this.children = children;
  }

  get row(): number {
    if (this.children === null) return 0;
    return this.children[0]?.row ?? 0;
  }

  get col(): number {
    if (this.children === null) return 0;
    return this.children[0]?.row ?? 0;
  }

  get pos(): number {
    if (this.children === null) return 0;
    return this.children[0]?.row ?? 0;
  }

  toValue(defs?: Definitions):any {
    return this.children.map((child) => {
      if (child) {
        return child.toValue(defs);
      }

      return undefined;
    });
  }
}

export default ContainerNode;