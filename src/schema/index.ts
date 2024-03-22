import assertNever                    from '../errors/asserts/asserts';
import ASTParser                      from '../parser/ast-parser';
import Node                           from '../parser/nodes/nodes';
import Tokenizer                      from '../tokenizer';
import Schema                         from './schema';
import compileObject                  from './compile-object';

export default function compileSchema(name:string, schema: string): Schema {
  const tokens = new Tokenizer(schema).tokenize();
  const ast = new ASTParser(tokens).parse()
  const node = compileObject(name, ast.children[0].child as Node);
  if (node instanceof Schema) {
    return node;
  }

  assertNever("Invalid schema type");
}
