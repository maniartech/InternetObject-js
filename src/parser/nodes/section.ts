import Definitions from "../../core/definitions";
import Position from "../../core/position";
import Section from "../../core/section";
import SectionCollection from "../../core/section-collection";
import CollectionNode from "./collections";
import Node           from "./nodes";
import ObjectNode from "./objects";

type SectionChild = CollectionNode | ObjectNode | null;

class SectionNode implements Node {
  type: string;
  child: SectionChild;
  name?: string;
  schemaName?: string;

  constructor(child: SectionChild, name?: string, schemaName?: string) {
    this.type = 'section';
    this.child = child;
    this.name = name;
    this.schemaName = schemaName;
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
