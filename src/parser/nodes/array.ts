import Definitions    from "../../core/definitions";
import ContainerNode  from "./containers";
import Node           from "./nodes";


class ArrayNode extends ContainerNode {

  constructor(children: Array<Node | null> = []) {
    super('array', children);
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

export default ArrayNode;
