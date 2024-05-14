import Tokenizer from "../src/parser/tokenizer";
import ASTParser from "../src/parser/ast-parser";
import DocumentNode from "../src/parser/nodes/document";
import SectionNode from "../src/parser/nodes/section";
import TokenNode from "../src/parser/nodes/tokens";
import ObjectNode from "../src/parser/nodes/objects";

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

  it("should parse schema with header", () => {
    const input = `
    a,b,c
    ---
    1,2,3
    `;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const ast = astParser.parse();

    expect(ast.header?.child?.children.length).toEqual(3);
    expect(ast.header?.child?.children[0]?.toValue()).toEqual("a");
    expect(ast.header?.child?.children[1]?.toValue()).toEqual("b");
    expect(ast.header?.child?.children[2]?.toValue()).toEqual("c");

    expect(ast.children[0].child?.children.length).toEqual(3);
    expect(ast.children[0].child?.children[0]?.toValue()).toEqual(1);
    expect(ast.children[0].child?.children[1]?.toValue()).toEqual(2);
    expect(ast.children[0].child?.children[2]?.toValue()).toEqual(3);
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
