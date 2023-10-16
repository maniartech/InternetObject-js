import Tokenizer from "../src/tokenizer";

describe('Trial', () => {
  it('should try wip tasks', () => {
    const input = String.raw`d"2020-01-01"`
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    console.log(tokens);
  });
});
