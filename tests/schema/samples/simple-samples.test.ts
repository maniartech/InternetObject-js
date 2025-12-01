import { compileSchema, processSchema } from '../../../src/schema';
import ASTParser from '../../../src/parser/ast-parser';
import Tokenizer from '../../../src/parser/tokenizer';
import Definitions from '../../../src/core/definitions';
import ObjectNode from '../../../src/parser/nodes/objects';
import CollectionNode from '../../../src/parser/nodes/collections';

// Helper to parse IO doc into AST root
function parseDoc(doc: string) {
  const tokens = new Tokenizer(doc).tokenize();
  const ast = new ASTParser(tokens).parse();
  return ast;
}

// These tests require external files from io-playground - skip for now
describe.skip('Sample Data - Simple', () => {
  test('single object doc parses and processes without schema (open object)', () => {
    const sample = require('../../../../io-playground/src/sample-data/simple/simple-object').default;
    const ast = parseDoc(sample.doc);

    // Find the first ObjectNode in AST children
    let objectNode: ObjectNode | undefined = undefined;
    for (const child of ast.children) {
      if (child?.child instanceof ObjectNode) {
        objectNode = child.child;
        break;
      }
    }
    expect(objectNode).toBeInstanceOf(ObjectNode);

    // Without schema, processSchema should accept null schema as Token ref not provided
    // Here, we simulate open schema by compiling a simple open schema
    const defs = new Definitions();
    const schemaText = 'name, age, isActive, joiningDt, address: {street, city, state}, colors';
    const schema = compileSchema('SimpleObject', schemaText);

    const result = processSchema(objectNode!, schema, defs);
    expect(result).toBeTruthy();
    expect((result as any).name).toBeDefined();
    expect((result as any).address).toBeDefined();
  });

  test('simple collection doc parses and processes with compiled schema', () => {
    const sample = require('../../../../io-playground/src/sample-data/simple/simple-collection').default;
    const ast = parseDoc(sample.doc);

    const defs = new Definitions();
    const schemaText = 'name, age, gender, joiningDt, address: {street, city, state?}, colors, isActive';
    const schema = compileSchema('SimpleCollection', schemaText);

    // Find the first CollectionNode in AST children
    let collectionNode: CollectionNode | undefined = undefined;
    for (const child of ast.children) {
      if (child?.child instanceof CollectionNode) {
        collectionNode = child.child;
        break;
      }
    }
    expect(collectionNode).toBeInstanceOf(CollectionNode);

    const result = processSchema(collectionNode!, schema, defs);
    expect(result).toBeTruthy();
    expect((result as any).length).toBeGreaterThan(0);
  });
});
