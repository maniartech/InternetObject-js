import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

describe("Section Separator Parsing", () => {
  describe("Basic Section Separators", () => {
    it("should parse basic section separator", () => {
      const input = `---`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
      expect(tokens[0].value).toBe("---");
    });

    it("should parse section separator with trailing content", () => {
      const input = `--- content after`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
      expect(tokens[0].value).toBe("---");
    });
  });

  describe("Section Separators with Names", () => {
    it("should parse section separator with name", () => {
      const input = `--- section_name`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
      
      const nameToken = tokens.find(t => t.type === TokenType.STRING && t.subType === TokenType.SECTION_NAME);
      expect(nameToken).toBeDefined();
      expect(nameToken?.value).toBe("section_name");
    });

    it("should handle section names with various characters", () => {
      const input = `--- my_section-123`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
      
      const nameToken = tokens.find(t => t.subType === TokenType.SECTION_NAME);
      expect(nameToken).toBeDefined();
      expect(nameToken?.value).toBe("my_section-123");
    });

    it("should handle section names with Unicode characters", () => {
      const input = `--- 测试_section`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
      
      const nameToken = tokens.find(t => t.subType === TokenType.SECTION_NAME);
      expect(nameToken).toBeDefined();
      expect(nameToken?.value).toBe("测试_section");
    });
  });

  describe("Section Separators with Schemas", () => {
    it("should parse section separator with schema", () => {
      const input = `--- $MySchema`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
      
      const schemaToken = tokens.find(t => t.type === TokenType.STRING && t.subType === TokenType.SECTION_SCHEMA);
      expect(schemaToken).toBeDefined();
      expect(schemaToken?.value).toBe("$MySchema");
    });

    it("should handle schema names with various characters", () => {
      const input = `--- $My_Schema-123`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
      
      const schemaToken = tokens.find(t => t.subType === TokenType.SECTION_SCHEMA);
      expect(schemaToken).toBeDefined();
      expect(schemaToken?.value).toBe("$My_Schema-123");
    });

    it("should handle schema names with Unicode characters", () => {
      const input = `--- $测试Schema`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBeGreaterThanOrEqual(2);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
      
      const schemaToken = tokens.find(t => t.subType === TokenType.SECTION_SCHEMA);
      expect(schemaToken).toBeDefined();
      expect(schemaToken?.value).toBe("$测试Schema");
    });
  });

  describe("Section Separators with Names and Schemas", () => {
    it("should parse section separator with name and schema", () => {
      const input = `--- section_name: $MySchema`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBeGreaterThanOrEqual(3);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
      
      const nameToken = tokens.find(t => t.type === TokenType.STRING && t.subType === TokenType.SECTION_NAME);
      const schemaToken = tokens.find(t => t.type === TokenType.STRING && t.subType === TokenType.SECTION_SCHEMA);
      
      expect(nameToken).toBeDefined();
      expect(nameToken?.value).toBe("section_name");
      expect(schemaToken).toBeDefined();
      expect(schemaToken?.value).toBe("$MySchema");
    });

    it("should handle whitespace around colon in name:schema format", () => {
      const input = `--- section_name : $MySchema`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBeGreaterThanOrEqual(3);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
      
      const nameToken = tokens.find(t => t.subType === TokenType.SECTION_NAME);
      const schemaToken = tokens.find(t => t.subType === TokenType.SECTION_SCHEMA);
      
      expect(nameToken).toBeDefined();
      expect(nameToken?.value).toBe("section_name");
      expect(schemaToken).toBeDefined();
      expect(schemaToken?.value).toBe("$MySchema");
    });

    it("should handle complex name and schema combinations", () => {
      const input = `--- my_complex-section_123: $Complex_Schema-456`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBeGreaterThanOrEqual(3);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
      
      const nameToken = tokens.find(t => t.subType === TokenType.SECTION_NAME);
      const schemaToken = tokens.find(t => t.subType === TokenType.SECTION_SCHEMA);
      
      expect(nameToken).toBeDefined();
      expect(nameToken?.value).toBe("my_complex-section_123");
      expect(schemaToken).toBeDefined();
      expect(schemaToken?.value).toBe("$Complex_Schema-456");
    });
  });

  describe("Section Separators in Context", () => {
    it("should handle section separators followed by content", () => {
      const input = `--- section_name
        "content here"
        123, true`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const sectionToken = tokens.find(t => t.type === TokenType.SECTION_SEP);
      const nameToken = tokens.find(t => t.subType === TokenType.SECTION_NAME);
      const stringToken = tokens.find(t => t.type === TokenType.STRING && t.subType === "REGULAR_STRING");
      const numberToken = tokens.find(t => t.type === TokenType.NUMBER);
      const booleanToken = tokens.find(t => t.type === TokenType.BOOLEAN);

      expect(sectionToken).toBeDefined();
      expect(nameToken).toBeDefined();
      expect(stringToken).toBeDefined();
      expect(numberToken).toBeDefined();
      expect(booleanToken).toBeDefined();
    });

    it("should handle section separators followed by annotated strings", () => {
      const input = `--- section_name
        r"raw content"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const sectionToken = tokens.find(t => t.type === TokenType.SECTION_SEP);
      const nameToken = tokens.find(t => t.subType === TokenType.SECTION_NAME);
      const rawToken = tokens.find(t => t.subType === "RAW_STRING");

      expect(sectionToken).toBeDefined();
      expect(nameToken).toBeDefined();
      expect(rawToken).toBeDefined();
      expect(rawToken?.value).toBe("raw content");
    });

    it("should handle multiple sections with different content types", () => {
      const input = `--- section1
        "regular string"
        --- section2: $Schema
        123, true`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const sectionTokens = tokens.filter(t => t.type === TokenType.SECTION_SEP);
      const stringTokens = tokens.filter(t => t.type === TokenType.STRING);
      const numberTokens = tokens.filter(t => t.type === TokenType.NUMBER);
      const booleanTokens = tokens.filter(t => t.type === TokenType.BOOLEAN);

      expect(sectionTokens).toHaveLength(2);
      expect(stringTokens.length).toBeGreaterThanOrEqual(3); // section names + regular string
      expect(numberTokens).toHaveLength(1);
      expect(booleanTokens).toHaveLength(1);
    });
  });

  describe("Section Separator Positioning", () => {
    it("should track section separator positions correctly", () => {
      const input = `--- section1
--- section2`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const sectionTokens = tokens.filter(t => t.type === TokenType.SECTION_SEP);
      expect(sectionTokens).toHaveLength(2);
      
      expect(sectionTokens[0].pos).toBe(0);
      expect(sectionTokens[0].row).toBe(1);
      expect(sectionTokens[0].col).toBe(1);
      
      expect(sectionTokens[1].row).toBe(2);
      expect(sectionTokens[1].col).toBe(1);
    });

    it("should track positions of section names and schemas", () => {
      const input = `--- name: $Schema`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const sectionToken = tokens.find(t => t.type === TokenType.SECTION_SEP);
      const nameToken = tokens.find(t => t.subType === TokenType.SECTION_NAME);
      const schemaToken = tokens.find(t => t.subType === TokenType.SECTION_SCHEMA);

      expect(sectionToken?.pos).toBe(0);
      expect(nameToken?.pos).toBeGreaterThan(3);
      expect(schemaToken?.pos).toBeGreaterThan(nameToken?.pos || 0);
    });
  });

  describe("Section Separator Edge Cases", () => {
    it("should handle section separator at start of input", () => {
      const input = `---section`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens.length).toBeGreaterThanOrEqual(1);
      expect(tokens[0].type).toBe(TokenType.SECTION_SEP);
    });

    it("should handle section separator at end of input", () => {
      const input = `content
---`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const sectionToken = tokens.find(t => t.type === TokenType.SECTION_SEP);
      expect(sectionToken).toBeDefined();
    });

    it("should handle multiple consecutive section separators", () => {
      const input = `---
---
---`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const sectionTokens = tokens.filter(t => t.type === TokenType.SECTION_SEP);
      expect(sectionTokens).toHaveLength(3);
    });

    it("should distinguish section separators from regular dashes", () => {
      const input = `-- not-a-separator, --- real-separator`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const sectionTokens = tokens.filter(t => t.type === TokenType.SECTION_SEP);
      expect(sectionTokens).toHaveLength(1);
      
      // The first part should be parsed as open string
      const openStringTokens = tokens.filter(t => t.subType === "OPEN_STRING");
      expect(openStringTokens.length).toBeGreaterThan(0);
    });
  });

  describe("Section Separator Error Handling", () => {
    it("should handle malformed section definitions gracefully", () => {
      const input = `--- name: 
        content`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // Should still parse the section separator and name
      const sectionToken = tokens.find(t => t.type === TokenType.SECTION_SEP);
      const nameToken = tokens.find(t => t.subType === TokenType.SECTION_NAME);
      
      expect(sectionToken).toBeDefined();
      expect(nameToken).toBeDefined();
    });

    it("should handle invalid schema names", () => {
      const input = `--- section: invalid_schema`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // Should parse section separator and name, but schema might be treated differently
      const sectionToken = tokens.find(t => t.type === TokenType.SECTION_SEP);
      const nameToken = tokens.find(t => t.subType === TokenType.SECTION_NAME);
      
      expect(sectionToken).toBeDefined();
      expect(nameToken).toBeDefined();
    });

    it("should continue parsing after section separator errors", () => {
      const input = `--- invalid: 
        "valid content", 123`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const stringToken = tokens.find(t => t.type === TokenType.STRING && t.subType === "REGULAR_STRING");
      const numberToken = tokens.find(t => t.type === TokenType.NUMBER);
      
      expect(stringToken).toBeDefined();
      expect(stringToken?.value).toBe("valid content");
      expect(numberToken).toBeDefined();
      expect(numberToken?.value).toBe(123);
    });
  });
});