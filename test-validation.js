const parse = require('./dist/parser/index.js').default;
const Tokenizer = require('./dist/parser/tokenizer/index.js').default;
const ASTParser = require('./dist/parser/ast-parser.js').default;

const source = `name, age:{number, min:30}
---
~ John, 25
~ Jane, 35
~ Bob, {invalid
~ Alice, 45
`;

console.log('Source with both parser and validation errors...\n');
const tokenizer = new Tokenizer(source);
const tokens = tokenizer.tokenize();
const parser = new ASTParser(tokens);
const docNode = parser.parse();

console.log('Document children:', docNode.children.length);
docNode.children.forEach((section, i) => {
  console.log(`Section ${i}:`, section.name, section.child ? section.child.constructor.name : 'null');
});

console.log('\n--- Now parsing with schema ---\n');

try {
  const doc = parse(source, null);
  const errors = doc.getErrors();

  console.log('Total errors:', errors.length);
  errors.forEach((err, i) => {
    console.log(`Error ${i + 1}:`, err.code, err.message);
  });

  const json = doc.toJSON({ skipErrors: false });
  console.log('\nJSON output:', JSON.stringify(json, null, 2));

  console.log('\nWith skipErrors=true:');
  const jsonSkip = doc.toJSON({ skipErrors: true });
  console.log(JSON.stringify(jsonSkip, null, 2));
} catch (e) {
  console.error('Parse error:', e.code, e.message);
  console.error('Stack:', e.stack);
}
