import Definitions from '../../core/definitions';
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

  get row(): number {
    if (this.header) return this.header.row;
    return this.children[0]?.row ?? 0;
  }

  get col(): number {
    if (this.header) return this.header.col;
    return this.children[0]?.col ?? 0;
  }

  get pos(): number {
    if (this.header) return this.header.pos;
    return this.children[0]?.pos ?? 0;
  }

  toValue(defs?: Definitions):any {
    const header = this.header?.toValue(defs) ?? null
    const sections = new SectionCollection();
    for (let i=0; i<this.children.length; i++) {
      sections.push(
        this.children[i].toValue(defs)
      );
    }

    return new Document(header, sections);
  }
}

export default DocumentNode;