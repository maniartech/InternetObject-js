import { parse } from '../../src/index';

const doc = `name, age, gender
---
~ Alice Smith, 28, f
~ Bob Johnson, 22, {missing brace
~ Charlie Brown, 30, m
`;

try {
  const result = parse(doc, null);
  console.log('Parse succeeded');
  console.log('Errors:', result.getErrors());
  console.log('Output:', JSON.stringify(result.toJSON(), null, 2));
} catch (e: any) {
  console.log('Parse threw exception:', e.message);
  console.log('Error type:', e.constructor.name);
  console.log('Position:', e.positionRange);
}
