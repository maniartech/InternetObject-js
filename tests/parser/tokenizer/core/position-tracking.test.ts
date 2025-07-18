import Tokenizer from "../../../../src/parser/tokenizer";
import TokenType from "../../../../src/parser/tokenizer/token-types";

describe("Position Tracking", () => {
  describe("Single Line Position Tracking", () => {
    it("should track positions correctly for simple tokens", () => {
      const input = `abc, 123, true`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      
      // First token: "abc" at position 0
      expect(tokens[0].pos).toBe(0);
      expect(tokens[0].row).toBe(1);
      expect(tokens[0].col).toBe(1);
      
      // Comma at position 3
      expect(tokens[1].pos).toBe(3);
      expect(tokens[1].row).toBe(1);
      expect(tokens[1].col).toBe(4);
      
      // Number "123" at position 5
      expect(tokens[2].pos).toBe(5);
      expect(tokens[2].row).toBe(1);
      expect(tokens[2].col).toBe(6);
      
      // Second comma at position 8
      expect(tokens[3].pos).toBe(8);
      expect(tokens[3].row).toBe(1);
      expect(tokens[3].col).toBe(9);
      
      // Boolean "true" at position 10
      expect(tokens[4].pos).toBe(10);
      expect(tokens[4].row).toBe(1);
      expect(tokens[4].col).toBe(11);
    });

    it("should handle whitespace correctly in position tracking", () => {
      const input = `  abc   ,   123  `;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(3);
      
      // "abc" starts at position 2 (after 2 spaces)
      expect(tokens[0].pos).toBe(2);
      expect(tokens[0].col).toBe(3);
      
      // Comma at position 8 (after "abc" + 3 spaces)
      expect(tokens[1].pos).toBe(8);
      expect(tokens[1].col).toBe(9);
      
      // "123" at position 12 (after comma + 3 spaces)
      expect(tokens[2].pos).toBe(12);
      expect(tokens[2].col).toBe(13);
    });

    it("should track positions correctly for various token types", () => {
      const input = `c1, rasd2,p2343`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const expectedPositions = [0, 2, 4, 9, 10];

      for (let i = 0; i < tokens.length; i++) {
        expect(tokens[i].pos).toEqual(expectedPositions[i]);
      }
    });
  });

  describe("Multi-line Position Tracking", () => {
    it("should track row and column correctly across lines", () => {
      const input = `line1,
        line2,
        line3`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(5);
      
      // First token on line 1
      expect(tokens[0].row).toBe(1);
      expect(tokens[0].col).toBe(1);
      
      // First comma on line 1
      expect(tokens[1].row).toBe(1);
      expect(tokens[1].col).toBe(6);
      
      // Second token on line 2
      expect(tokens[2].row).toBe(2);
      expect(tokens[2].col).toBe(9); // After 8 spaces
      
      // Second comma on line 2
      expect(tokens[3].row).toBe(2);
      expect(tokens[3].col).toBe(14);
      
      // Third token on line 3
      expect(tokens[4].row).toBe(3);
      expect(tokens[4].col).toBe(9); // After 8 spaces
    });

    it("should handle different line ending types", () => {
      const input = "line1,\nline2,\r\nline3,\rline4";
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      expect(tokens).toHaveLength(7); // 4 strings + 3 commas
      
      expect(tokens[0].row).toBe(1); // line1
      expect(tokens[1].row).toBe(1); // comma after line1
      expect(tokens[2].row).toBe(2); // line2
      expect(tokens[3].row).toBe(2); // comma after line2
      expect(tokens[4].row).toBe(3); // line3
      expect(tokens[5].row).toBe(3); // comma after line3
      expect(tokens[6].row).toBe(3); // line4 - \r doesn't create new line in this tokenizer
    });

    it("should track row tokens correctly", () => {
      const input = `r1, 
    rasd2,
    p2343`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const expectedRows = [1, 1, 2, 2, 3];

      for (let i = 0; i < tokens.length; i++) {
        expect(tokens[i].row).toEqual(expectedRows[i]);
      }
    });

    it("should track column tokens correctly", () => {
      const input = `c1, 
rasd2,  p2343`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const expectedColumns = [1, 3, 1, 6, 9];

      for (let i = 0; i < tokens.length; i++) {
        expect(tokens[i].col).toEqual(expectedColumns[i]);
      }
    });
  });

  describe("Position Tracking in Complex Structures", () => {
    it("should track positions correctly in nested structures", () => {
      const input = `{
          key: "value",
          nested: {
            inner: 123
          }
        }`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      // Find specific tokens and verify their positions
      const keyToken = tokens.find(t => t.value === "key");
      const valueToken = tokens.find(t => t.value === "value");
      const innerToken = tokens.find(t => t.value === "inner");
      const numberToken = tokens.find(t => t.value === 123);

      expect(keyToken?.row).toBe(2);
      expect(valueToken?.row).toBe(2);
      expect(innerToken?.row).toBe(4);
      expect(numberToken?.row).toBe(4);
    });
  });

  describe("End Position Calculation", () => {
    it("should calculate end positions correctly for single-line tokens", () => {
      const input = `"hello", 123`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const stringToken = tokens[0];
      const numberToken = tokens[2];

      const stringEnd = stringToken.getEndPos();
      const numberEnd = numberToken.getEndPos();

      expect(stringEnd.pos).toBe(7); // After "hello"
      expect(stringEnd.row).toBe(1);
      expect(stringEnd.col).toBe(8);

      expect(numberEnd.pos).toBe(12); // After 123
      expect(numberEnd.row).toBe(1);
      expect(numberEnd.col).toBe(13);
    });

    it("should calculate end positions correctly for multi-line tokens", () => {
      const input = `"line1\nline2\nline3"`;
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();

      const token = tokens[0];
      const endPos = token.getEndPos();

      expect(endPos.row).toBe(3);
      expect(endPos.col).toBe(6); // After "line3" (0-based indexing adjustment)
    });
  });
});