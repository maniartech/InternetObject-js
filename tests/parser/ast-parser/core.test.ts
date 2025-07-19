import ASTParser    from '../../../src/parser/ast-parser';
import DocumentNode from '../../../src/parser/nodes/document';
import MemberNode   from '../../../src/parser/nodes/members';
import ObjectNode   from '../../../src/parser/nodes/objects';
import SectionNode  from '../../../src/parser/nodes/section';
import Tokenizer    from '../../../src/parser/tokenizer';

describe("AST Parser - Core Functionality", () => {
  describe("Document Structure Parsing", () => {
    it("should parse simple document with single section", () => {
      const input = `1,2,3`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      // DocumentNode
      expect(docNode).toBeInstanceOf(DocumentNode);

      // Header is null for single section
      expect(docNode.header).toBeNull();

      // DocumentNode has 1 section node
      expect(docNode.children).toHaveLength(1);
      expect(docNode.children[0]).toBeInstanceOf(SectionNode);

      // SectionNode has 1 child object node
      expect(docNode.children[0].child).toBeInstanceOf(ObjectNode);
    });

    it("should parse document with header and data sections", () => {
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
      expect(docNode).toBeInstanceOf(DocumentNode);

      // Header is not null
      expect(docNode.header).toBeInstanceOf(SectionNode);
      expect(docNode.header?.child).toBeInstanceOf(ObjectNode);
      expect(docNode.header?.child?.children).toHaveLength(3);
      expect(docNode.header?.child?.children[0]).toBeInstanceOf(MemberNode);

      // DocumentNode has 1 data section
      expect(docNode.children).toHaveLength(1);
      expect(docNode.children[0].child).toBeInstanceOf(ObjectNode);
      expect(docNode.children[0].child?.children).toHaveLength(3);
      expect(docNode.children[0].child?.children[0]).toBeInstanceOf(MemberNode);
    });

    it("should parse document with multiple sections", () => {
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
      expect(docNode).toBeInstanceOf(DocumentNode);
      expect(docNode.children).toHaveLength(2);

      // First Section
      expect(docNode.children[0]).toBeInstanceOf(SectionNode);
      expect(docNode.children[0].child?.children).toHaveLength(2);
      expect(docNode.children[0].child?.children[0]).toBeInstanceOf(ObjectNode);

      // Second Section
      expect(docNode.children[1]).toBeInstanceOf(SectionNode);
      expect(docNode.children[1].child?.children).toHaveLength(1);
      expect(docNode.children[1].child?.children[0]).toBeInstanceOf(ObjectNode);
    });

    it("should parse empty document", () => {
      const input = ``;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      expect(docNode).toBeInstanceOf(DocumentNode);
      expect(docNode.header).toBeNull();
      expect(docNode.children).toHaveLength(1);
      expect(docNode.children[0].child).toBeNull();
    });

    it("should parse document with only section separators", () => {
      const input = `---`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      expect(docNode).toBeInstanceOf(DocumentNode);
      expect(docNode.header).toBeNull();
      expect(docNode.children).toHaveLength(1);
      expect(docNode.children[0].child).toBeNull();
    });
  });

  describe("Section Name and Schema Parsing", () => {
    it("should parse section with name only", () => {
      const input = `
      --- users
      ~ "Alice", 25
      ~ "Bob", 30
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      expect(docNode.children).toHaveLength(1);
      const section = docNode.children[0];
      expect(section.nameNode).toBeTruthy();
      expect(section.nameNode?.value).toBe("users");
      expect(section.schemaNode).toBeNull();
    });

    it("should parse section with schema only", () => {
      const input = `
      --- $userSchema
      ~ "Alice", 25
      ~ "Bob", 30
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      expect(docNode.children).toHaveLength(1);
      const section = docNode.children[0];
      expect(section.nameNode).toBeNull();
      expect(section.schemaNode).toBeTruthy();
      expect(section.schemaNode?.value).toBe("$userSchema");
    });

    it("should parse section with both name and schema", () => {
      const input = `
      --- users: $userSchema
      ~ "Alice", 25
      ~ "Bob", 30
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      expect(docNode.children).toHaveLength(1);
      const section = docNode.children[0];
      expect(section.nameNode).toBeTruthy();
      expect(section.nameNode?.value).toBe("users");
      expect(section.schemaNode).toBeTruthy();
      expect(section.schemaNode?.value).toBe("$userSchema");
    });

    it("should parse multiple schema definitions in header", () => {
      const input = `
      ~ $schema1: {a: int, b: int}
      ~ $schema2: {name: str, age: int}
      --- $schema1
      ~ 1,2
      ~ 3,4
      --- people: $schema2
      ~ "Alice", 25
      ~ "Bob", 30
      ~ "Charlie", 35
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      // DocumentNode
      expect(docNode).toBeInstanceOf(DocumentNode);
      expect(docNode.children).toHaveLength(2);

      // Header with 2 schemas
      expect(docNode.header?.child?.children).toHaveLength(2);
      expect(docNode.header?.child?.children[0]).toBeInstanceOf(ObjectNode);
      expect(docNode.header?.child?.children[1]).toBeInstanceOf(ObjectNode);

      // First Section
      expect(docNode.children[0]).toBeInstanceOf(SectionNode);
      expect(docNode.children[0].child?.children).toHaveLength(2);

      // Second Section
      expect(docNode.children[1]).toBeInstanceOf(SectionNode);
      expect(docNode.children[1].child?.children).toHaveLength(3);
    });

    it("should parse variables in header section", () => {
      const input = `
      ~ mum: "Mumbai"
      ~ del: "Delhi"
      ~ $details: {name: str, age: int, city: str}
      --- people:$details
      ~ "Alice", 25, @mum
      ~ "Bob", 30, @del
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      // DocumentNode
      expect(docNode).toBeInstanceOf(DocumentNode);
      expect(docNode.children).toHaveLength(1);

      // Header with 3 variables
      expect(docNode.header?.child?.children).toHaveLength(3);
      expect(docNode.header?.child?.children[0]).toBeInstanceOf(ObjectNode);
      expect(docNode.header?.child?.children[1]).toBeInstanceOf(ObjectNode);
      expect(docNode.header?.child?.children[2]).toBeInstanceOf(ObjectNode);

      // Section
      expect(docNode.children[0]).toBeInstanceOf(SectionNode);
      expect(docNode.children[0].child?.children).toHaveLength(2);
    });

    it("should throw error for duplicate section names", () => {
      const input = `
      --- users
      ~ "Alice", 25
      --- users
      ~ "Bob", 30
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should throw error for malformed document structure", () => {
      const input = `
        ~ $schema1: {a: int, b: int}
        --- $schema2, # comma after schema name, invalid syntax
        ~ 1,2
      `; // Reference to undefined schema

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });

    it("should throw error for unexpected tokens", () => {
      const input = `1,2,3 ~ unexpected`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });

    it("should throw error for missing section separator", () => {
      const input = `
      a,b,c
      ~ 1,2,3
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });
  });
});