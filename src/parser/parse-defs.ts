import parse          from "."
import ParserOptions  from "./parser-options"
import Definitions    from "../core/definitions"

/**
 * Parses a string containing schema, variable, or metadata definitions.
 * Returns a Definitions object containing the parsed definitions.
 *
 * Useful for pre-loading schemas that will be used across multiple documents.
 *
 * @param source - The definition string (e.g., `~ $Person: { name: string }`).
 * @param externalDefs - Optional base definitions to extend/inherit from.
 * @param options - Parser options.
 * @returns The parsed Definitions object, or null if input is empty.
 *
 * @example
 * ```typescript
 * const defs = parseDefinitions(`
 *   ~ $Person: { name: string, age: int }
 *   ~ @baseUrl: https://api.example.com
 * `);
 * const schema = defs.get('$Person');
 * ```
 */
export default function parseDefinitions(source: string): Definitions | null;
export default function parseDefinitions(
  source: string,
  externalDefs: Definitions | null,
  options?: ParserOptions
): Definitions | null;
export default function parseDefinitions(
  source: string,
  options?: ParserOptions
): Definitions | null;
export default function parseDefinitions(
  source: string,
  externalDefsOrOptions?: Definitions | ParserOptions | null,
  options?: ParserOptions
): Definitions | null {

  let externalDefs: Definitions | null = null
  let resolvedOptions: ParserOptions | undefined = undefined

  if (externalDefsOrOptions instanceof Definitions || externalDefsOrOptions === null) {
    externalDefs = externalDefsOrOptions ?? null
    resolvedOptions = options
  } else {
    resolvedOptions = externalDefsOrOptions
  }

  source = source.trim()
  if (!source) { return null }

  if (!source.endsWith("---")) {
    source += "\n---"
  }

  // If the definition does not start with ~, then it must be
  // a default schema. So, add "~ $schema: " in the beginning to make it a
  // definition.
  // if (!source.startsWith("~")) {
  //   source = "~ $schema: " + source
  // }

  const doc = parse(source, externalDefs, undefined, resolvedOptions)
  return doc.header.definitions
}
