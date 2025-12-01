import Definitions    from '../../core/definitions';
import InternetObject from '../../core/internet-object';
import { Position } from '../../core/positions';
import Token from '../tokenizer/tokens';
import ContainerNode  from './containers';
import ErrorNode      from './error';
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

  toObject(defs?: Definitions): any {
    const value: any = {};
    let index = 0;
    for (const child of this.children as Array<MemberNode>) {
      if (child && child.value) {
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
      if (member && member.value) {
        if (member.key) {
          // o[member.key.value] = member.value.toValue(defs);
          o.set(member.key.value, member.value.toValue(defs));
        } else {
          o.set(i.toString(), member.value.toValue(defs))
        }
      }
    }

    return o;
  }

  // Utility Methods
  isEmpty(): boolean {
    return this.children.length === 0 || this.children.every(child => child === undefined);
  }

  toDebugString(): string {
    const memberStrings = this.children.map((child, index) => {
      if (!child) return `[${index}]: undefined`;

      const member = child as MemberNode;
      const keyStr = member.key ? member.key.value : `[${index}]`;
      const valueStr = member.value ?
        (typeof member.value.toValue === 'function' ?
          JSON.stringify(member.value.toValue()) :
          String(member.value)) :
        'undefined';

      return `${keyStr}: ${valueStr}`;
    });

    return `ObjectNode { ${memberStrings.join(', ')} }`;
  }

  hasKey(key: string): boolean {
    return this.children.some(child => {
      if (!child) return false;
      const member = child as MemberNode;
      return member.key && member.key.value === key;
    });
  }

  getKeys(): string[] {
    const keys: string[] = [];
    this.children.forEach((child, index) => {
      if (child) {
        const member = child as MemberNode;
        if (member.key) {
          keys.push(member.key.value);
        } else {
          keys.push(index.toString());
        }
      }
    });
    return keys;
  }

  isValid(): boolean {
    // An object is valid if none of its members contain ErrorNodes
    return this.children.every(child => {
      if (!child) return true; // undefined members are considered valid

      const member = child as MemberNode;

      // Check if the member value is an ErrorNode
      if (member.value instanceof ErrorNode) {
        return false;
      }

      // Check if the member key is an ErrorNode (though this is less common)
      if (member.key instanceof ErrorNode) {
        return false;
      }

      return true;
    });
  }
}

export default ObjectNode;