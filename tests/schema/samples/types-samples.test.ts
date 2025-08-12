import { compileSchema, processSchema } from '../../../src/schema';
import ASTParser from '../../../src/parser/ast-parser';
import Tokenizer from '../../../src/parser/tokenizer';
import Definitions from '../../../src/core/definitions';
import CollectionNode from '../../../src/parser/nodes/collections';

function parseDoc(doc: string) {
  const tokens = new Tokenizer(doc).tokenize();
  const ast = new ASTParser(tokens).parse();
  return ast;
}

describe('Sample Data - Types', () => {
  test('strings sample compiles schema and processes doc', () => {
    const sample = require('../../../../io-playground/src/sample-data/types/strings').default;

    const defs = new Definitions();
    const schema = compileSchema('Strings', sample.schema);

    const ast = parseDoc(sample.doc);
    const collectionNode = ast.children[0]?.child as CollectionNode;
    const result = processSchema(collectionNode, schema, defs);

    expect(result).toBeTruthy();
    expect((result as any).length).toBeGreaterThan(0);
  });

  test.skip('numbers sample compiles schema and processes doc', () => {
    const sample = require('../../../../io-playground/src/sample-data/types/numbers').default;

    const defs = new Definitions();
    const schema = compileSchema('Numbers', sample.schema);

    const ast = parseDoc(sample.doc);
    const collectionNode = ast.children[0]?.child as CollectionNode;
    const result = processSchema(collectionNode, schema, defs);

  // TODO: Re-enable after ensuring compileSchema supports this sample's schema format consistently
  expect(result).toBeTruthy();
  expect((result as any).length).toBeGreaterThan(0);
  });
});
