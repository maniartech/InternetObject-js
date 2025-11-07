import { parse } from '../../src/index';

const doc = `name, address
---
~ Alice, {Street, City}
~ Bob, {Street, City
~ Charlie, {Street, City}
~ Diana, {Street, City
`;

console.log('Testing collection error recovery...\n');

try {
  const result = parse(doc, null);
  const errors = result.getErrors();

  console.log(`✅ Parse succeeded!`);
  console.log(`📊 Accumulated errors: ${errors.length}`);

  errors.forEach((err, i) => {
    console.log(`\nError ${i + 1}:`);
    console.log(`  Message: ${err.message}`);
    console.log(`  Type: ${err.constructor.name}`);
  });

  console.log('\n📄 Output:');
  console.log(JSON.stringify(result.toJSON(), null, 2));

} catch (e: any) {
  console.log('❌ Parse threw exception:', e.message);
  console.log('Type:', e.constructor.name);
}
