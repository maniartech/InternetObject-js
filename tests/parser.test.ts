import ASTParser from "../src/parser/ast-parser";
import Tokenizer  from "../src/parser/tokenizer";


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
    name: Spiderman,
    age: 25,
    active: T,
    address: {
      street: '123 Fake St.',
      city: Springfield,
      state: IL,
      zip: 62701,
    }
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
    const parser = new ASTParser(tokens);

    const result = parser.parse().toValue().sections[0];

    console.log(JSON.stringify(result, null, 2));
  });
});
