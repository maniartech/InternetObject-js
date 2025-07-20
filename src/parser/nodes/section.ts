import Definitions from "../../core/definitions";
import { Position } from '../../core/position-range';
import Section from "../../core/section";
import SectionCollection from "../../core/section-collection";
import CollectionNode from "./collections";
import Node           from "./nodes";
import ObjectNode from "./objects";
import TokenNode from "./tokens";

type SectionChild = CollectionNode | ObjectNode | null;

class SectionNode implements Node {
  type: string;
  child: SectionChild;
  nameNode: TokenNode | null;
  schemaNode: TokenNode | null;

  constructor(child: SectionChild, nameNode: TokenNode | null, schemaNode: TokenNode | null) {
    this.type = 'section';
    this.child = child;
    this.nameNode = nameNode;
    this.schemaNode = schemaNode;
  }

  get name(): string | undefined {
    return this.nameNode?.value || this.schemaNode?.value.toString().substring(1) || 'unnamed';
  }

  get schemaName(): string | undefined {
    return this.schemaNode?.value || "$schema";
  }

  get firstChild(): SectionChild {
    return this.child;
  }

  get firstChildObject(): ObjectNode | null {
    if (this.child instanceof ObjectNode) {
      return this.child;
    }
    if (this.child instanceof CollectionNode && this.child.children.length > 0) {
      return this.child.children[0] as ObjectNode;
    }
    return null;
  }

  getStartPos(): Position {
    return this.child?.getStartPos() ?? { row: 0, col: 0, pos: 0 };
  }

  getEndPos(): Position {
    return this.child?.getEndPos() ?? { row: 0, col: 0, pos: 0 };
  }

  toValue (defs?:Definitions):any {

    let data = null;
    if (this.child) {
      data = this.child.toValue(defs);
    }

    return new Section(
      data,
      this.name,
      this.schemaName
    );
  }
}

export default SectionNode;
