import ContainerNode  from "./containers";
import Node           from "./nodes";



class CollectionNode extends ContainerNode {
  constructor(children: Array<Node | null> = []) {
    super('collection', children);
  }


  toValue: () => any = () => {
    const value = [];
    for (const child of this.children) {
      value.push(child?.toValue());
    }
    return value;
  }
}

export default CollectionNode;