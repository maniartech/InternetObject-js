import Parser     from "../src/parser";
import Tokenizer  from "../src/tokenizer";


describe('Parser', () => {

  it('should try parsing', () => {
    // const input = `{{},
    //   name: John Smith,
    //   age: 32,
    //   married: T,
    //   {}, {},,
    //   objectArray: [a: 1, b: 2, c: 3,],
    //   color: red, green, blue,
    //   roles: [admin,, user, [a, b, c, {}],],
    //   address: {
    //     street: '123 Fake St.',
    //     city: Springfield,
    //     state: IL,
    //     zip: 62701,
    //     [[[]], {}], {{{}}},,
    //   }
    // }
    // `

    const input = `
      T, 'T', c, {d} # comment
      ---
      1 ,2, 3, 4
    `

    // const input = `
    // ---
    // name, age, gender
    // --- employee:emp
    // ~ John Doe, 25, M
    // ~ { Jane Doe, 23, 'F' }
    // ~ a, {}
    // ~ b
    // --- schema
    // { abc, xyz, 123 }
    // `

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();

    console.log(tokens);
    const parser = new Parser(tokens);
    const result = parser.parse();
    console.log(result.children[0].child?.children[0]);
  });
});
