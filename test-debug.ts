import { parse } from './src';

const doc = `name, age
---
~ Alice, 28, "unterminated string`;

const result = parse(doc, null);
const errors = result.getErrors();

console.log(`\nFound ${errors.length} error(s):`);
errors.forEach((e: any, i: number) => {
  console.log(`\nError ${i + 1}:`, {
    message: e.message,
    code: (e as any).code,
    hasPositionRange: !!(e as any).positionRange,
    toString: e.toString()
  });
});

const stringError = errors.find((e: any) =>
  e.message.includes('Unterminated') ||
  e.message.includes('stringNotClosed') ||
  (e as any).code === 'stringNotClosed'
);

console.log('\nString error found:', !!stringError);
console.log('String error:', stringError);

if (!stringError) {
  console.log('\nAll error messages:');
  errors.forEach((e: any) => console.log('  -', e.message));
}
