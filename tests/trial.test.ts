import Tokenizer from "../src/parser/tokenizer";
import ASTParser from "../src/parser/ast-parser";
import { ioObject } from "../src/template-funcs";

// ⚠️ This is a trial test file to try out new features and test cases
// ⚠️ It's not a part of the main test suite. It's just for testing
// ⚠️ work in progress features and test cases. You may find some
// ⚠️ broken test cases or incomplete, left out and commented code
// ⚠️ and imports. Please ignore this file.
describe('Trial', () => {
  it('should try wip tasks', () => {

    const o = ioObject`
      name: aamir, age: 50
    `

    console.log(o?.toJSON());

  });
});
