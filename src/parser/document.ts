import Parser from ".";
import Document from "../core/document";
import Tokenizer from "../tokenizer";


export function doc(strings: TemplateStringsArray, ...values: any[]): Document {
  const input = strings.raw.join('');
  const tokenizer = new Tokenizer(input);
  const tokens = tokenizer.tokenize();

  const parser = new Parser(tokens);
  const result = parser.parse();

  console.log(result);
  return new Document()
}
