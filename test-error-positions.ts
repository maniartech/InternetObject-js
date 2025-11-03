import { parse } from './src/index';
import IOError from './src/errors/io-error';

const doc = `name, address
---
~ Bob, {Street, City
`;

console.log('Testing error position extraction...\n');

try {
  const result = parse(doc, null);
  const errors = result.getErrors();

  console.log(`Errors found: ${errors.length}`);

  errors.forEach((err: any, i) => {
    console.log(`\nError ${i + 1}:`);
    console.log(`  Message: ${err.message}`);
    console.log(`  Is IOError: ${err instanceof IOError}`);
    console.log(`  Constructor: ${err.constructor.name}`);

    // Try to access positionRange
    console.log(`  positionRange (direct): ${err.positionRange}`);
    console.log(`  position (alias): ${err.position}`);

    // Try the getter
    const pr = err.positionRange;
    console.log(`  positionRange value:`, pr);

    if (pr) {
      console.log(`  Has getStartPos: ${typeof pr.getStartPos === 'function'}`);
      if (typeof pr.getStartPos === 'function') {
        const start = pr.getStartPos();
        const end = pr.getEndPos();
        console.log(`  Start Position: line ${start.row}, col ${start.col}`);
        console.log(`  End Position: line ${end.row}, col ${end.col}`);
      }
    } else {
      console.log('  ⚠️  positionRange is null/undefined');
    }
  });

} catch (e: any) {
  console.log('❌ Parse threw exception:', e.message);
}
