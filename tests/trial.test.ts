
import Tokenizer from "../src/parser/tokenizer";
import ASTParser from "../src/parser/ast-parser";

// Only failing tests for isolation
describe('Trial - Failing Tests Only', () => {
  it('FAILING TEST 1: Section Separator Error Recovery', () => {
    // ...existing code...
    const input = `--- sectionName :
    some content here`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    // ...existing code...
    // Expected: SECTION_SEP, STRING with SECTION_NAME subtype, ERROR token
    // ...existing code...
  });

  it('FAILING TEST 2: Collection Error Recovery Across Multiple Sections', () => {
    // ...existing code...
    const input = `
    --- section1
    ~ valid, object, here
    ~ invalid { unclosed
    ~ another, valid, object
    --- section2
    ~ more, valid, data
    `;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    // ...existing code...
    try {
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();
      // ...existing code...
    } catch (error) {
      // ...existing code...
    }
  });

  it('FAILING TEST 3: AST Parser - Documents in Multiple Sections', () => {
    // ...existing code...
    const input = `
    --- hello
    ~ a,b,c
    ~ 1,2,3
    --- world
    ~ "asdf",True,"c"
    `;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    // ...existing code...
    try {
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();
      // ...existing code...
    } catch (error) {
      // ...existing code...
    }
  });

  it('FAILING TEST 4: AST Parser - Multiple Schema with Sections', () => {
    // ...existing code...
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
    // ...existing code...
    try {
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();
      // ...existing code...
    } catch (error) {
      // ...existing code...
    }
  });

  it('FAILING TEST 5: AST Parser - Variables in Header Section', () => {
    // ...existing code...
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
    // ...existing code...
    try {
      const astParser = new ASTParser(tokens);
      const docNode = astParser.parse();
      // ...existing code...
    } catch (error) {
      // ...existing code...
    }
  });

  it('FAILING TEST 6: Performance Test Timing Issues', () => {
    // ...existing code...
    const input = 'name: "John", age: 30, active: true';
    const iterations = 1000; // Reduced for trial
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      const tokenizer = new Tokenizer(input);
      const tokens = tokenizer.tokenize();
      const parser = new ASTParser(tokens);
      parser.parse();
    }
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    // ...existing code...
  });

  it('FAILING TEST 7: Tokenizer Section Name Subtype Issue', () => {
    // ...existing code...
    const input = '--- sectionName';
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    // ...existing code...
  });
});
