
import Document from "../core/document";
import Tokenizer from "../tokenizer";
import ParserOptions from "./parser-options";
import ASTParser from './ast-parser';


function parse(source: string, o: ParserOptions = {}): Document {
  const tokenizer = new Tokenizer(source);
  const tokens = tokenizer.tokenize();

  const parser = new ASTParser(tokens);
  const documentNode = parser.parse();

  throw new Error('Not implemented yet!');

  // documentNode.header


  // return new Document();
}