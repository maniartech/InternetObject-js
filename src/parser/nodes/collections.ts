import ContainerNode  from "./containers";
import Node           from "./nodes";



class CollectionNode extends ContainerNode {
  constructor(children: Array<Node | null> = []) {
    super('collection', children);
  }
}

export default CollectionNode;