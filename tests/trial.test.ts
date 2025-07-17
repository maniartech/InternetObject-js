import Tokenizer from "../src/parser/tokenizer";
import ASTParser from "../src/parser/ast-parser";
import { ioObject } from "../src/template-funcs";

// ⚠️ This is a trial test file to try out new features and test cases
// ⚠️ It's not a part of the main test suite. It's just for testing
// ⚠️ work in progress features and test cases. You may find some
// ⚠️ broken test cases or incomplete, left out and commented code
// ⚠️ and imports. Please ignore this file.
describe('Trial', () => {
  it('should debug escape sequence handling', () => {
    const tokenizer = new Tokenizer('"valid\\z invalid"');
    const tokens = tokenizer.tokenize();
    
    console.log('Escape sequence test:');
    console.log('Input: "valid\\z invalid"');
    console.log('Token value:', JSON.stringify(tokens[0].value));
    console.log('Expected: "validz invalid"');
    console.log('Actual behavior:', tokens[0].value === "validz invalid" ? "CORRECT" : "INCORRECT");
  });

  it('should debug hex escape sequence handling', () => {
    const tokenizer = new Tokenizer('"valid\\xZZ invalid"');
    const tokens = tokenizer.tokenize();
    
    console.log('\nHex escape sequence test:');
    console.log('Input: "valid\\xZZ invalid"');
    console.log('Token value:', JSON.stringify(tokens[0].value));
    console.log('Expected: "validxZZ invalid"');
    console.log('Actual behavior:', tokens[0].value === "validxZZ invalid" ? "CORRECT" : "INCORRECT");
  });

  it('should debug unicode escape sequence handling', () => {
    const tokenizer = new Tokenizer('"valid\\uZZZZ invalid"');
    const tokens = tokenizer.tokenize();
    
    console.log('\nUnicode escape sequence test:');
    console.log('Input: "valid\\uZZZZ invalid"');
    console.log('Token value:', JSON.stringify(tokens[0].value));
    console.log('Expected: "validuZZZZ invalid"');
    console.log('Actual behavior:', tokens[0].value === "validuZZZZ invalid" ? "CORRECT" : "INCORRECT");
  });

  it('should debug byte string handling', () => {
    const tokenizer = new Tokenizer('b"unclosed base64, "valid string"');
    const tokens = tokenizer.tokenize();
    
    console.log('\nByte string test:');
    console.log('Input: b"unclosed base64, "valid string"');
    console.log('Tokens:', tokens.map(t => ({type: t.type, value: t.value, token: t.token})));
  });

  it('should debug collection error recovery', () => {
    const input = `
    ~ valid, object, here
    ~ invalid { unclosed object
    ~ another, valid, object
    `;
    
    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    
    console.log('\nTokens:');
    tokens.forEach((token, index) => {
      console.log(`${index}: ${token.type} - "${token.token}"`);
    });
    
    const astParser = new ASTParser(tokens);
    const docNode = astParser.parse();

    console.log('\nCollection error recovery test:');
    console.log('Document children:', docNode.children.length);
    
    const section = docNode.children[0];
    console.log('Section child type:', section.child?.constructor.name);
    
    if (section.child) {
      const collection = section.child;
      console.log('Collection children count:', collection.children.length);
      
      if (collection.constructor.name === 'CollectionNode') {
        const collectionNode = collection as any;
        console.log('Collection size():', collectionNode.size());
        console.log('Collection hasValidItems():', collectionNode.hasValidItems());
        console.log('Collection isValid():', collectionNode.isValid());
        console.log('Collection getValidItems() count:', collectionNode.getValidItems().length);
      }
      
      collection.children.forEach((child, index) => {
        console.log(`Child ${index}:`, child?.constructor.name);
        if (child?.constructor.name === 'ErrorNode') {
          console.log(`  Error message:`, (child as any).error?.message);
        }
      });
    }
  });
});
