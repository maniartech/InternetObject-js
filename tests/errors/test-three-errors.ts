import { parse } from '../../src/index';

const doc = `name, age, address
---
~ Alice, 28, {Street, City}
~ Bob, 22, {Street, City
~ Charlie, 30, {Street, City}
~ Diana, 25, {Street, City
~ Eve, 35, {Street, City}
~ Frank, 40, {Street, City
`;

console.log('Testing 3 syntax errors in collection...\n');

try {
  const result = parse(doc, null);
  const errors = result.getErrors();

  console.log(`✅ Parse succeeded!`);
  console.log(`📊 Accumulated errors: ${errors.length}`);

  errors.forEach((err, i) => {
    console.log(`\n${i + 1}. ${err.message}`);
  });

  const output = result.toJSON();
  console.log(`\n📄 Valid items parsed: ${output.length}`);
  console.log(JSON.stringify(output, null, 2));

} catch (e: any) {
  console.log('❌ Parse threw exception:', e.message);
}
