import DocumentNode from "../../../src/parser/nodes/document";
import SectionNode from "../../../src/parser/nodes/section";
import ObjectNode from "../../../src/parser/nodes/objects";
import CollectionNode from "../../../src/parser/nodes/collections";
import MemberNode from "../../../src/parser/nodes/members";
import TokenNode from "../../../src/parser/nodes/tokens";
import Token from "../../../src/parser/tokenizer/tokens";
import TokenType from "../../../src/parser/tokenizer/token-types";
import Document from "../../../src/core/document";
import SectionCollection from "../../../src/core/section-collection";

describe("DocumentNode", () => {
  // Helper function to create a mock token
  const createMockToken = (type: TokenType, value: any, pos: number = 0): Token => {
    const token = new Token();
    token.type = type;
    token.value = value;
    token.token = value.toString();
    token.pos = pos;
    token.row = 1;
    token.col = pos + 1;
    return token;
  };

  // Helper function to create a simple section
  const createSimpleSection = (name: string = "test"): SectionNode => {
    const nameToken = new TokenNode(createMockToken(TokenType.STRING, name, 0));
    const valueMember = new MemberNode(new TokenNode(createMockToken(TokenType.STRING, "value", 5)));
    const objectNode = new ObjectNode([valueMember]);
    return new SectionNode(objectNode, nameToken, null);
  };

  describe("Constructor", () => {
    it("should create DocumentNode with no header and no sections", () => {
      const docNode = new DocumentNode(null, []);
      
      expect(docNode.header).toBeNull();
      expect(docNode.children).toHaveLength(0);
    });

    it("should create DocumentNode with header but no sections", () => {
      const headerSection = createSimpleSection("header");
      const docNode = new DocumentNode(headerSection, []);
      
      expect(docNode.header).toBe(headerSection);
      expect(docNode.children).toHaveLength(0);
    });

    it("should create DocumentNode with no header but with sections", () => {
      const section1 = createSimpleSection("section1");
      const section2 = createSimpleSection("section2");
      const docNode = new DocumentNode(null, [section1, section2]);
      
      expect(docNode.header).toBeNull();
      expect(docNode.children).toHaveLength(2);
      expect(docNode.children[0]).toBe(section1);
      expect(docNode.children[1]).toBe(section2);
    });

    it("should create DocumentNode with both header and sections", () => {
      const headerSection = createSimpleSection("header");
      const section1 = createSimpleSection("section1");
      const section2 = createSimpleSection("section2");
      const docNode = new DocumentNode(headerSection, [section1, section2]);
      
      expect(docNode.header).toBe(headerSection);
      expect(docNode.children).toHaveLength(2);
      expect(docNode.children[0]).toBe(section1);
      expect(docNode.children[1]).toBe(section2);
    });
  });

  describe("firstChild getter", () => {
    it("should return null when no sections exist", () => {
      const docNode = new DocumentNode(null, []);
      
      expect(docNode.firstChild).toBeNull();
    });

    it("should return first section when sections exist", () => {
      const section1 = createSimpleSection("section1");
      const section2 = createSimpleSection("section2");
      const docNode = new DocumentNode(null, [section1, section2]);
      
      expect(docNode.firstChild).toBe(section1);
    });

    it("should return first section even when header exists", () => {
      const headerSection = createSimpleSection("header");
      const section1 = createSimpleSection("section1");
      const docNode = new DocumentNode(headerSection, [section1]);
      
      expect(docNode.firstChild).toBe(section1);
    });
  });

  describe("toValue", () => {
    it("should convert to Document with null header and empty sections", () => {
      const docNode = new DocumentNode(null, []);
      const result = docNode.toValue();
      
      expect(result).toBeInstanceOf(Document);
      expect(result.header).toBeNull();
      expect(result.sections).toBeInstanceOf(SectionCollection);
      expect(result.sections.length).toBe(0);
    });

    it("should convert to Document with header", () => {
      const headerSection = createSimpleSection("header");
      const docNode = new DocumentNode(headerSection, []);
      const result = docNode.toValue();
      
      expect(result).toBeInstanceOf(Document);
      expect(result.header).not.toBeNull();
      expect(result.sections).toBeInstanceOf(SectionCollection);
      expect(result.sections.length).toBe(0);
    });

    it("should convert to Document with sections", () => {
      const section1 = createSimpleSection("section1");
      const section2 = createSimpleSection("section2");
      const docNode = new DocumentNode(null, [section1, section2]);
      const result = docNode.toValue();
      
      expect(result).toBeInstanceOf(Document);
      expect(result.header).toBeNull();
      expect(result.sections).toBeInstanceOf(SectionCollection);
      expect(result.sections.length).toBe(2);
    });

    it("should convert to Document with both header and sections", () => {
      const headerSection = createSimpleSection("header");
      const section1 = createSimpleSection("section1");
      const section2 = createSimpleSection("section2");
      const docNode = new DocumentNode(headerSection, [section1, section2]);
      const result = docNode.toValue();
      
      expect(result).toBeInstanceOf(Document);
      expect(result.header).not.toBeNull();
      expect(result.sections).toBeInstanceOf(SectionCollection);
      expect(result.sections.length).toBe(2);
    });

    it("should handle sections with collections", () => {
      const obj1 = new ObjectNode([new MemberNode(new TokenNode(createMockToken(TokenType.STRING, "value1", 0)))]);
      const obj2 = new ObjectNode([new MemberNode(new TokenNode(createMockToken(TokenType.STRING, "value2", 5)))]);
      const collection = new CollectionNode([obj1, obj2]);
      const sectionWithCollection = new SectionNode(collection, null, null);
      
      const docNode = new DocumentNode(null, [sectionWithCollection]);
      const result = docNode.toValue();
      
      expect(result).toBeInstanceOf(Document);
      expect(result.sections.length).toBe(1);
    });
  });

  describe("Position Tracking", () => {
    it("should return header start position when header exists", () => {
      const headerSection = createSimpleSection("header");
      const section1 = createSimpleSection("section1");
      const docNode = new DocumentNode(headerSection, [section1]);
      
      const startPos = docNode.getStartPos();
      expect(startPos).toEqual(headerSection.getStartPos());
    });

    it("should return first section start position when no header", () => {
      const section1 = createSimpleSection("section1");
      const section2 = createSimpleSection("section2");
      const docNode = new DocumentNode(null, [section1, section2]);
      
      const startPos = docNode.getStartPos();
      expect(startPos).toEqual(section1.getStartPos());
    });

    it("should return default position when no header and no sections", () => {
      const docNode = new DocumentNode(null, []);
      
      const startPos = docNode.getStartPos();
      expect(startPos).toEqual({ row: 0, col: 0, pos: 0 });
    });

    it("should return last section end position when sections exist", () => {
      const headerSection = createSimpleSection("header");
      const section1 = createSimpleSection("section1");
      const section2 = createSimpleSection("section2");
      const docNode = new DocumentNode(headerSection, [section1, section2]);
      
      const endPos = docNode.getEndPos();
      expect(endPos).toEqual(section2.getEndPos());
    });

    it("should return header end position when no sections", () => {
      const headerSection = createSimpleSection("header");
      const docNode = new DocumentNode(headerSection, []);
      
      const endPos = docNode.getEndPos();
      expect(endPos).toEqual(headerSection.getEndPos());
    });

    it("should return default position when no header and no sections for end", () => {
      const docNode = new DocumentNode(null, []);
      
      const endPos = docNode.getEndPos();
      expect(endPos).toEqual({ row: 0, col: 0, pos: 0 });
    });
  });

  describe("Complex Document Structures", () => {
    it("should handle document with schema definitions in header", () => {
      // Create header with schema definitions
      const schemaMember1 = new MemberNode(
        new ObjectNode([]), 
        new TokenNode(createMockToken(TokenType.STRING, "$userSchema", 0))
      );
      const schemaMember2 = new MemberNode(
        new ObjectNode([]), 
        new TokenNode(createMockToken(TokenType.STRING, "$productSchema", 20))
      );
      const headerObj = new ObjectNode([schemaMember1, schemaMember2]);
      const headerSection = new SectionNode(headerObj, null, null);

      // Create data sections
      const dataSection1 = createSimpleSection("users");
      const dataSection2 = createSimpleSection("products");

      const docNode = new DocumentNode(headerSection, [dataSection1, dataSection2]);
      const result = docNode.toValue();

      expect(result).toBeInstanceOf(Document);
      expect(result.header).not.toBeNull();
      expect(result.sections.length).toBe(2);
    });

    it("should handle document with collection sections", () => {
      // Create collection with multiple objects
      const obj1 = new ObjectNode([
        new MemberNode(new TokenNode(createMockToken(TokenType.STRING, "Alice", 0)), 
                      new TokenNode(createMockToken(TokenType.STRING, "name", 0)))
      ]);
      const obj2 = new ObjectNode([
        new MemberNode(new TokenNode(createMockToken(TokenType.STRING, "Bob", 10)), 
                      new TokenNode(createMockToken(TokenType.STRING, "name", 10)))
      ]);
      
      const collection = new CollectionNode([obj1, obj2]);
      const collectionSection = new SectionNode(collection, 
        new TokenNode(createMockToken(TokenType.STRING, "users", 0)), null);

      const docNode = new DocumentNode(null, [collectionSection]);
      const result = docNode.toValue();

      expect(result).toBeInstanceOf(Document);
      expect(result.sections.length).toBe(1);
    });

    it("should handle empty sections", () => {
      const emptySection = new SectionNode(null, 
        new TokenNode(createMockToken(TokenType.STRING, "empty", 0)), null);
      
      const docNode = new DocumentNode(null, [emptySection]);
      const result = docNode.toValue();

      expect(result).toBeInstanceOf(Document);
      expect(result.sections.length).toBe(1);
    });
  });

  describe("Edge Cases", () => {
    it("should handle document with many sections", () => {
      const sections = Array.from({ length: 100 }, (_, i) => 
        createSimpleSection(`section${i}`)
      );
      
      const docNode = new DocumentNode(null, sections);
      
      expect(docNode.children).toHaveLength(100);
      expect(docNode.firstChild).toBe(sections[0]);
      
      const result = docNode.toValue();
      expect(result.sections.length).toBe(100);
    });

    it("should handle document with header containing complex nested structures", () => {
      // Create nested object in header
      const innerObj = new ObjectNode([
        new MemberNode(new TokenNode(createMockToken(TokenType.NUMBER, 25, 0)), 
                      new TokenNode(createMockToken(TokenType.STRING, "age", 0)))
      ]);
      const outerMember = new MemberNode(innerObj, 
        new TokenNode(createMockToken(TokenType.STRING, "details", 0)));
      const headerObj = new ObjectNode([outerMember]);
      const headerSection = new SectionNode(headerObj, null, null);

      const docNode = new DocumentNode(headerSection, []);
      const result = docNode.toValue();

      expect(result).toBeInstanceOf(Document);
      expect(result.header).not.toBeNull();
    });

    it("should maintain section order", () => {
      const section1 = createSimpleSection("first");
      const section2 = createSimpleSection("second");
      const section3 = createSimpleSection("third");
      
      const docNode = new DocumentNode(null, [section1, section2, section3]);
      
      expect(docNode.children[0]).toBe(section1);
      expect(docNode.children[1]).toBe(section2);
      expect(docNode.children[2]).toBe(section3);
      
      const result = docNode.toValue();
      expect(result.sections.length).toBe(3);
    });
  });
});