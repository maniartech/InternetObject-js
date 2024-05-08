import Parser from "./ast-parser";
import Document from '../core/document';
import Tokenizer from "./tokenizer";
import Header from "../core/header";


function io(strings: TemplateStringsArray, ...values: any[]): Document {
  const input = strings.raw.join('');
  const tokenizer = new Tokenizer(input);
  const tokens = tokenizer.tokenize();

  const parser = new Parser(tokens);
  const result = parser.parse();

  console.log(result);
  return new Document(new Header(), null);
}

export default io;
