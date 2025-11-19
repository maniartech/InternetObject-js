import('./dist/index.js').then((mod) => {
  const { default: InternetObject } = mod;
  const tokenize = require('./dist/parser/tokenizer/index.js').default;

  const text = `--- users
~ Alice
--- admins
~ Admin`;

  console.log('Text to tokenize:');
  console.log(text);
  console.log('\n=== TOKENS ===\n');

  const tokens = tokenize(text);
  tokens.forEach((token, i) => {
    console.log(`${i}: ${token.type} "${token.token}" (pos: ${token.position.start?.pos})`);
  });

  console.log(`\nTotal tokens: ${tokens.length}`);
}).catch(console.error);
