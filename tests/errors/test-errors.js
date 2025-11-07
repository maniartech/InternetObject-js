const parse = require('./dist/parser').default;

const source = `
name, age:{number, min:30}
---
[John, 25
{David, 35
`;

try {
  const doc = parse(source, null);
  const errors = doc.getErrors();
  console.log(`Total errors: ${errors.length}`);
  errors.forEach((err, idx) => {
    console.log(`${idx + 1}. ${err.code}: ${err.message} at ${err.position?.line}:${err.position?.char}`);
  });

  const json = doc.toJSON({ skipErrors: false });
  console.log('\nJSON output:', JSON.stringify(json, null, 2));
} catch (err) {
  console.error('Parse error:', err);
}
