import Definitions    from '../../core/definitions';
import InternetObject from '../../core/internet-object';
import Position from '../../core/position';
import Token from '../tokenizer/tokens';
import ContainerNode  from './containers';
import MemberNode     from './members';

class ObjectNode extends ContainerNode {
  openBracket?: Token;
  closeBracket?: Token;

  constructor(children: Array<MemberNode | undefined> = [], openBracket?: Token, closeBracket?: Token) {
    super('object', children);

    if (openBracket) {
      this.openBracket = openBracket;
    }

    if (closeBracket) {
      this.closeBracket = closeBracket;
    }
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

  getStartPos(): Position {
    if (this.openBracket) {
      return this.openBracket.getStartPos();
    }

    return this.children[0]?.getStartPos() ?? { row: 0, col: 0, pos: 0 };
  }

  getEndPos(): Position {
    if (this.closeBracket) {
      return this.closeBracket.getEndPos();
    }

    return this.children[this.children.length - 1]?.getEndPos() ?? { row: 0, col: 0, pos: 0 };
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