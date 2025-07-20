import ASTParser        from "../../src/parser/ast-parser";
import CollectionNode   from "../../src/parser/nodes/collections";
import DocumentNode     from "../../src/parser/nodes/document";
import ErrorNode        from "../../src/parser/nodes/error";
import ObjectNode       from "../../src/parser/nodes/objects";
import SectionNode      from "../../src/parser/nodes/section";
import Tokenizer        from "../../src/parser/tokenizer";

describe("Collection Error Recovery", () => {
  it("should skip invalid object and continue to next ~ token", () => {
    const input = `
    ~ valid, object, here
    ~ invalid { unclosed object
    ~ another, valid, object
    `;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    // DocumentNode should be created successfully
    expect(docNode instanceof DocumentNode).toBe(true);
    expect(docNode.children.length).toBe(1);

    // Section should contain a collection
    const section = docNode.children[0] as SectionNode;
    expect(section.child instanceof CollectionNode).toBe(true);

    const collection = section.child as CollectionNode;
    expect(collection.children.length).toBe(3);

    // First object should be valid
    expect(collection.children[0] instanceof ObjectNode).toBe(true);

    // Second object should be an ErrorNode
    expect(collection.children[1] instanceof ErrorNode).toBe(true);

    // Third object should be valid
    expect(collection.children[2] instanceof ObjectNode).toBe(true);
  });

  it("should handle multiple consecutive errors in collection", () => {
    const input = `
    ~ valid, object
    ~ invalid { unclosed
    ~ another { invalid
    ~ final, valid, object
    `;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    const section = docNode.children[0] as SectionNode;
    const collection = section.child as CollectionNode;

    expect(collection.children.length).toBe(4);
    expect(collection.children[0] instanceof ObjectNode).toBe(true);
    expect(collection.children[1] instanceof ErrorNode).toBe(true);
    expect(collection.children[2] instanceof ErrorNode).toBe(true);
    expect(collection.children[3] instanceof ObjectNode).toBe(true);
  });

  it("should handle error at the end of collection", () => {
    const input = `
    ~ valid, object
    ~ another, valid
    ~ invalid { unclosed
    `;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    const section = docNode.children[0] as SectionNode;
    const collection = section.child as CollectionNode;

    expect(collection.children.length).toBe(3);
    expect(collection.children[0] instanceof ObjectNode).toBe(true);
    expect(collection.children[1] instanceof ObjectNode).toBe(true);
    expect(collection.children[2] instanceof ErrorNode).toBe(true);
  });

  it("should handle error at the beginning of collection", () => {
    const input = `
    ~ invalid { unclosed
    ~ valid, object
    ~ another, valid
    `;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    const section = docNode.children[0] as SectionNode;
    const collection = section.child as CollectionNode;

    expect(collection.children.length).toBe(3);
    expect(collection.children[0] instanceof ErrorNode).toBe(true);
    expect(collection.children[1] instanceof ObjectNode).toBe(true);
    expect(collection.children[2] instanceof ObjectNode).toBe(true);
  });

  it("should handle collection with only invalid objects", () => {
    const input = `
    ~ invalid { unclosed
    ~ another { invalid
    `;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    const section = docNode.children[0] as SectionNode;
    const collection = section.child as CollectionNode;

    expect(collection.children.length).toBe(2);
    expect(collection.children[0] instanceof ErrorNode).toBe(true);
    expect(collection.children[1] instanceof ErrorNode).toBe(true);
  });

  it("should handle errors in collections across multiple sections", () => {
    const input = `
    --- section1
    ~ valid, object
    ~ invalid { unclosed
    --- section2
    ~ another, valid
    ~ also { invalid
    ~ final, valid
    `;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    expect(docNode.children.length).toBe(2);

    // First section
    const section1 = docNode.children[0] as SectionNode;
    const collection1 = section1.child as CollectionNode;
    expect(collection1.children.length).toBe(2);
    expect(collection1.children[0] instanceof ObjectNode).toBe(true);
    expect(collection1.children[1] instanceof ErrorNode).toBe(true);

    // Second section
    const section2 = docNode.children[1] as SectionNode;
    const collection2 = section2.child as CollectionNode;
    expect(collection2.children.length).toBe(3);
    expect(collection2.children[0] instanceof ObjectNode).toBe(true);
    expect(collection2.children[1] instanceof ErrorNode).toBe(true);
    expect(collection2.children[2] instanceof ObjectNode).toBe(true);
  });

  it("should create ErrorNode with proper error information", () => {
    const input = `
    ~ valid, object
    ~ invalid { unclosed
    `;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    const section = docNode.children[0] as SectionNode;
    const collection = section.child as CollectionNode;
    const errorNode = collection.children[1] as ErrorNode;

    expect(errorNode instanceof ErrorNode).toBe(true);
    expect(errorNode.error).toBeDefined();
    expect(errorNode.position).toBeDefined();
    expect(errorNode.position.row).toBeGreaterThan(0);
    expect(errorNode.position.col).toBeGreaterThan(0);

    // Test toValue method
    const errorValue = errorNode.toValue();
    expect(errorValue.__error).toBe(true);
    expect(errorValue.message).toBeDefined();
    expect(errorValue.position).toBeDefined();
  });

  it("should handle mixed valid and invalid nested objects", () => {
    const input = `
    ~ {name: "Alice", age: 25}
    ~ {name: "Bob", age:
    ~ {name: "Charlie", age: 35}
    `;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    const section = docNode.children[0] as SectionNode;
    const collection = section.child as CollectionNode;

    expect(collection.children.length).toBe(3);
    expect(collection.children[0] instanceof ObjectNode).toBe(true);
    expect(collection.children[1] instanceof ErrorNode).toBe(true);
    expect(collection.children[2] instanceof ObjectNode).toBe(true);
  });

  it("should handle errors with various invalid syntax patterns", () => {
    const input = `
    ~ valid, simple, object
    ~ {unclosed: "object"
    ~ [unclosed, array
    ~ "unclosed string
    `;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    const section = docNode.children[0] as SectionNode;
    const collection = section.child as CollectionNode;

    expect(collection.children.length).toBe(4);
    expect(collection.children[0] instanceof ObjectNode).toBe(true);
    expect(collection.children[1] instanceof ErrorNode).toBe(true);
    expect(collection.children[2] instanceof ErrorNode).toBe(true);
    expect(collection.children[3] instanceof ErrorNode).toBe(true);
  });

  it("should handle simple valid collection after errors", () => {
    const input = `
    ~ valid, simple, object
    ~ {unclosed: "object"
    ~ another, valid, object
    `;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    const section = docNode.children[0] as SectionNode;
    const collection = section.child as CollectionNode;

    expect(collection.children.length).toBe(3);
    expect(collection.children[0] instanceof ObjectNode).toBe(true);
    expect(collection.children[1] instanceof ErrorNode).toBe(true);
    expect(collection.children[2] instanceof ObjectNode).toBe(true);
  });
});