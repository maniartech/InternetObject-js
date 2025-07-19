import Tokenizer from "../../../src/parser/tokenizer";
import ASTParser from "../../../src/parser/ast-parser";
import ObjectNode from "../../../src/parser/nodes/objects";
import MemberNode from "../../../src/parser/nodes/members";
import TokenNode from "../../../src/parser/nodes/tokens";
import ArrayNode from "../../../src/parser/nodes/array";

describe("AST Parser - Object Parsing", () => {
  describe("Simple Object Parsing", () => {
    it("should parse simple object with key-value pairs", () => {
      const input = `{name: "Alice", age: 25, active: true}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;

      expect(obj).toBeInstanceOf(ObjectNode);
      expect(obj.children).toHaveLength(3);

      // Check first member
      const firstMember = obj.children[0] as MemberNode;
      expect(firstMember.key?.value).toBe("name");
      expect(firstMember.value).toBeInstanceOf(TokenNode);
      expect((firstMember.value as TokenNode).value).toBe("Alice");

      // Check second member
      const secondMember = obj.children[1] as MemberNode;
      expect(secondMember.key?.value).toBe("age");
      expect((secondMember.value as TokenNode).value).toBe(25);

      // Check third member
      const thirdMember = obj.children[2] as MemberNode;
      expect(thirdMember.key?.value).toBe("active");
      expect((thirdMember.value as TokenNode).value).toBe(true);
    });

    it("should parse object with only values (no keys)", () => {
      const input = `{"Alice", 25, true}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;

      expect(obj).toBeInstanceOf(ObjectNode);
      expect(obj.children).toHaveLength(3);

      // Check members have no keys
      obj.children.forEach((member, index) => {
        const memberNode = member as MemberNode;
        expect(memberNode.key).toBeUndefined(); // Keys are optional in Internet Object
        expect(memberNode.value).toBeInstanceOf(TokenNode);
      });
    });

    it("should parse empty object", () => {
      const input = `{}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;

      expect(obj).toBeInstanceOf(ObjectNode);
      expect(obj.children).toHaveLength(0);
      expect(obj.isEmpty()).toBe(true);
    });

    it("should parse object with mixed key-value and value-only members", () => {
      const input = `{name: "Alice", 25, active: true, "Bob"}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;

      expect(obj).toBeInstanceOf(ObjectNode);
      expect(obj.children).toHaveLength(4);

      // First member has key
      expect((obj.children[0] as MemberNode).key?.value).toBe("name");
      
      // Second member has no key
      expect((obj.children[1] as MemberNode).key).toBeUndefined();
      
      // Third member has key
      expect((obj.children[2] as MemberNode).key?.value).toBe("active");
      
      // Fourth member has no key
      expect((obj.children[3] as MemberNode).key).toBeUndefined();
    });
  });

  describe("Nested Object Parsing", () => {
    it("should parse nested objects", () => {
      const input = `{user: {name: "Alice", details: {age: 25, city: "NYC"}}}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;

      expect(obj).toBeInstanceOf(ObjectNode);
      expect(obj.children).toHaveLength(1);

      const userMember = obj.children[0] as MemberNode;
      expect(userMember.key?.value).toBe("user");
      expect(userMember.value).toBeInstanceOf(ObjectNode);

      const userObj = userMember.value as ObjectNode;
      expect(userObj.children).toHaveLength(2);

      // Check nested details object
      const detailsMember = userObj.children[1] as MemberNode;
      expect(detailsMember.key?.value).toBe("details");
      expect(detailsMember.value).toBeInstanceOf(ObjectNode);

      const detailsObj = detailsMember.value as ObjectNode;
      expect(detailsObj.children).toHaveLength(2);
    });

    it("should parse object containing arrays", () => {
      const input = `{name: "Alice", scores: [85, 92, 78], tags: ["student", "active"]}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;

      expect(obj).toBeInstanceOf(ObjectNode);
      expect(obj.children).toHaveLength(3);

      // Check scores array
      const scoresMember = obj.children[1] as MemberNode;
      expect(scoresMember.key?.value).toBe("scores");
      expect(scoresMember.value).toBeInstanceOf(ArrayNode);

      const scoresArray = scoresMember.value as ArrayNode;
      expect(scoresArray.children).toHaveLength(3);

      // Check tags array
      const tagsMember = obj.children[2] as MemberNode;
      expect(tagsMember.key?.value).toBe("tags");
      expect(tagsMember.value).toBeInstanceOf(ArrayNode);

      const tagsArray = tagsMember.value as ArrayNode;
      expect(tagsArray.children).toHaveLength(2);
    });
  });

  describe("Open Object Parsing", () => {
    it("should parse open object (no braces)", () => {
      const input = `name: "Alice", age: 25, active: true`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;

      expect(obj).toBeInstanceOf(ObjectNode);
      expect(obj.children).toHaveLength(3);
      expect(obj.openBracket).toBeUndefined();
      expect(obj.closeBracket).toBeUndefined();
    });

    it("should parse open object with only values", () => {
      const input = `"Alice", 25, true`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;

      expect(obj).toBeInstanceOf(ObjectNode);
      expect(obj.children).toHaveLength(3);

      obj.children.forEach((member) => {
        const memberNode = member as MemberNode;
        expect(memberNode.key).toBeUndefined(); // Keys are optional in Internet Object
      });
    });
  });

  describe("Object Utility Methods", () => {
    it("should correctly identify empty objects", () => {
      const emptyInput = `{}`;
      const nonEmptyInput = `{name: "Alice"}`;

      // Test empty object
      const emptyTokenizer = new Tokenizer(emptyInput);
      const emptyTokens = emptyTokenizer.tokenize();
      const emptyParser = new ASTParser(emptyTokens);
      const emptyDoc = emptyParser.parse();
      const emptyObj = emptyDoc.children[0].child as ObjectNode;

      expect(emptyObj.isEmpty()).toBe(true);

      // Test non-empty object
      const nonEmptyTokenizer = new Tokenizer(nonEmptyInput);
      const nonEmptyTokens = nonEmptyTokenizer.tokenize();
      const nonEmptyParser = new ASTParser(nonEmptyTokens);
      const nonEmptyDoc = nonEmptyParser.parse();
      const nonEmptyObj = nonEmptyDoc.children[0].child as ObjectNode;

      expect(nonEmptyObj.isEmpty()).toBe(false);
    });

    it("should provide debug string representation", () => {
      const input = `{name: "Alice", age: 25}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;

      const debugString = obj.toDebugString();
      expect(debugString).toContain("ObjectNode");
      expect(debugString).toContain("name");
      expect(debugString).toContain("Alice");
      expect(debugString).toContain("age");
      expect(debugString).toContain("25");
    });

    it("should correctly identify object keys", () => {
      const input = `{name: "Alice", age: 25, "city": "NYC"}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;

      expect(obj.hasKey("name")).toBe(true);
      expect(obj.hasKey("age")).toBe(true);
      expect(obj.hasKey("city")).toBe(true);
      expect(obj.hasKey("nonexistent")).toBe(false);

      const keys = obj.getKeys();
      expect(keys).toContain("name");
      expect(keys).toContain("age");
      expect(keys).toContain("city");
      expect(keys).toHaveLength(3);
    });

    it("should validate object correctness", () => {
      const validInput = `{name: "Alice", age: 25}`;

      const tokenizer = new Tokenizer(validInput);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;

      expect(obj.isValid()).toBe(true);
    });
  });

  describe("Object Error Handling", () => {
    it("should throw error for invalid object keys", () => {
      const input = `{{}: "value"}`;  // Object as key

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });

    it("should throw error for missing comma between members", () => {
      const input = `{name: "Alice" age: 25}`;  // Missing comma

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });

    it("should throw error for unclosed object", () => {
      const input = `{name: "Alice", age: 25`;  // Missing closing brace

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });

    it("should throw error for unexpected end of input", () => {
      const input = `{name: "Alice", age:`;  // Incomplete value

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });
  });
});