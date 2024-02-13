import ASTParser                      from '../parser/ast-parser';
import Node                           from '../parser/nodes/nodes';
import Tokenizer                      from '../tokenizer';
import Schema                         from './schema';
import compileObject                  from './compile-object';

export default function compileSchema(name:string, schema: string): Schema {
  const tokens = new Tokenizer(schema).tokenize();
  const ast = new ASTParser(tokens).parse()
  return compileObject(name, ast.children[0].child as Node);
}
