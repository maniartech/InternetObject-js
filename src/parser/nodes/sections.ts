import CollectionNode from "./collections";
import Node           from "./nodes";
import ObjectNode from "./objects";

type SectionChild = CollectionNode | ObjectNode | null;

class SectionNode implements Node {
  type: string;
  child: SectionChild;

  name?: string;
  alias?: string;

  constructor(child: SectionChild, name?: string, alias?: string) {
    this.type = 'section';
    this.child = child;

    if (name) {
      this.name = name;
    }

    if (alias) {
      this.alias = alias;
    }
  }

  toValue: () => any = () => {
    const ret:any = {
      child: this.child?.toValue(),
    };

    if (this.name) {
      ret.name = this.name;
    }

    if (this.alias) {
      ret.alias = this.alias;
    }

    return ret;
  }
}

export default SectionNode;
