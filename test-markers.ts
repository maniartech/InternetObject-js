import { parse } from './src/index';

const doc = `name, age, date
---
~ Alice, 28, d'2021-01-10'
~ Bob, 22, d'2021-01-10
~ Charlie, 30, d'2021-01-10'
`;

try {
  const result = parse(doc, null);
  console.log('Parsed successfully');
  console.log('Errors:', result.getErrors());
  console.log('Output:', JSON.stringify(result.toJSON(), null, 2));
} catch (e: any) {
  console.log('Error thrown:', e.message);
  console.log('Error type:', e.constructor.name);
  console.log('Has positionRange?', !!e.positionRange);
  if (e.positionRange) {
    console.log('Start:', e.positionRange.getStartPos());
    console.log('End:', e.positionRange.getEndPos());
  }
}
