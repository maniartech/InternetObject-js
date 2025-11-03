import ASTParser from './src/parser/ast-parser';
import Tokenizer from './src/parser/tokenizer';

const input = `
--- section1
~ name: "Alice", age: 25
~ {unclosed: "object"
~ name: "Bob", age: 30

--- section1
~ item1
~ item2

--- products
~ laptop, 999
~ {broken
~ phone, 499
`;

console.log("=== Phase 2: Error Accumulation Demonstration (TypeScript) ===\n");

const tokenizer = new Tokenizer(input);
const tokens = tokenizer.tokenize();
const parser = new ASTParser(tokens);
const doc = parser.parse();

console.log(`Document parsed: ${doc !== null}`);

// NEW in Phase 2: Get ALL accumulated errors
const allErrors = doc.getErrors();
console.log(`\nTotal errors accumulated: ${allErrors.length}\n`);

allErrors.forEach((err, i) => {
  console.log(`Error ${i + 1}: ${err.message}`);
});

console.log(`\nTotal sections parsed: ${doc.children.length}`);
doc.children.forEach((section, i) => {
  console.log(`  Section ${i + 1}: ${section.name}`);
});

console.log("\n=== Benefits of Phase 2 ===");
console.log("✅ See ALL errors in one pass (not just the first one)");
console.log("✅ Better IDE/tooling support (show all diagnostics)");
console.log("✅ Fix multiple issues without re-parsing");
console.log("✅ Backward compatible (existing code still works)");
