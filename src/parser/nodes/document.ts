import Definitions from '../../core/definitions';
import Document from '../../core/document';
import { Position } from '../../core/positions';
import SectionCollection from '../../core/section-collection';
import Node         from './nodes';
import SectionNode  from './section';

class DocumentNode implements Node {
  header: SectionNode | null = null;
  children: Array<SectionNode> = [];
  private errors: Error[] = []; // Accumulated errors during parsing

  constructor(header: SectionNode | null, children: Array<SectionNode> = [], errors: Error[] = []) {
    this.header = header;
    this.children = children;
    this.errors = errors;
  }

  get firstChild(): SectionNode | null {
    return this.children.length > 0 ? this.children[0] : null;
  }

  /**
   * Returns all errors accumulated during parsing.
   * This enables IDEs and tools to show all diagnostics in one pass.
   */
  getErrors(): Error[] {
    return this.errors;
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

    return Position.unknown;
  }

  getEndPos(): Position {
    if (this.children.length > 0) {
      return this.children[this.children.length - 1].getEndPos();
    }

    if (this.header) {
      return this.header.getEndPos();
    }

    return Position.unknown;
  }
}

export default DocumentNode;