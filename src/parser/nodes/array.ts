import ContainerNode  from "./containers";
import Node           from "./nodes";


class ArrayNode extends ContainerNode {

  constructor(children: Array<Node | null> = []) {
    super('array', children);
  }

}

export default ArrayNode;
