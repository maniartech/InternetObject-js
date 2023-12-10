import Document               from '../core/document';
import Header                 from '../core/header';
import Section                from '../core/section';
import SectionCollection      from '../core/section-collection';
import assertNever            from '../errors/asserts/asserts';
import InternetObjectError from '../errors/io-error';
import ErrorCodes from '../errors/io-error-codes';
import {
       compileObject        } from '../schema';
import processSchema          from '../schema/processor';
import Tokenizer              from '../tokenizer';
import TokenType              from '../tokenizer/token-types';
import ASTParser              from './ast-parser';
import {
  CollectionNode,
  DocumentNode,
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
      else { assertNever(docNode.header.child) }
    }

    if (doc.header.schema) {
      parseDataWithSchema(docNode, doc);
    } else {
      parseData(docNode, doc);
    }
  } else {
    parseData(docNode, doc);
  }

  return doc;
}

function parseData(docNode: DocumentNode, doc: Document) {
  for (let i = 0; i < docNode.children.length; i++) {
    const sectionNode = docNode.children[i];
    doc.sections?.push(new Section(sectionNode.child?.toValue(doc.header.definitions || undefined), sectionNode.name));
  }
}

function parseDataWithSchema(docNode: DocumentNode, doc: Document) {
  if (!doc.header.schema) {
    assertNever("Schema is required");
  }

  for (let i = 0; i < docNode.children.length; i++) {
    const sectionNode = docNode.children[i];
    const result = processSchema(sectionNode.child as ObjectNode, doc.header.schema, doc.header.definitions || undefined);
    doc.sections?.push(new Section(result, sectionNode.name));
  }
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
      assertNever("Invalid definition, must be object");
    }

    // Must not be null
    if (child.children[0] === null) {
      // throw new InternetObjectError(ErrorCodes.invalidDefinition)
      assertNever("Invalid definition");
    }

    // Must have only one child
    if (child.children.length !== 1) {
      // throw new InternetObjectError(ErrorCodes.invalidDefinition, child.children?.[1], child.children?[1])
    }


    const memberNode  = (child.children[0] as MemberNode)

    // Must have a key
    if (!memberNode.key) {
      debugger
      throw new InternetObjectError(ErrorCodes.invalidDefinition, memberNode.value.toValue().toString(), memberNode.value)
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
