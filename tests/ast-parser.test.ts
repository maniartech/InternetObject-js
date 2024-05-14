import Tokenizer from "../src/parser/tokenizer";
import ASTParser from "../src/parser/ast-parser";
import DocumentNode from "../src/parser/nodes/document";
import SectionNode from "../src/parser/nodes/section";
import TokenNode from "../src/parser/nodes/tokens";
import ObjectNode from "../src/parser/nodes/objects";
import MemberNode from "../src/parser/nodes/members";
import CollectionNode from "../src/parser/nodes/collections";

describe("AST Parser", () => {
  it("should parse the document structure", () => {
    const input = `1,2,3`;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    // DocumentNode
    expect(docNode instanceof DocumentNode).toEqual(true);

    // Header is Null
    expect(docNode.header).toEqual(null);

    // DocumentNode has 1 section node
    expect(docNode.children.length).toEqual(1);
    expect(docNode.children[0] instanceof SectionNode).toEqual(true);

    // SectionNode has 1 child object node
    expect(docNode.children[0].child instanceof ObjectNode).toEqual(true);
  });

  it("should parse basic schema and document", () => {
    const input = `
    a,b,c
    ---
    1,2,3
    `;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    // DocumentNode
    expect(docNode instanceof DocumentNode).toEqual(true);

    // Header is not null
    expect(docNode.header instanceof SectionNode).toEqual(true);
    expect(docNode.header?.child instanceof ObjectNode).toEqual(true);
    expect(docNode.header?.child?.children.length).toEqual(3);
    expect(docNode.header?.child?.children[0] instanceof MemberNode).toEqual(
      true
    );

    // DocumentNode has 1 section node
    expect(docNode.children.length).toEqual(1);
    expect(docNode.children[0].child instanceof ObjectNode).toEqual(true);
    expect(docNode.children[0].child?.children.length).toEqual(3);
    expect(
      docNode.children[0].child?.children[0] instanceof MemberNode
    ).toEqual(true);
  });

  it("should parse multiple documents", () => {
    const input = `
    ~ a,b,c
    ~ 1,2,3
    ~ "a",True,"c"
    `;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    // DocumentNode
    expect(docNode instanceof DocumentNode).toEqual(true);

    // Header is null
    expect(docNode.header).toEqual(null);

    // DocumentNode has 1 section node with a collection node as a child with 3 children
    expect(docNode.children.length).toEqual(1);
    expect(docNode.children[0] instanceof SectionNode).toEqual(true);
    expect(docNode.children[0].child instanceof CollectionNode).toEqual(true);
    expect(docNode.children[0].child?.children.length).toEqual(3);
  });

  it("should parse documents in muliple sections", () => {
    const input = `
    --- hello
    ~ a,b,c
    ~ 1,2,3
    --- world
    ~ "asdf",True,"c"
    `;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    // DocumentNode
    expect(docNode instanceof DocumentNode).toEqual(true);
    expect(docNode.children.length).toEqual(2);

    // First Section
    expect(docNode.children[0] instanceof SectionNode).toEqual(true);
    expect(docNode.children[0].child?.children.length).toEqual(2);
    expect(docNode.children[0].child?.children[0] instanceof ObjectNode).toEqual(true);

    // Second Section
    expect(docNode.children[1] instanceof SectionNode).toEqual(true);
    expect(docNode.children[1].child?.children.length).toEqual(1);
    expect(docNode.children[1].child?.children[0] instanceof ObjectNode).toEqual(true);
  });

  it("should parse schema and throw error because of incorrect syntax", () => {
    const input = `
    a,b

    1,2
    `;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);

    expect(astParser.parse).toThrow();
  });
});
