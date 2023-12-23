import ASTParser                      from '../parser/ast-parser';
import ObjectNode                     from '../parser/nodes/objects';
import Tokenizer                      from '../tokenizer';
import registerTypes                  from '../types';
import Schema                         from './schema';
import compileObject                  from './compile-object';

registerTypes();

export default function compileSchema(name:string, schema: string): Schema {
  const tokens = new Tokenizer(schema).tokenize();
  const ast = new ASTParser(tokens).parse()
  return compileObject(name, ast.children[0].child as ObjectNode);
}
