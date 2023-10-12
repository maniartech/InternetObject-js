import ContainerNode from "./containers";
import Node from "./nodes";



class ObjectNode extends ContainerNode {

  constructor(children: Array<Node | null> = []) {
    super('object', children);
  }

}

export default ObjectNode;