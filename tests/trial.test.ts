import parse from "../src/parser";
import Tokenizer from "../src/parser/tokenizer";
import ASTParser from "../src/parser/ast-parser";
import compileSchema from '../src/schema/index';

// ⚠️ This is a trial test file to try out new features and test cases
// ⚠️ It's not a part of the main test suite. It's just for testing
// ⚠️ work in progress features and test cases. You may find some
// ⚠️ broken test cases or incomplete, left out and commented code
// ⚠️ and imports. Please ignore this file.
describe('Trial', () => {
  it('should try wip tasks', () => {
    const input = String.raw`
    $categories: {name, description}
    --- $categories
    ~ Electronics, Electronics items
    `

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    console.log(tokens)

    const ast = new ASTParser(tokens).parse();
    console.log(JSON.stringify(ast, null, 2))
    // const result = parse(input, null)
    // console.log(result)

    // const input = String.raw`~ recordCount: 22
    // ~ page: 3
    // ~ prevPage: "/api/v1/people/pa ge/2"
    // ~ nextPage: N
    // ~ $schema: {
    //     name: string,  # The person name
    //     age: {int, min:20, max:35},  # The person age!
    //     joiningDt: date,  # The person joining date
    //     gender?: {string, choices:[m, f, u]},
    //     address?*: { # Person's address (optional) (Nullable)
    //       street: string,
    //       city: {string, choices:[New York, San Fransisco, Washington]},
    //       state: {string, maxLen:2, choices:[NY, CA, WA]}
    //     },
    //     colors?: [string], # Color array inthe form of string array
    //     isActive?: {bool, F}
    //   }
    // ---
    // ~ John Doe, 25, d'2022-01-01', m, {Bond Street, New York, NY}, [red, blue], T
    // ~ Jane Done, 20, d'2022-10-10', f, {Bond Street, New York, NY}, [green, purple]
    // `

    // const result = parse(input);
    // if (result.sections) {
    //   const data = result.sections[0]._data[0]
    //   const o:any = { ...data }
    //   console.log(o)
    // }
    // console.log(result.toObject())
  });
});
