import Collection from "../../core/collection";
import Definitions from "../../core/definitions";
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
}

export default CollectionNode;
