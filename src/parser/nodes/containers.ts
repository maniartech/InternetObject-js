import Node from "./nodes";


class ContainerNode implements Node {
  type: string;
  children: Array<Node | null>;

  constructor(type:string, children: Array<Node | null> = []) {
    this.type = type;
    this.children = children;
  }

  toValue: () => any = () => {
    return this.children.map((child) => {
      if (child) {
        return child.toValue();
      }

      return undefined;
    });
  }
}

export default ContainerNode;