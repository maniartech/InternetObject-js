import Definitions from "../../core/definitions";
import Position from "../../core/position";
import PositionRange from "../../core/position-range";
import Node from "./nodes";

abstract class ContainerNode implements Node {
  type: string;
  children: Array<Node | null>;

  constructor(type:string, children: Array<Node | null> = []) {
    this.type = type;
    this.children = children;
  }

  // get row(): number {
  //   if (this.children === null) return 0;
  //   return this.children[0]?.row ?? 0;
  // }

  // get col(): number {
  //   if (this.children === null) return 0;
  //   return this.children[0]?.row ?? 0;
  // }

  // get pos(): number {
  //   if (this.children === null) return 0;
  //   return this.children[0]?.row ?? 0;
  // }

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