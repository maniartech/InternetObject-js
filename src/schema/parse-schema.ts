import Definitions from '../core/definitions';
import ASTParser from '../parser/ast-parser';
import Tokenizer from '../parser/tokenizer';
import Node from '../parser/nodes/nodes';
import assertNever from '../errors/asserts/asserts';
import Schema from './schema';
import compileObject from './compile-object';

/**
 * Parse an inline schema definition string into a Schema instance.
 *
 * This is intended for dynamic schema strings (non-template-literal usage).
 * For template literals, prefer `io.schema` / `ioSchema`.
 */
export default function parseSchema(schemaText: string, parentDefs?: Definitions | null): Schema {
  const input = schemaText.trim();
  if (!input) {
    // Keep behavior strict; empty schema is a programmer error.
    throw new Error('parseSchema() requires a non-empty schema string');
  }

  const tokens = new Tokenizer(input).tokenize();
  const ast = new ASTParser(tokens).parse();

  // The grammar parses a "document" AST; schema is the first node payload.
  const node = ast.children[0]?.child as Node | undefined;
  if (!node) {
    throw new Error('Invalid schema input');
  }

  const compiled = compileObject('inline', node, parentDefs ?? undefined);
  if (compiled instanceof Schema) {
    return compiled;
  }

  assertNever('Invalid schema type');
}
