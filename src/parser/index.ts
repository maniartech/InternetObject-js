import Document               from '../core/document';
import Header                 from '../core/header';
import Section                from '../core/section';
import SectionCollection      from '../core/section-collection';
import { assertFailure      } from '../errors/asserts';
import {
       compileObject        } from '../schema';
import processSchema          from '../schema/processor';
import Tokenizer              from '../tokenizer';
import TokenType              from '../tokenizer/token-types';
import ASTParser              from './ast-parser';
import {
  CollectionNode,
  MemberNode,
  Node,
  ObjectNode                } from './nodes';
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
      // If ObjectNode, it is a default schema
      if (docNode.header.child instanceof ObjectNode) {
        const schema = compileObject("schema", docNode.header.child)
        doc.header.schema = schema
      }

      // If CollectionNode, it is a definitions
      else if (docNode.header.child instanceof CollectionNode) {
        parseDefs(doc, docNode.header.child)
      }

      // Unepxected node
      else { assertFailure(docNode.header.child) }
    }

    if (doc.header.schema) {
      for (let i=0; i<docNode.children.length; i++) {
        const sectionNode = docNode.children[i]
        const result = processSchema(sectionNode.child as ObjectNode, doc.header.schema, doc.header.definitions || undefined)
        doc.sections?.push(new Section(result, sectionNode.name))
      }
    }
  } else {
    for (let i=0; i<docNode.children.length; i++) {
      const sectionNode = docNode.children[i]
      doc.sections?.push(new Section(sectionNode.child?.toValue(), sectionNode.name))
    }
  }

  return doc;
}

function parseDefs(doc:Document, cols:CollectionNode) {
  for (let i=0; i<cols.children.length; i++) {
    const child = cols.children[i] as ObjectNode;

    // If child is null then skip
    if (child === null) {
      continue;
    }

    // Must be an object node
    if (child instanceof ObjectNode === false) {
      throw new Error("Invalid typedef definition");
    }

    // Must not be null
    if (child.children[0] === null) {
      throw new Error("Invalid typedef definition");
    }

    // Must have only one child
    if (child.children.length !== 1) {
      throw new Error("Invalid typedef definition");
    }

    const keyToken  = (child.children[0] as MemberNode).key

    // Must have a key
    if (!keyToken) {
      throw new Error("Invalid typedef definition");
    }

    // Key must be a string
    if (keyToken.type !== TokenType.STRING) {
      throw new Error("Invalid typedef definition");
    }

    let key:string = keyToken.value as string

    // If key starts with $, then it is a schema. Compille it
    if (key.startsWith('$')) {
      (doc.header as any).definitions.push(key, compileObject(key, (child.children[0] as any).value), true);
      continue;
    }

    let value:Node = (child.children[0] as MemberNode).value;
    (doc.header as any).definitions.push(key, value.toValue(doc.header.definitions || undefined));
  }
}
