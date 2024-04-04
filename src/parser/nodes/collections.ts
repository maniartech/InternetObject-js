import Collection from "../../core/collection";
import Definitions from "../../core/definitions";
import Position from "../../core/position";
import ContainerNode  from "./containers";
import Node           from "./nodes";

class CollectionNode extends ContainerNode {
  constructor(children: Array<Node | null> = []) {
    super('collection', children);
  }

  toValue(defs?: Definitions):any {
    const value = new Collection();
    for (const child of this.children) {
      value.push(child?.toValue(defs));
    }
    return value;
  }

  getStartPos(): Position {
    return this.children[0]?.getStartPos() ?? { row: 0, col: 0, pos: 0 };
  }

  getEndPos(): Position {
    return this.children[this.children.length - 1]?.getEndPos() ?? { row: 0, col: 0, pos: 0 };
  }
}

export default CollectionNode;
