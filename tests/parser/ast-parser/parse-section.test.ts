import { describe, it, expect } from "vitest";
import Tokenizer from "../../../src/parser/tokenizer";
import ASTParser from "../../../src/parser/ast-parser";
import parse from "../../../src/parser/index";
import CollectionNode from "../../../src/parser/nodes/collections";
import ObjectNode from "../../../src/parser/nodes/objects";

/** Parse a token group through the per-record seam and return values + error count. */
function seam(text: string) {
  const tokens = new Tokenizer(text).tokenize();
  const { node, errors } = ASTParser.parseSection(tokens);
  return { node, errors };
}

/** Record values (toJSON) produced by the whole-document path for the same content. */
function wholeDocValues(recordText: string): any[] {
  const doc: any = parse(`---\n${recordText}`);
  const out: any[] = [];
  for (let s = 0; s < doc.sections.length; s++) {
    const data: any = doc.sections.get(s)?.data;
    if (data == null) continue;
    if (typeof data[Symbol.iterator] === "function" && typeof data.toJSON === "function") {
      for (const item of data as any) out.push(item?.toJSON ? item.toJSON() : item);
    } else if (typeof data.toJSON === "function") {
      out.push(data.toJSON());
    }
  }
  return out;
}

function toPlain(v: any): any {
  return v && typeof v.toJSON === "function" ? v.toJSON() : v;
}

function nodeValues(node: any): any[] {
  if (node instanceof CollectionNode) {
    return node.children.map((c: any) => toPlain(c?.toValue ? c.toValue() : c));
  }
  if (node instanceof ObjectNode) {
    return [toPlain(node.toValue())];
  }
  return [];
}

describe("ASTParser.parseSection — per-record parse seam (Gap 20)", () => {
  it("parses a single `~` record into a one-item collection", () => {
    const { node, errors } = seam(`~ { id: 1, name: "Alice" }`);
    expect(errors).toHaveLength(0);
    expect(node).toBeInstanceOf(CollectionNode);
    expect(nodeValues(node)).toEqual([{ id: 1, name: "Alice" }]);
  });

  it("parses multiple `~` records in one group", () => {
    const { node, errors } = seam(`~ a, 1 ~ b, 2`);
    expect(errors).toHaveLength(0);
    expect(node).toBeInstanceOf(CollectionNode);
    expect(nodeValues(node)).toEqual([
      { "0": "a", "1": 1 },
      { "0": "b", "1": 2 },
    ]);
  });

  it("parses a single object (no `~`) as an ObjectNode", () => {
    const { node, errors } = seam(`{ id: 7 }`);
    expect(errors).toHaveLength(0);
    expect(node).toBeInstanceOf(ObjectNode);
    expect(nodeValues(node)).toEqual([{ id: 7 }]);
  });

  it("surfaces parse errors for a malformed record without throwing", () => {
    const { node, errors } = seam(`~ { BROKEN`);
    expect(errors.length).toBeGreaterThan(0);
    expect(node).toBeInstanceOf(CollectionNode); // contains an ErrorNode element
  });

  it("matches the whole-document path value-for-value", () => {
    for (const rec of [
      `~ { id: 1 }`,
      `~ { id: 1 } ~ { id: 2 }`,
      `~ Alice, 30`,
      `~ "just a string"`,
      `~ [1, 2, 3]`,
    ]) {
      expect(nodeValues(seam(rec).node)).toEqual(wholeDocValues(rec));
    }
  });
});
