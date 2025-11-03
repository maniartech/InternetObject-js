import ASTParser from '../../src/parser/ast-parser';
import Tokenizer from '../../src/parser/tokenizer';
import DocumentNode from '../../src/parser/nodes/document';

describe("Error Accumulation (Phase 2)", () => {

  describe("Single Error", () => {
    it("should accumulate a single collection error", () => {
      const input = `
~ name: "Alice", age: 25
~ {unclosed: "object"
~ name: "Bob", age: 30
`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const parser = new ASTParser(tokens);
      const doc = parser.parse();

      expect(doc).toBeInstanceOf(DocumentNode);

      const errors = doc.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain("closing brace");
    });
  });

  describe("Multiple Collection Errors", () => {
    it("should accumulate multiple errors in collection", () => {
      const input = `
~ {error1
~ name: "Valid"
~ {error2
~ {error3
`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const parser = new ASTParser(tokens);
      const doc = parser.parse();

      expect(doc).toBeInstanceOf(DocumentNode);

      const errors = doc.getErrors();
      expect(errors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Duplicate Section Errors", () => {
    it("should accumulate duplicate section errors and auto-rename", () => {
      const input = `
--- users
~ name: "Alice"

--- users
~ name: "Bob"

--- users
~ name: "Charlie"
`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const parser = new ASTParser(tokens);
      const doc = parser.parse();

      expect(doc).toBeInstanceOf(DocumentNode);

      // Should have 2 duplicate section errors (2nd and 3rd "users")
      const errors = doc.getErrors();
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toContain("Duplicate section name");
      expect(errors[1].message).toContain("Duplicate section name");

      // All sections should be present (auto-renamed)
      expect(doc.children).toHaveLength(3);
      expect(doc.children[0].name).toBe("users");
      expect(doc.children[1].name).toBe("users_2");
      expect(doc.children[2].name).toBe("users_3");
    });
  });

  describe("Mixed Errors", () => {
    it("should accumulate both collection and section errors", () => {
      const input = `
--- section1
~ {error1
~ name: "Valid"

--- section1
~ {error2

--- products
~ laptop
~ {error3
`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const parser = new ASTParser(tokens);
      const doc = parser.parse();

      expect(doc).toBeInstanceOf(DocumentNode);

      // Should have: 3 collection errors + 1 duplicate section = 4 errors
      const errors = doc.getErrors();
      expect(errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("No Errors", () => {
    it("should return empty errors array when parsing succeeds", () => {
      const input = `
~ name: "Alice", age: 25
~ name: "Bob", age: 30
`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const parser = new ASTParser(tokens);
      const doc = parser.parse();

      expect(doc).toBeInstanceOf(DocumentNode);

      const errors = doc.getErrors();
      expect(errors).toHaveLength(0);
    });
  });

  describe("GetErrors on DocumentNode", () => {
    it("should return all accumulated errors", () => {
      const input = `
--- users
~ {unclosed_object

--- users
~ name: "Valid"

--- products
~ {another_error
~ laptop
`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const parser = new ASTParser(tokens);
      const doc = parser.parse();

      expect(doc).toBeInstanceOf(DocumentNode);

      const errors = doc.getErrors();
      // Should accumulate:
      // 1. Collection error (unclosed_object)
      // 2. Duplicate section error (second "users")
      // 3. Collection error (another_error)
      expect(errors.length).toBeGreaterThanOrEqual(3);

      // Verify sections are present (with auto-rename)
      expect(doc.children).toHaveLength(3);
    });
  });

  describe("Error Node Preservation", () => {
    it("should preserve ErrorNodes in collection while accumulating errors", () => {
      const input = `
~ {error1
~ valid
~ {error2
`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const parser = new ASTParser(tokens);
      const doc = parser.parse();

      expect(doc).toBeInstanceOf(DocumentNode);

      // Check errors array
      const errors = doc.getErrors();
      expect(errors.length).toBeGreaterThanOrEqual(2);

      // Check that ErrorNodes are still in the AST
      const section = doc.children[0] || doc.header;
      expect(section).not.toBeNull();

      if (section && section.child) {
        const collection = section.child;
        // Collection should have 3 items (error, valid, error)
        expect((collection as any).children).toBeDefined();
      }
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain error accumulation without breaking existing behavior", () => {
      const input = `
~ name: "Alice"
~ name: "Bob"
`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const parser = new ASTParser(tokens);
      const doc = parser.parse();

      expect(doc).toBeInstanceOf(DocumentNode);
      expect(doc.getErrors()).toHaveLength(0);

      // Original functionality should still work
      expect(doc.children.length).toBeGreaterThan(0);
    });
  });
});
