import Definitions from "../../core/definitions";
import { Position } from '../../core/positions';
import Section, { DEFAULT_SECTION_NAME } from "../../core/section";
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

  /**
   * The name the PARSER resolved for this section — including the `data` default and any
   * duplicate-recovery rename (`data_2`, `users_2`, …).
   *
   * It is stored rather than re-derived because an unnamed section has no `nameNode` to write a
   * rename back into. A getter that re-derived the name would silently discard the parser's
   * decision, leaving two sections reporting the same name — and since sections are projected
   * into an object keyed by name, the second would overwrite the first (ISSUE-18).
   */
  resolvedName: string | undefined;

  constructor(
    child: SectionChild,
    nameNode: TokenNode | null,
    schemaNode: TokenNode | null,
    resolvedName?: string
  ) {
    this.type = 'section';
    this.child = child;
    this.nameNode = nameNode;
    this.schemaNode = schemaNode;
    this.resolvedName = resolvedName;
  }

  get name(): string | undefined {
    // The parser's decision wins whenever it made one; the derivation below is the fallback for
    // SectionNodes built directly (tests, error-recovery placeholders).
    if (this.resolvedName !== undefined) return this.resolvedName;
    return (this.nameNode?.value as string | undefined)
      || this.schemaNode?.value?.toString().substring(1)
      || DEFAULT_SECTION_NAME;
  }

  get schemaName(): string | undefined {
    return (this.schemaNode?.value as string | undefined) || "$schema";
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
    return this.child?.getStartPos() ?? Position.unknown;
  }

  getEndPos(): Position {
    return this.child?.getEndPos() ?? Position.unknown;
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
