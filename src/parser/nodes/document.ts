import Node         from './nodes';
import SectionNode  from './sections';

class DocumentNode implements Node {
  header: SectionNode | null = null;
  children: Array<SectionNode> = [];

  constructor(header: SectionNode | null, children: Array<SectionNode> = []) {
    this.header = header;
    this.children = children;
  }

  toValue: () => any = () => {
    return {
      header: this.header?.toValue() ?? null,
      sections: this.children.map((child) => {
        return child.toValue();
      })
    }
  }
}

export default DocumentNode;