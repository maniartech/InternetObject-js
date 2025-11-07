import { parse } from '../../src';

const doc = `name, age, gender, joiningDt, address: {street, city, state?}, colors, isActive
---
~ Alice Smith, 28, f, d'2021-04-15', {Elm Street, Dallas, TX}, [yellow, green], T
`;

try {
  const result = parse(doc);
  const errors = result.getErrors();

  console.log(`\nFound ${errors.length} error(s):\n`);

  errors.forEach((err: any, idx: number) => {
    console.log(`Error ${idx + 1}:`);
    console.log(`  Message: ${err.message}`);
    console.log(`  Name: ${err.name}`);

    if (err.positionRange) {
      const start = err.positionRange.getStartPos();
      const end = err.positionRange.getEndPos();
      console.log(`  Start: ${start.row}:${start.col} (pos ${start.pos})`);
      console.log(`  End: ${end.row}:${end.col} (pos ${end.pos})`);
    } else {
      console.log(`  No position range!`);
    }
    console.log('');
  });

  console.log('\nJSON Output:');
  console.log(JSON.stringify(result.toJSON(), null, 2));

} catch (e: any) {
  console.error('Parse failed:', e.message);
  if (e.positionRange) {
    const start = e.positionRange.getStartPos();
    const end = e.positionRange.getEndPos();
    console.log(`  Start: ${start.row}:${start.col} (pos ${start.pos})`);
    console.log(`  End: ${end.row}:${end.col} (pos ${end.pos})`);
  }
}
