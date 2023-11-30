import Definitions from "../../core/definitions";
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

  get row(): number {
    if (this.child) return this.child.row;
    return 0;
  }

  get col(): number {
    if (this.child) return this.child.col;
    return 0;
  }

  get pos(): number {
    if (this.child) return this.child.pos;
    return 0;
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
