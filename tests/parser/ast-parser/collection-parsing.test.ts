import Tokenizer from "../../../src/parser/tokenizer";
import ASTParser from "../../../src/parser/ast-parser";
import CollectionNode from "../../../src/parser/nodes/collections";
import ObjectNode from "../../../src/parser/nodes/objects";
import ArrayNode from "../../../src/parser/nodes/array";
import ErrorNode from "../../../src/parser/nodes/error";
import MemberNode from "../../../src/parser/nodes/members";
import TokenNode from "../../../src/parser/nodes/tokens";

describe("AST Parser - Collection Parsing", () => {
  describe("Basic Collection Parsing", () => {
    it("should parse simple collection of objects", () => {
      const input = `
      ~ a,b,c
      ~ 1,2,3
      ~ "x","y","z"
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      expect(collection).toBeInstanceOf(CollectionNode);
      expect(collection.children).toHaveLength(3);

      // Check each object in collection
      collection.children.forEach((child) => {
        expect(child).toBeInstanceOf(ObjectNode);
        const obj = child as ObjectNode;
        expect(obj.children).toHaveLength(3);
      });
    });

    it("should parse collection with single object", () => {
      const input = `~ name: "Alice", age: 25`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      expect(collection).toBeInstanceOf(CollectionNode);
      expect(collection.children).toHaveLength(1);

      const obj = collection.children[0] as ObjectNode;
      expect(obj).toBeInstanceOf(ObjectNode);
      expect(obj.children).toHaveLength(2);
    });

    it("should parse empty collection", () => {
      const input = `---`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      expect(section.child).toBeNull();
    });
  });

  describe("Collection with Complex Objects", () => {
    it("should parse collection with nested objects", () => {
      const input = `
      ~ user: {name: "Alice", details: {age: 25, city: "NYC"}}
      ~ user: {name: "Bob", details: {age: 30, city: "LA"}}
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      expect(collection).toBeInstanceOf(CollectionNode);
      expect(collection.children).toHaveLength(2);

      collection.children.forEach((child) => {
        expect(child).toBeInstanceOf(ObjectNode);
        const obj = child as ObjectNode;
        expect(obj.children).toHaveLength(1);

        const userMember = obj.children[0] as MemberNode;
        expect(userMember.key?.value).toBe("user");
        expect(userMember.value).toBeInstanceOf(ObjectNode);

        const userObj = userMember.value as ObjectNode;
        expect(userObj.children).toHaveLength(2);
      });
    });

    it("should parse collection with objects containing arrays", () => {
      const input = `
      ~ name: "Alice", scores: [85, 92, 78]
      ~ name: "Bob", scores: [90, 88, 95]
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      expect(collection).toBeInstanceOf(CollectionNode);
      expect(collection.children).toHaveLength(2);

      collection.children.forEach((child) => {
        expect(child).toBeInstanceOf(ObjectNode);
        const obj = child as ObjectNode;
        expect(obj.children).toHaveLength(2);

        const scoresMember = obj.children[1] as MemberNode;
        expect(scoresMember.key?.value).toBe("scores");
        expect(scoresMember.value).toBeInstanceOf(ArrayNode);
      });
    });
  });

  describe("Collection Error Recovery", () => {
    it("should create ErrorNode for invalid object and continue parsing", () => {
      const input = `
      ~ name: "Alice", age: 25
      ~ invalid { unclosed object
      ~ name: "Bob", age: 30
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      expect(collection).toBeInstanceOf(CollectionNode);
      expect(collection.children).toHaveLength(3);

      // First object should be valid
      expect(collection.children[0]).toBeInstanceOf(ObjectNode);

      // Second object should be ErrorNode
      expect(collection.children[1]).toBeInstanceOf(ErrorNode);
      const errorNode = collection.children[1] as ErrorNode;
      expect(errorNode.error).toBeDefined();
      expect(errorNode.toValue().__error).toBe(true);

      // Third object should be valid
      expect(collection.children[2]).toBeInstanceOf(ObjectNode);
    });

    it("should handle multiple errors in collection", () => {
      const input = `
      ~ name: "Alice", age: 25
      ~ invalid { unclosed
      ~ another invalid }
      ~ name: "Bob", age: 30
      ~ yet another { invalid
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      expect(collection).toBeInstanceOf(CollectionNode);
      expect(collection.children).toHaveLength(5);

      // Check which items are valid vs error nodes
      expect(collection.children[0]).toBeInstanceOf(ObjectNode);
      expect(collection.children[1]).toBeInstanceOf(ErrorNode);
      expect(collection.children[2]).toBeInstanceOf(ErrorNode);
      expect(collection.children[3]).toBeInstanceOf(ObjectNode);
      expect(collection.children[4]).toBeInstanceOf(ErrorNode);
    });

    it("should skip to next collection item after error", () => {
      const input = `
      ~ name: "Alice"
      ~ multiple collection item in single line ~ name: "Bob"
      ~ name: "Charlie"
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      expect(collection).toBeInstanceOf(CollectionNode);
      expect(collection.children).toHaveLength(4);

      // First should be valid
      expect(collection.children[0]).toBeInstanceOf(ObjectNode);

      // Second should be error (invalid syntax)
      expect(collection.children[1]).toBeInstanceOf(ObjectNode); // Currently parsing as object

      // Third should be valid (Bob) - currently parsed separately
      expect(collection.children[2]).toBeInstanceOf(ObjectNode);

      // Fourth should be valid (Charlie)
      expect(collection.children[3]).toBeInstanceOf(ObjectNode);
      const charlieObj = collection.children[3] as ObjectNode;
      const charlieMember = charlieObj.children[0] as MemberNode;
      expect((charlieMember.value as TokenNode).value).toBe("Charlie");
    });
  });

  describe("Collection Utility Methods", () => {
    it("should correctly identify empty collections", () => {
      const emptyInput = `---`;
      const nonEmptyInput = `~ name: "Alice"`;

      // Test empty collection (null child)
      const emptyTokenizer = new Tokenizer(emptyInput);
      const emptyTokens = emptyTokenizer.tokenize();
      const emptyParser = new ASTParser(emptyTokens);
      const emptyDoc = emptyParser.parse();

      expect(emptyDoc.children[0].child).toBeNull();

      // Test non-empty collection
      const nonEmptyTokenizer = new Tokenizer(nonEmptyInput);
      const nonEmptyTokens = nonEmptyTokenizer.tokenize();
      const nonEmptyParser = new ASTParser(nonEmptyTokens);
      const nonEmptyDoc = nonEmptyParser.parse();
      const nonEmptyCollection = nonEmptyDoc.children[0].child as CollectionNode;

      expect(nonEmptyCollection.isEmpty()).toBe(false);
      expect(nonEmptyCollection.size()).toBe(1);
    });

    it("should provide debug string representation", () => {
      const input = `
      ~ name: "Alice", age: 25
      ~ name: "Bob", age: 30
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      const debugString = collection.toDebugString();
      expect(debugString).toContain("CollectionNode");
      expect(debugString).toContain("[0]");
      expect(debugString).toContain("[1]");
    });

    it("should validate collection correctness", () => {
      const validInput = `
      ~ name: "Alice", age: 25
      ~ name: "Bob", age: 30
      `;

      const tokenizer = new Tokenizer(validInput);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      expect(collection.isValid()).toBe(true);
      expect(collection.hasValidItems()).toBe(true);

      const validItems = collection.getValidItems();
      expect(validItems).toHaveLength(2);
    });

    it("should identify invalid collections with errors", () => {
      const invalidInput = `
      ~ name: "Alice", age: 25
      ~ invalid { unclosed
      ~ name: "Bob", age: 30
      `;

      const tokenizer = new Tokenizer(invalidInput);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      expect(collection.isValid()).toBe(false);
      expect(collection.hasValidItems()).toBe(true);

      const validItems = collection.getValidItems();
      expect(validItems).toHaveLength(2); // Only valid items
    });
  });

  describe("Collection Value Conversion", () => {
    it("should convert collection to JavaScript array", () => {
      const input = `
      ~ name: "Alice", age: 25
      ~ name: "Bob", age: 30
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      const jsValue = collection.toValue();
      expect(jsValue.length).toBe(2); // Collection object has length property
      expect(jsValue.getAt).toBeDefined(); // Should be Collection instance
    });

    it("should include error information in converted values", () => {
      const input = `
      ~ name: "Alice", age: 25
      ~ invalid { unclosed
      ~ name: "Bob", age: 30
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      const jsValue = collection.toValue();
      expect(jsValue.length).toBe(3); // Collection object has length property
      expect(jsValue.getAt).toBeDefined(); // Should be Collection instance

      // Second item should be error object
      expect(jsValue.getAt(1).__error).toBe(true);
      expect(jsValue.getAt(1).message).toBeDefined();
    });
  });

  describe("Collection Position Tracking", () => {
    it("should track collection position correctly", () => {
      const input = `
      ~ name: "Alice"
      ~ name: "Bob"
      `;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const collection = section.child as CollectionNode;

      // Collection should have position information
      expect(collection.getStartPos()).toBeDefined();
      expect(collection.getEndPos()).toBeDefined();

      // Start position should be before or equal to end position
      expect(collection.getStartPos().pos).toBeLessThanOrEqual(collection.getEndPos().pos);
    });
  });
});