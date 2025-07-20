import Definitions  from "../../core/definitions";
import { Position }     from '../../core/positions';
import Node         from "./nodes";

abstract class ContainerNode implements Node {
  type: string;
  children: Array<Node | undefined>;

  constructor(type:string, children: Array<Node | undefined> = []) {
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