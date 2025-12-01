import Collection from "../../core/collection";
import Definitions from "../../core/definitions";
import { Position } from '../../core/positions';
import ContainerNode from "./containers";
import ErrorNode from "./error";
import Node from "./nodes";

class CollectionNode extends ContainerNode {
  constructor(children: Array<Node | undefined> = []) {
    super('collection', children);
  }

  toValue(defs?: Definitions): any {
    const value = new Collection();
    for (const child of this.children) {
      value.push(child?.toValue(defs));
    }
    return value;
  }

  getStartPos(): Position {
    return this.children[0]?.getStartPos() ?? { row: 0, col: 0, pos: 0 };
  }

  getEndPos(): Position {
    return this.children[this.children.length - 1]?.getEndPos() ?? { row: 0, col: 0, pos: 0 };
  }

  // Utility Methods
  isEmpty(): boolean {
    return this.children.length === 0 || this.children.every(child => child === undefined);
  }

  toDebugString(): string {
    const itemStrings = this.children.map((child, index) => {
      if (!child) return `[${index}]: undefined`;

      const valueStr = typeof child.toValue === 'function' ?
        JSON.stringify(child.toValue()) :
        String(child);

      return `[${index}]: ${valueStr}`;
    });

    return `CollectionNode { ${itemStrings.join(', ')} }`;
  }

  size(): number {
    return this.children.length;
  }

  hasValidItems(): boolean {
    return this.children.some(child => {
      if (!child) return true; // undefined items are valid

      // Check if the child is an ErrorNode
      if (child instanceof ErrorNode) {
        return false;
      }

      return true; // Valid item found
    });
  }

  getValidItems(): Node[] {
    return this.children.filter((child): child is Node => {
      if (!child) return true; // undefined items are valid

      // Check if the child is an ErrorNode
      if (child instanceof ErrorNode) {
        return false;
      }

      return true; // Valid item
    });
  }

  isValid(): boolean {
    // A collection is valid if none of its items are ErrorNodes
    return this.children.every(child => {
      if (!child) return true; // undefined items are considered valid

      // Check if the child is an ErrorNode
      if (child instanceof ErrorNode) {
        return false;
      }

      return true;
    });
  }
}

export default CollectionNode;
