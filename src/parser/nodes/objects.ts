import ContainerNode from "./containers";
import Node from "./nodes";
import MemberNode from './members';



class ObjectNode extends ContainerNode {

  constructor(children: Array<Node | null> = []) {
    super('object', children);
  }

  toValue: () => any = () => {
    const value: any = {};
    let index = 0;
    for (const child of this.children as Array<MemberNode>) {
      if (child) {
        if (child.key) {
          value[child.key.value] = child.value.toValue();
        } else {
          value[index] = child.value.toValue();
        }
      } else {
        value[index] = undefined;
      }

      index++;
    }
    return value;
  }
}

export default ObjectNode;