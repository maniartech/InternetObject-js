import Definitions from '../core/definitions';
import ASTParser from '../parser/ast-parser';
import Tokenizer from '../parser/tokenizer';
import Node from '../parser/nodes/nodes';
import assertNever from '../errors/asserts/asserts';
import ErrorCodes from '../errors/io-error-codes';
import SyntaxError from '../errors/io-syntax-error';
import Schema from './schema';
import compileObject from './compile-object';

/**
 * Parse an inline schema definition string into a Schema instance.
 *
 * This is intended for dynamic schema strings (non-template-literal usage).
 * For template literals, prefer `io.schema` / `ioSchema`.
 *
 * @param schemaText - The schema string to parse (e.g., `{ name: string, age: int }`).
 * @param parentDefs - Optional parent definitions for resolving references.
 * @returns The parsed Schema instance.
 * @throws {SyntaxError} With a designated error code, if the definition is malformed
 *   (e.g. `expected-value` for a member declared with no type).
 * @throws {Error} If the input string is empty — a programmer error, not a data error.
 *
 * @example
 * ```typescript
 * const schema = parseSchema('{ name: string, age: int }');
 * ```
 */
export default function parseSchema(schemaText: string, parentDefs?: Definitions | null): Schema {
  const input = schemaText.trim();
  if (!input) {
    // Keep behavior strict; empty schema is a programmer error.
    throw new Error('parseSchema() requires a non-empty schema string');
  }

  const tokens = new Tokenizer(input).tokenize();
  const ast = new ASTParser(tokens).parse();

  // The parser accumulates rather than throws, and it has already diagnosed anything malformed
  // here with a designated code and a source position — `name:` reports `expected-value`.
  // Discarding that and substituting a bare `Error` was the one place in the library where an
  // error escaped with no code and no IO class, which ADR 0002 exists to prevent: a caller could
  // not branch on it, and the corpus recorded it as the literal string "Invalid schema input".
  // Schema compilation fails fast, so the FIRST error is the one to report.
  const parseErrors = ast.getErrors();
  if (parseErrors.length > 0) {
    throw parseErrors[0];
  }

  // The grammar parses a "document" AST; schema is the first node payload.
  const node = ast.children[0]?.child as Node | undefined;
  if (!node) {
    throw new SyntaxError(ErrorCodes.expectedValue, 'The schema definition has no value.');
  }

  const compiled = compileObject('inline', node, parentDefs ?? undefined);
  if (compiled instanceof Schema) {
    return compiled;
  }

  assertNever('Invalid schema type');
}
