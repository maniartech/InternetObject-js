import Document from '../../core/document';
import SectionCollection from '../../core/section-collection';
import Node         from './nodes';
import SectionNode  from './section';

class DocumentNode implements Node {
  header: SectionNode | null = null;
  children: Array<SectionNode> = [];

  constructor(header: SectionNode | null, children: Array<SectionNode> = []) {
    this.header = header;
    this.children = children;
  }

  toValue(): any {
    const header = this.header?.toValue() ?? null
    const sections = new SectionCollection();
    for (let i=0; i<this.children.length; i++) {
      sections.push(
        this.children[i].toValue()
      );
    }

    return new Document(header, sections);
  }
}

export default DocumentNode;