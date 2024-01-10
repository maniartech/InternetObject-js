import Definitions    from '../../core/definitions';
import InternetObject from '../../core/internet-object';
import ContainerNode  from './containers';
import MemberNode     from './members';

class ObjectNode extends ContainerNode {

  constructor(children: Array<MemberNode | null> = []) {
    super('object', children);
  }

  toObject(defs?: Definitions):any {
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

  toValue (defs?: Definitions): InternetObject {
    const o = new InternetObject();
    for (let i=0; i<this.children.length; i++) {
      const member = this.children[i] as MemberNode;
      if (member) {
        if (member.key) {
          o[member.key.value] = member.value.toValue(defs);
        } else {
          o.pushValues(member.value.toValue(defs))
        }
      }
    }

    return o;
  }
}

export default ObjectNode;