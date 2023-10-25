
import Document from "../core/document";
import Tokenizer from "../tokenizer";
import ParserOptions from "./parser-options";
import ASTParser from './ast-parser';
import Header from "../core/header";
import { compileObject } from "../schema";
import Schema from "../schema/schema";
import processSchema from "../schema/processor";
import { ObjectNode } from "./nodes";
import Section from "../core/section";
import SectionCollection from "../core/section-collection";


export default function parse(source: string, o: ParserOptions = {}): Document {
  const tokenizer = new Tokenizer(source);
  const tokens = tokenizer.tokenize();

  const parser = new ASTParser(tokens);
  const docNode = parser.parse();

  const doc = new Document(new Header(), new SectionCollection())

  // documentNode.header
  if (docNode.header) {
    if (docNode.header?.child) {
      const schema = compileObject(docNode.header.child)
      doc.header.schema = schema
    }
  }

  if (doc.header.schema) {
    for (let i=0; i<docNode.children.length; i++) {
      const sectionNode = docNode.children[i]
      const result = processSchema(sectionNode.child as ObjectNode, doc.header.schema)
      doc.sections?.push(new Section(result, sectionNode.name))
    }

    // const rootObj = docNode.children[0].child
    // const result = processSchema(rootObj as ObjectNode, doc.header.schema)

    // doc.sections?.push(new Section(result))
  }

  return doc;
}
