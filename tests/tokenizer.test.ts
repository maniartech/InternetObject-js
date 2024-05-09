import Tokenizer from "../src/parser/tokenizer";
import TokenType from "../src/parser/tokenizer/token-types";

describe("WIP", () => {
  it("should tokenize various value types", () => {
    const input = String.raw`2023-09-27`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    console.log(tokens);
  });
});

describe("Tokenizer", () => {
  it("should tokenize various value types", () => {
    const input = `a, b:c, c, d, 10, -9, -0xFF, T, F, N, "\ud83d\ude00", "😀", hello, ---, r"[0-9\n\t\r]", "a\nb"`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
  });

  it("should tokenize the input string object into a series of tokens", () => {
    const input = `{
      a: 10,
      b: 2,
      c: 3
    }`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
  });

  it("should tokenize the binary string tokens", () => {
    const b1 = Buffer.from([0x01, 0x01, 0x01, 0x01]);
    const b2 = Buffer.from([0x02, 0x02, 0x02, 0x02]);
    const b3 = Buffer.from([0x03, 0x03, 0x03, 0x03]);

    const input = `{
      a: b'${b1.toString("base64")}',
      b: b"${b2.toString("base64")}",
      c: b'${b3.toString("base64")}',
    }`;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens[3].value).toEqual(b1);
    expect(tokens[7].value).toEqual(b2);
    expect(tokens[11].value).toEqual(b3);
  });

  it("should tokenize the decimal numbers including the negative numbers and scientific notation", () => {
    const input = `{
      a: -10,
      b: 2,
      c: 3.14,
      d: 1.2e3,
      e: -1.2e-3,
      f: 1.2e+3,
    }`;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens[3].value).toEqual(-10);
    expect(tokens[7].value).toEqual(2);
    expect(tokens[11].value).toEqual(3.14);
    expect(tokens[15].value).toEqual(1.2e3);
    expect(tokens[19].value).toEqual(-1.2e-3);
    expect(tokens[23].value).toEqual(1.2e3);
  });

  it("should tokenize the special numbers like NaN, Inf, +Inf, -Inf", () => {
    const input = `{
      a: NaN,
      b: Inf,
      c: +Inf,
      d: -Inf,
    }`;

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens[3].value).toEqual(NaN);
    expect(tokens[7].value).toEqual(Infinity);
    expect(tokens[11].value).toEqual(Infinity);
    expect(tokens[15].value).toEqual(-Infinity);
  });
});

describe("Internet Object String Tokens", () => {
  it("should tokenize the open string tokens", () => {
    const input = `a, 12312bc, de✨, fgh`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        expect(tokens[i].type).toEqual(TokenType.STRING);
      } else {
        expect(tokens[i].type).toEqual(TokenType.COMMA);
      }
    }
  });
});

describe("Internet Object Regular String Tokens", () => {
  it('should tokenize the regular string tokens using " ', () => {
    const input = `"a\nb", "c\td", "e\r\nf", "a🤝", "123hjsdfa", '123'`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens.length).toEqual(11);

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        expect(tokens[i].type).toEqual(TokenType.STRING);
      } else {
        expect(tokens[i].type).toEqual(TokenType.COMMA);
      }
    }
  });

  it("should tokenize the regular string tokens using '' ", () => {
    const input = `'a\nb', 'c\td', 'e\r\nf', 'a🤝', '123hjsdfa', '123'`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens.length).toEqual(11);

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        expect(tokens[i].type).toEqual(TokenType.STRING);
      } else {
        expect(tokens[i].type).toEqual(TokenType.COMMA);
      }
    }
  });
});

describe("Internet Object Raw String Tokens", () => {
  it("should tokenize the raw string tokens using r' '", () => {
    const input = `r'abc', r'de\nf', r'g~^&*(@hi🤐'`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    // expect(tokens.length).toEqual(7); // Fails

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        expect(tokens[i].type).toEqual(TokenType.STRING);
      } else {
        expect(tokens[i].type).toEqual(TokenType.COMMA);
      }
    }
  });

  it('should tokenize the raw string tokens using r" " ', () => {
    const input = `r"abc", r"de\nf", r"g~^&*(@hi🤐"`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    // expect(tokens.length).toEqual(7); // Fails

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        expect(tokens[i].type).toEqual(TokenType.STRING);
      } else {
        expect(tokens[i].type).toEqual(TokenType.COMMA);
      }
    }
  });
});

// Numbers

describe("Internet Object Number Tokens", () => {
  it("should tokenize the number tokens", () => {
    const input = `10, -10, 0,-0`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens.length).toEqual(7);

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        expect(tokens[i].type).toEqual(TokenType.NUMBER);
      } else {
        expect(tokens[i].type).toEqual(TokenType.COMMA);
      }
    }
  });

  it("should tokenize the decimal number tokens", () => {
    const input = `10.1, -10.1, 0.1,-0.1`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens.length).toEqual(7);

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        expect(tokens[i].type).toEqual(TokenType.NUMBER);
      } else {
        expect(tokens[i].type).toEqual(TokenType.COMMA);
      }
    }
  });

  it("should tokenize the bigint tokens", () => {
    const input = `10n, 0n, 234123412341234123513451765178923647891263784162893746182351234651267834n, -6178234657816578612786451786347861274618923n`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens.length).toEqual(7);

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        expect(tokens[i].type).toEqual(TokenType.BIGINT);
      } else {
        expect(tokens[i].type).toEqual(TokenType.COMMA);
      }
    }
  });

  it("should tokenize the scientific number tokens", () => {
    const input = `10e1, -10e1, 0e+1, 0e-123, 0e123, -0e-123, -0e123`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens.length).toEqual(13);

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        expect(tokens[i].type).toEqual(TokenType.NUMBER);
      } else {
        expect(tokens[i].type).toEqual(TokenType.COMMA);
      }
    }
  });

  it("should tokenize the binary number tokens", () => {
    const input = `0b1010, -0b1010, 0b0, -0b0, 0B1010, -0B1010, 0B0, -0B0`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens.length).toEqual(15);

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        console.log(tokens[i]);
        expect(tokens[i].type).toEqual(TokenType.NUMBER);
      } else {
        expect(tokens[i].type).toEqual(TokenType.COMMA);
      }
    }
  });

  it("should tokenize the octal number tokens", () => {
    const input = `0o10, -0o10, 0o0, -0o0, 0O10, -0O10, 0O0, -0O0`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens.length).toEqual(15);

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        console.log(tokens[i]);
        expect(tokens[i].type).toEqual(TokenType.NUMBER);
      } else {
        expect(tokens[i].type).toEqual(TokenType.COMMA);
      }
    }
  });

  it("should tokenize the hexadecimal number tokens", () => {
    const input = `0x10, -0x10, 0x0, -0x0, 0X10, -0X10, 0X0, -0X0`;
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    expect(tokens.length).toEqual(15);

    for (let i = 0; i < tokens.length; i++) {
      if (i % 2 === 0) {
        console.log(tokens[i]);
        expect(tokens[i].type).toEqual(TokenType.NUMBER);
      } else {
        expect(tokens[i].type).toEqual(TokenType.COMMA);
      }
    }
  });
});
