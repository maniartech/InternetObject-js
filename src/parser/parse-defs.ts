import parse          from "."
import ParserOptions  from "./parser-options"
import Definitions    from "../core/definitions"

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
