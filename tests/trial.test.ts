import Tokenizer from "../src/tokenizer";

describe('Trial', () => {
  it('should try wip tasks', () => {
    const input = String.raw`
    testing
    `
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    console.log(tokens);
  });
});
