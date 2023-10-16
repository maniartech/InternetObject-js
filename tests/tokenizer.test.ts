import Tokenizer from "../src/tokenizer";

describe('WIP', () => {
  it('should tokenize various value types', () => {
    const input = String.raw`2023-09-27`
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    console.log(tokens);
  });
});

describe('Tokenizer', () => {
  it('should tokenize various value types', () => {
    const input = `a, b:c, c, d, 10, -9, -0xFF, T, F, N, "\ud83d\ude00", "😀", hello, ---, r"[0-9\n\t\r]", "a\nb"`
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
  });

  it('should tokenize the input string object into a series of tokens', () => {
    const input = `{
      a: 10,
      b: 2,
      c: 3
    }`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
  });

  it('should tokenize the binary string tokens', () => {
    const b1 = Buffer.from([0x01, 0x01, 0x01, 0x01])
    const b2 = Buffer.from([0x02, 0x02, 0x02, 0x02])
    const b3 = Buffer.from([0x03, 0x03, 0x03, 0x03])

    const input =`{
      a: b'${b1.toString('base64')}',
      b: b"${b2.toString('base64')}",
      c: b'${b3.toString('base64')}',
    }`;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens[3].value).toEqual(b1);
    expect(tokens[7].value).toEqual(b2);
    expect(tokens[11].value).toEqual(b3);
  });
});
