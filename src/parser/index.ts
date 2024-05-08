import Definitions            from '../core/definitions';
import Document               from '../core/document';
import Header                 from '../core/header';
import Section                from '../core/section';
import SectionCollection      from '../core/section-collection';
import assertNever            from '../errors/asserts/asserts';
import InternetObjectError    from '../errors/io-error';
import ErrorCodes             from '../errors/io-error-codes';
import compileObject          from '../schema/compile-object';
import processSchema          from '../schema/processor';
import Tokenizer              from './tokenizer';
import TokenType              from './tokenizer/token-types';
import ASTParser              from './ast-parser';
import CollectionNode         from './nodes/collections';
import DocumentNode           from './nodes/document';
import MemberNode             from './nodes/members';
import ObjectNode             from './nodes/objects';
import TokenNode              from './nodes/tokens';
import ParserOptions          from './parser-options';
import Node                   from './nodes/nodes';


export default function parse(source: string, externalDefs: Definitions | null,  o: ParserOptions = {}): Document {
  // Tokenize the source
  const tokenizer = new Tokenizer(source);
  const tokens    = tokenizer.tokenize();

  // If the source is empty, then return empty document
  const doc       = new Document(new Header(), new SectionCollection())
  if (tokens.length === 0) { return doc; }

  // Parse the tokens into AST
  const parser    = new ASTParser(tokens);
  const docNode   = parser.parse();

  // If the docNode contains header, then parse it
  if (docNode.header) {
    if (docNode.header.child) {
      // If ObjectNode, it is a default schema
      //
      // name, age, address  # <-- This is a schema
      // ---
      if (docNode.header.child instanceof ObjectNode) {
        const schema = compileObject("schema", docNode.header.child)
        doc.header.definitions?.push("$schema", schema, true)
      }

      // If CollectionNode, it is a definitions
      else if (docNode.header.child instanceof CollectionNode) {
        parseDefs(doc, docNode.header.child)
      }

      // Unepxected node
      else { assertNever(docNode.header.child) }

      if (externalDefs) {
        doc.header.definitions.merge(externalDefs, false);
      }
    } else {
      if (externalDefs) {
        doc.header.definitions.merge(externalDefs, false);
      }
    }

    parseDataWithSchema(docNode, doc);
    // if (doc.header) {
    // } else {
    //   parseData(docNode, doc);
    // }
  } else {
    if (externalDefs) {
      doc.header.definitions.merge(externalDefs, false);
    }
    parseDataWithSchema(docNode, doc);
    // if (doc.header) {
    // } else {
    //   parseData(docNode, doc);
    // }
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
  // if (!doc.header.schema) {
  //   assertNever("Schema is required");
  // }

  for (let i = 0; i < docNode.children.length; i++) {
    const sectionNode = docNode.children[i];
    const schemaName = sectionNode.schemaName
    const schema = schemaName === "$schema" ? doc.header.schema : doc.header.definitions?.getV(sectionNode.schemaNode)

    if (!schema) {
      parseData(docNode, doc)
      continue
    }

    const result = processSchema(sectionNode.child, schema, doc.header.definitions || undefined);
    doc.sections?.push(new Section(result, sectionNode.name, schemaName));
  }
}

function parseDefs(doc:Document, cols:CollectionNode) {
  const defs = (doc.header as any).definitions
  const schemaDefs: { key: string, schemaDef: Node }[] = []
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
      throw new InternetObjectError(ErrorCodes.invalidDefinition, memberNode.value.toValue().toString(), memberNode.value)
    }

    const keyToken = memberNode.key as TokenNode

    // Key must be a string
    if (keyToken.type !== TokenType.STRING) {
      throw new Error("Invalid typedef definition");
    }

    let key:string = keyToken.value as string

    // If key starts with $, then it is a schema. Dont compile it now,
    // just keep it as it is. After all the definitions are parsed, compile
    // the variable schemas.
    if (key.startsWith('$')) {
      defs.push(key, memberNode.value, true);
      schemaDefs.push({ key, schemaDef: memberNode.value });
      continue;
    }

    // If key starts with @, then it is a variable. Keep it as it is
    if (key.startsWith('@')) {
      defs.push(key, memberNode.value, false, true);
      continue;
    }

    let value:Node = (child.children[0] as MemberNode).value;
    defs.push(key, value.toValue(doc.header.definitions || undefined));
  }

  // Compile the schema definitions
  for (let i=0; i<schemaDefs.length; i++) {
    const { key, schemaDef } = schemaDefs[i];
    const def = compileObject(key, schemaDef, defs);

    defs.set(key, def);
  }
}
