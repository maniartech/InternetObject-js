import Definitions  from "../../core/definitions";
import Position     from "../../core/position";
import Node         from "./nodes";

abstract class ContainerNode implements Node {
  type: string;
  children: Array<Node | null>;

  constructor(type:string, children: Array<Node | null> = []) {
    this.type = type;
    this.children = children;
  }

  toValue(defs?: Definitions):any {
    return this.children.map((child) => {
      if (child) {
        return child.toValue(defs);
      }

      return undefined;
    });
  }

  abstract getStartPos(): Position;

  abstract getEndPos(): Position;
}

export default ContainerNode;