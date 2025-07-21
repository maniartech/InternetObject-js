export { default as Schema        } from './schema';
export { default as compileObject } from './compile-object';
export { default as processObject } from './object-processor';
export { default as processSchema } from './processor';

// Public API: compileSchema
import Schema         from './schema';
import compileObject  from './compile-object';
import ASTParser      from '../parser/ast-parser';
import Tokenizer      from '../parser/tokenizer';
import Node           from '../parser/nodes/nodes';
import assertNever    from '../errors/asserts/asserts';

export function compileSchema(name: string, schema: string): Schema {
  const tokens = new Tokenizer(schema).tokenize();
  const ast = new ASTParser(tokens).parse();
  const node = compileObject(name, ast.children[0].child as Node);
  if (node instanceof Schema) {
    return node;
  }
  assertNever('Invalid schema type');
}
