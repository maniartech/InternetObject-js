import Definitions from '../../core/definitions';
import Document from '../../core/document';
import Position from '../../core/position';
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

  getStartPos(): Position {
    if (this.header) {
      return this.header.getStartPos();
    }

    if (this.children.length > 0) {
      return this.children[0].getStartPos();
    }

    return { row: 0, col: 0, pos: 0 };
  }

  getEndPos(): Position {
    if (this.children.length > 0) {
      return this.children[this.children.length - 1].getEndPos();
    }

    if (this.header) {
      return this.header.getEndPos();
    }

    return { row: 0, col: 0, pos: 0 };
  }
}

export default DocumentNode;