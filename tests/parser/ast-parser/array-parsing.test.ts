import Tokenizer from "../../../src/parser/tokenizer";
import ASTParser from "../../../src/parser/ast-parser";
import ArrayNode from "../../../src/parser/nodes/array";
import ObjectNode from "../../../src/parser/nodes/objects";
import TokenNode from "../../../src/parser/nodes/tokens";
import MemberNode from "../../../src/parser/nodes/members";

describe("AST Parser - Array Parsing", () => {
  describe("Simple Array Parsing", () => {
    it("should parse array of primitive values", () => {
      const input = `{data: [1, 2, 3, "hello", true, null]}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;
      const dataMember = obj.children[0] as MemberNode;
      const array = dataMember.value as ArrayNode;

      expect(array).toBeInstanceOf(ArrayNode);
      expect(array.children).toHaveLength(6);

      // Check array values
      expect((array.children[0] as TokenNode).value).toBe(1);
      expect((array.children[1] as TokenNode).value).toBe(2);
      expect((array.children[2] as TokenNode).value).toBe(3);
      expect((array.children[3] as TokenNode).value).toBe("hello");
      expect((array.children[4] as TokenNode).value).toBe(true);
      expect((array.children[5] as TokenNode).value).toBeNull();
    });

    it("should parse empty array", () => {
      const input = `{data: []}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;
      const dataMember = obj.children[0] as MemberNode;
      const array = dataMember.value as ArrayNode;

      expect(array).toBeInstanceOf(ArrayNode);
      expect(array.children).toHaveLength(0);
    });

    it("should parse array with single element", () => {
      const input = `{data: [42]}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;
      const dataMember = obj.children[0] as MemberNode;
      const array = dataMember.value as ArrayNode;

      expect(array).toBeInstanceOf(ArrayNode);
      expect(array.children).toHaveLength(1);
      expect((array.children[0] as TokenNode).value).toBe(42);
    });
  });

  describe("Array of Objects", () => {
    it("should parse array containing objects", () => {
      const input = `{users: [{name: "Alice", age: 25}, {name: "Bob", age: 30}]}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;
      const usersMember = obj.children[0] as MemberNode;
      const array = usersMember.value as ArrayNode;

      expect(array).toBeInstanceOf(ArrayNode);
      expect(array.children).toHaveLength(2);

      // Check first object
      const firstObj = array.children[0] as ObjectNode;
      expect(firstObj).toBeInstanceOf(ObjectNode);
      expect(firstObj.children).toHaveLength(2);

      // Check second object
      const secondObj = array.children[1] as ObjectNode;
      expect(secondObj).toBeInstanceOf(ObjectNode);
      expect(secondObj.children).toHaveLength(2);
    });

    it("should parse array with key-value pairs (converted to objects)", () => {
      const input = `{data: [name: "Alice", age: 25, city: "NYC"]}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;
      const dataMember = obj.children[0] as MemberNode;
      const array = dataMember.value as ArrayNode;

      expect(array).toBeInstanceOf(ArrayNode);
      expect(array.children).toHaveLength(3);

      // Each key-value pair should be converted to an object
      array.children.forEach((child) => {
        expect(child).toBeInstanceOf(ObjectNode);
        const childObj = child as ObjectNode;
        expect(childObj.children).toHaveLength(1);
      });
    });
  });

  describe("Nested Arrays", () => {
    it("should parse nested arrays", () => {
      const input = `{matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]]}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;
      const matrixMember = obj.children[0] as MemberNode;
      const outerArray = matrixMember.value as ArrayNode;

      expect(outerArray).toBeInstanceOf(ArrayNode);
      expect(outerArray.children).toHaveLength(3);

      // Check each inner array
      outerArray.children.forEach((innerArrayNode, index) => {
        const innerArray = innerArrayNode as ArrayNode;
        expect(innerArray).toBeInstanceOf(ArrayNode);
        expect(innerArray.children).toHaveLength(3);

        // Check values in inner array
        innerArray.children.forEach((valueNode, valueIndex) => {
          const expectedValue = (index * 3) + valueIndex + 1;
          expect((valueNode as TokenNode).value).toBe(expectedValue);
        });
      });
    });

    it("should parse array containing mixed types including nested arrays", () => {
      const input = `{mixed: [1, "hello", [2, 3], {name: "Alice"}, [4, [5, 6]]]}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;
      const mixedMember = obj.children[0] as MemberNode;
      const array = mixedMember.value as ArrayNode;

      expect(array).toBeInstanceOf(ArrayNode);
      expect(array.children).toHaveLength(5);

      // Check types
      expect(array.children[0]).toBeInstanceOf(TokenNode);
      expect(array.children[1]).toBeInstanceOf(TokenNode);
      expect(array.children[2]).toBeInstanceOf(ArrayNode);
      expect(array.children[3]).toBeInstanceOf(ObjectNode);
      expect(array.children[4]).toBeInstanceOf(ArrayNode);

      // Check nested array within nested array
      const lastArray = array.children[4] as ArrayNode;
      expect(lastArray.children).toHaveLength(2);
      expect(lastArray.children[1]).toBeInstanceOf(ArrayNode);
    });
  });

  describe("Array Position Tracking", () => {
    it("should track array position correctly", () => {
      const input = `{data: [1, 2, 3]}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;
      const dataMember = obj.children[0] as MemberNode;
      const array = dataMember.value as ArrayNode;

      // Array should have position information
      expect(array.getStartPos()).toBeDefined();
      expect(array.getEndPos()).toBeDefined();
      expect(array.openBracket).toBeDefined();
      expect(array.closeBracket).toBeDefined();

      // Start position should be before end position
      expect(array.getStartPos().pos).toBeLessThan(array.getEndPos().pos);
    });
  });

  describe("Array Error Handling", () => {
    it("should throw error for unclosed array", () => {
      const input = `{data: [1, 2, 3}`;  // Missing closing bracket

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });

    it("should throw error for array without opening bracket", () => {
      const input = `{data: 1, 2, 3]}`;  // Missing opening bracket

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });

    it("should throw error for consecutive commas in array", () => {
      const input = `{data: [1, , 3]}`;  // Empty element

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });

    it("should throw error for trailing comma followed by closing bracket", () => {
      const input = `{data: [1, 2, 3,]}`;  // Trailing comma

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });

    it("should throw error for unexpected end of input in array", () => {
      const input = `{data: [1, 2,`;  // Incomplete array

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);

      expect(() => astParser.parse()).toThrow();
    });
  });

  describe("Array Value Conversion", () => {
    it("should convert array to correct JavaScript array", () => {
      const input = `{data: [1, "hello", true, null]}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;
      const dataMember = obj.children[0] as MemberNode;
      const array = dataMember.value as ArrayNode;

      const jsArray = array.toValue();
      expect(Array.isArray(jsArray)).toBe(true);
      expect(jsArray).toEqual([1, "hello", true, null]);
    });

    it("should convert nested arrays correctly", () => {
      const input = `{matrix: [[1, 2], [3, 4]]}`;

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();

      const section = docNode.children[0];
      const obj = section.child as ObjectNode;
      const matrixMember = obj.children[0] as MemberNode;
      const array = matrixMember.value as ArrayNode;

      const jsArray = array.toValue();
      expect(jsArray).toEqual([[1, 2], [3, 4]]);
    });
  });
});