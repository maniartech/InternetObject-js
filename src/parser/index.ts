
import Document               from '../core/document';
import Header                 from '../core/header';
import Section                from '../core/section';
import SectionCollection      from '../core/section-collection';
import {
       compileObject        } from '../schema';
import processSchema          from '../schema/processor';
import Tokenizer              from '../tokenizer';
import ASTParser              from './ast-parser';
import {
       ObjectNode           } from './nodes';
import ParserOptions          from './parser-options';

export default function parse(source: string, o: ParserOptions = {}): Document {
  const tokenizer = new Tokenizer(source);
  const tokens    = tokenizer.tokenize();
  const parser    = new ASTParser(tokens);
  const doc       = new Document(new Header(), new SectionCollection())
  const docNode   = parser.parse();

  // documentNode.header
  if (docNode.header) {
    if (docNode.header?.child) {
      const schema = compileObject("schema", docNode.header.child)
      doc.header.schema = schema
    }
  }

  if (doc.header.schema) {
    for (let i=0; i<docNode.children.length; i++) {
      const sectionNode = docNode.children[i]
      const result = processSchema(sectionNode.child as ObjectNode, doc.header.schema)
      doc.sections?.push(new Section(result, sectionNode.name))
    }
  }

  return doc;
}
