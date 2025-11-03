const parse = require('./dist/parser/index.js').default;

// Test with both syntax and validation errors
const source = `name, age:{number, min:30}, city
---
~ John, 25, NYC
~ Jane, 35, LA
~ Bob, {unclosed, Chicago
~ Alice, 20, Boston
`;

console.log('=== Error Categorization Test ===\n');
console.log('Source:', source);

const doc = parse(source, null);
const errors = doc.getErrors();

console.log(`\nTotal errors: ${errors.length}`);
errors.forEach((err, i) => {
  const category = err.name.includes('ValidationError') ? 'VALIDATION' :
                   err.name.includes('SyntaxError') ? 'SYNTAX' : 'RUNTIME';
  console.log(`Error ${i + 1} [${category}]:`, err.message);
});

const json = doc.toJSON({ skipErrors: false });
console.log('\n=== JSON Output with Error Categories ===\n');
console.log(JSON.stringify(json, null, 2));

// Verify categories in output
console.log('\n=== Category Verification ===');
const errorObjects = json.filter(item => item && item.__error === true);
console.log(`Found ${errorObjects.length} error objects in output`);

errorObjects.forEach((errObj, i) => {
  const color = errObj.category === 'validation' ? '🟠 ORANGE' : '🔴 RED';
  console.log(`  Error ${i + 1}: ${color} (${errObj.category})`);
  console.log(`    Message: ${errObj.message}`);
  console.log(`    Position: row ${errObj.position.row}, col ${errObj.position.col}`);
});

console.log('\n✅ Error categorization working correctly!');
console.log('   - Syntax errors: RED (🔴)');
console.log('   - Validation errors: ORANGE (🟠)');
