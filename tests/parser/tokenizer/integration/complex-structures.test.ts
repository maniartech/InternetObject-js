import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

describe("Complex Structure Tokenization", () => {
  describe("Nested Objects", () => {
    it("should tokenize simple nested objects", () => {
      const input = `{a: {b: 10, c: "Hello"}, d: true}`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const expected = [
        TokenType.CURLY_OPEN,
        TokenType.STRING,
        TokenType.COLON,
        TokenType.CURLY_OPEN,
        TokenType.STRING,
        TokenType.COLON,
        TokenType.NUMBER,
        TokenType.COMMA,
        TokenType.STRING,
        TokenType.COLON,
        TokenType.STRING,
        TokenType.CURLY_CLOSE,
        TokenType.COMMA,
        TokenType.STRING,
        TokenType.COLON,
        TokenType.BOOLEAN,
        TokenType.CURLY_CLOSE,
      ];

      for (let i = 0; i < tokens.length; i++) {
        expect(tokens[i].type).toEqual(expected[i]);
      }
    });

    it("should tokenize deeply nested objects", () => {
      const input = `{a: {b: {c: {d: "deep"}}}}`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const openBraces = tokens.filter(t => t.type === TokenType.CURLY_OPEN);
      const closeBraces = tokens.filter(t => t.type === TokenType.CURLY_CLOSE);

      expect(openBraces).toHaveLength(4);
      expect(closeBraces).toHaveLength(4);

      const deepString = tokens.find(t => t.value === "deep");
      expect(deepString).toBeDefined();
      expect(deepString?.type).toBe(TokenType.STRING);
    });

    it("should handle objects with mixed value types", () => {
      const input = `{
        string: "hello",
        number: 42,
        float: 3.14,
        boolean: true,
        null_value: null,
        array: [1, 2, 3],
        nested: {inner: "value"}
      }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const tokenTypes = new Set(tokens.map(t => t.type));

      expect(tokenTypes.has(TokenType.STRING)).toBe(true);
      expect(tokenTypes.has(TokenType.NUMBER)).toBe(true);
      expect(tokenTypes.has(TokenType.BOOLEAN)).toBe(true);
      expect(tokenTypes.has(TokenType.NULL)).toBe(true);
      expect(tokenTypes.has(TokenType.CURLY_OPEN)).toBe(true);
      expect(tokenTypes.has(TokenType.CURLY_CLOSE)).toBe(true);
      expect(tokenTypes.has(TokenType.BRACKET_OPEN)).toBe(true);
      expect(tokenTypes.has(TokenType.BRACKET_CLOSE)).toBe(true);
      expect(tokenTypes.has(TokenType.COLON)).toBe(true);
      expect(tokenTypes.has(TokenType.COMMA)).toBe(true);
    });
  });

  describe("Nested Arrays", () => {
    it("should tokenize simple nested arrays", () => {
      const input = `[10, [20, 30], 40]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const expected = [
        TokenType.BRACKET_OPEN,
        TokenType.NUMBER,
        TokenType.COMMA,
        TokenType.BRACKET_OPEN,
        TokenType.NUMBER,
        TokenType.COMMA,
        TokenType.NUMBER,
        TokenType.BRACKET_CLOSE,
        TokenType.COMMA,
        TokenType.NUMBER,
        TokenType.BRACKET_CLOSE,
      ];

      for (let i = 0; i < tokens.length; i++) {
        expect(tokens[i].type).toEqual(expected[i]);
      }
    });

    it("should tokenize deeply nested arrays", () => {
      const input = `[1, [2, [3, [4, [5]]]]]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const openBrackets = tokens.filter(t => t.type === TokenType.BRACKET_OPEN);
      const closeBrackets = tokens.filter(t => t.type === TokenType.BRACKET_CLOSE);

      expect(openBrackets).toHaveLength(5);
      expect(closeBrackets).toHaveLength(5);

      const numbers = tokens.filter(t => t.type === TokenType.NUMBER);
      expect(numbers).toHaveLength(5);
      expect(numbers.map(t => t.value)).toEqual([1, 2, 3, 4, 5]);
    });

    it("should handle arrays with mixed types", () => {
      const input = `[1, "string", true, null, {key: "value"}, [nested, array]]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const tokenTypes = new Set(tokens.map(t => t.type));

      expect(tokenTypes.has(TokenType.NUMBER)).toBe(true);
      expect(tokenTypes.has(TokenType.STRING)).toBe(true);
      expect(tokenTypes.has(TokenType.BOOLEAN)).toBe(true);
      expect(tokenTypes.has(TokenType.NULL)).toBe(true);
      expect(tokenTypes.has(TokenType.CURLY_OPEN)).toBe(true);
      expect(tokenTypes.has(TokenType.BRACKET_OPEN)).toBe(true);
    });
  });

  describe("Mixed Object and Array Structures", () => {
    it("should handle objects containing arrays", () => {
      const input = `{
        numbers: [1, 2, 3],
        strings: ["a", "b", "c"],
        mixed: [1, "two", true, null]
      }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const objectBraces = tokens.filter(t =>
        t.type === TokenType.CURLY_OPEN || t.type === TokenType.CURLY_CLOSE
      );
      const arrayBrackets = tokens.filter(t =>
        t.type === TokenType.BRACKET_OPEN || t.type === TokenType.BRACKET_CLOSE
      );

      expect(objectBraces).toHaveLength(2); // One object
      expect(arrayBrackets).toHaveLength(6); // Three arrays
    });

    it("should handle arrays containing objects", () => {
      const input = `[
        {name: "Alice", age: 30},
        {name: "Bob", age: 25},
        {name: "Charlie", age: 35}
      ]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const objectBraces = tokens.filter(t =>
        t.type === TokenType.CURLY_OPEN || t.type === TokenType.CURLY_CLOSE
      );
      const arrayBrackets = tokens.filter(t =>
        t.type === TokenType.BRACKET_OPEN || t.type === TokenType.BRACKET_CLOSE
      );

      expect(arrayBrackets).toHaveLength(2); // One array
      expect(objectBraces).toHaveLength(6); // Three objects
    });

    it("should handle complex nested mixed structures", () => {
      const input = `{
        users: [
          {
            name: "Alice",
            preferences: {
              colors: ["red", "blue"],
              numbers: [1, 2, 3]
            }
          },
          {
            name: "Bob",
            preferences: {
              colors: ["green"],
              numbers: [4, 5]
            }
          }
        ],
        metadata: {
          version: 1.0,
          created: "2023-12-25"
        }
      }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // Verify we have a complex structure with multiple levels
      const objectBraces = tokens.filter(t =>
        t.type === TokenType.CURLY_OPEN || t.type === TokenType.CURLY_CLOSE
      );
      const arrayBrackets = tokens.filter(t =>
        t.type === TokenType.BRACKET_OPEN || t.type === TokenType.BRACKET_CLOSE
      );

      expect(objectBraces.length).toBeGreaterThan(10);
      expect(arrayBrackets.length).toBeGreaterThan(8);

      // Verify we can find specific values
      const aliceToken = tokens.find(t => t.value === "Alice");
      const bobToken = tokens.find(t => t.value === "Bob");
      const versionToken = tokens.find(t => t.value === 1.0);

      expect(aliceToken).toBeDefined();
      expect(bobToken).toBeDefined();
      expect(versionToken).toBeDefined();
    });
  });

  describe("Structures with Annotated Strings", () => {
    it("should handle objects with annotated strings", () => {
      const base64 = Buffer.from("test data").toString("base64");
      const input = `{
        raw: r"raw content",
        binary: b"${base64}",
        datetime: dt"2023-12-25T10:30:00Z",
        regular: "normal string"
      }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const rawToken = tokens.find(t => t.subType === "RAW_STRING");
      const binaryToken = tokens.find(t => t.subType === "BINARY_STRING");
      const datetimeToken = tokens.find(t => t.subType === TokenType.DATETIME);
      const regularToken = tokens.find(t => t.subType === "REGULAR_STRING");

      expect(rawToken).toBeDefined();
      expect(rawToken?.value).toBe("raw content");
      expect(binaryToken).toBeDefined();
      expect(Buffer.isBuffer(binaryToken?.value)).toBe(true);
      expect(datetimeToken).toBeDefined();
      expect(datetimeToken?.value).toBeInstanceOf(Date);
      expect(regularToken).toBeDefined();
      expect(regularToken?.value).toBe("normal string");
    });

    it("should handle arrays with annotated strings", () => {
      const base64 = Buffer.from("test").toString("base64");
      const input = `[
        r"raw1",
        "regular",
        b"${base64}",
        dt"2023-12-25T10:30:00Z",
        r"raw2"
      ]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const rawTokens = tokens.filter(t => t.subType === "RAW_STRING");
      const regularTokens = tokens.filter(t => t.subType === "REGULAR_STRING");
      const binaryTokens = tokens.filter(t => t.subType === "BINARY_STRING");
      const datetimeTokens = tokens.filter(t => t.subType === TokenType.DATETIME);

      expect(rawTokens).toHaveLength(2);
      expect(regularTokens).toHaveLength(1);
      expect(binaryTokens).toHaveLength(1);
      expect(datetimeTokens).toHaveLength(1);
    });
  });

  describe("Structures with Collections", () => {
    it("should handle collection syntax in complex structures", () => {
      const input = `{
        collection: ~[1, 2, 3],
        nested: {
          inner_collection: ~{a: 1, b: 2}
        }
      }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const collectionTokens = tokens.filter(t => t.type === TokenType.COLLECTION_START);
      expect(collectionTokens).toHaveLength(2);

      // Verify collections are followed by appropriate structures
      for (const collectionToken of collectionTokens) {
        const nextTokenIndex = tokens.indexOf(collectionToken) + 1;
        const nextToken = tokens[nextTokenIndex];
        expect(nextToken.type).toMatch(/BRACKET_OPEN|CURLY_OPEN/);
      }
    });
  });

  describe("Large Complex Structures", () => {
    it("should handle very large nested structures", () => {
      // Create a structure with 100 nested objects
      let input = "{";
      for (let i = 0; i < 100; i++) {
        input += `level${i}: {`;
      }
      input += `value: "deep"`;
      for (let i = 0; i < 100; i++) {
        input += "}";
      }
      input += "}";

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const openBraces = tokens.filter(t => t.type === TokenType.CURLY_OPEN);
      const closeBraces = tokens.filter(t => t.type === TokenType.CURLY_CLOSE);

      expect(openBraces).toHaveLength(101); // 100 nested + 1 root
      expect(closeBraces).toHaveLength(101);

      const deepValue = tokens.find(t => t.value === "deep");
      expect(deepValue).toBeDefined();
    });

    it("should handle structures with many siblings", () => {
      let input = "{";
      for (let i = 0; i < 100; i++) {
        input += `key${i}: ${i}`;
        if (i < 99) input += ", ";
      }
      input += "}";

      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const numberTokens = tokens.filter(t => t.type === TokenType.NUMBER);
      const stringTokens = tokens.filter(t => t.type === TokenType.STRING);
      const commaTokens = tokens.filter(t => t.type === TokenType.COMMA);

      expect(numberTokens).toHaveLength(100);
      expect(stringTokens).toHaveLength(100); // All keys
      expect(commaTokens).toHaveLength(99); // n-1 commas
    });
  });

  describe("Position Tracking in Complex Structures", () => {
    it("should maintain accurate positions in nested structures", () => {
      const input = `{
        level1: {
          level2: {
            value: "target"
          }
        }
      }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const targetToken = tokens.find(t => t.value === "target");
      expect(targetToken).toBeDefined();
      expect(targetToken?.row).toBeGreaterThan(1);
      expect(targetToken?.col).toBeGreaterThan(1);
      expect(targetToken?.pos).toBeGreaterThan(0);
    });

    it("should track positions correctly across multiple lines", () => {
      const input = `[
        "line2",
        {
          key: "line4"
        },
        "line6"
      ]`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const line2Token = tokens.find(t => t.value === "line2");
      const line4Token = tokens.find(t => t.value === "line4");
      const line6Token = tokens.find(t => t.value === "line6");

      expect(line2Token?.row).toBe(2);
      expect(line4Token?.row).toBe(4);
      expect(line6Token?.row).toBe(6);
    });
  });

  describe("Error Recovery in Complex Structures", () => {
    it("should continue parsing after errors in nested structures", () => {
      const input = `{
        valid: "string",
        invalid: xyz"error",
        stillValid: 123,
        nested: {
          anotherError: b"invalid@base64",
          validNested: true
        }
      }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const validTokens = tokens.filter(t =>
        (t.type === TokenType.STRING && t.value === "string") ||
        (t.type === TokenType.NUMBER && t.value === 123) ||
        (t.type === TokenType.BOOLEAN && t.value === true)
      );

      const errorTokens = tokens.filter(t => t.type === TokenType.ERROR);

      expect(validTokens).toHaveLength(3);
      expect(errorTokens.length).toBeGreaterThan(0);
    });
  });
});