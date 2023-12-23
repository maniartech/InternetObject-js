import parse          from "."
import ParserOptions  from "./parser-options"
import Definitions    from "../core/definitions"


export default function parseDefinitions(
    source: string, externalDefs: Definitions, options?: ParserOptions
  ): Definitions | null {

  if (!source) { return null }

  source = source.trimEnd()
  if (!source.endsWith("---")) {
    source += "\n---"
  }

  const doc = parse(source, externalDefs, options)
  return doc.header.definitions
}
