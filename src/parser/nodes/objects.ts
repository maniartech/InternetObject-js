import ContainerNode from "./containers";
import Node from "./nodes";
import MemberNode from './members';
import Definitions from "../../core/definitions";



class ObjectNode extends ContainerNode {

  constructor(children: Array<MemberNode | null> = []) {
    super('object', children);
  }

  toValue(defs?: Definitions):any {
    const value: any = {};
    let index = 0;
    for (const child of this.children as Array<MemberNode>) {
      if (child) {
        if (child.key) {
          value[child.key.value] = child.value.toValue(defs);
        } else {
          value[index] = child.value.toValue(defs);
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