/**
 * The two entry points (ADR 0005 §2, A2).
 *
 * ```ts
 * io.parse(text, defs?, sink?, options?)          → plain JavaScript
 * io.parseDocument(text, defs?, sink?, options?)  → the proxied document
 * ```
 *
 * Both parse and validate **identically** — same tokenizer, same parser, same schema rules. They
 * differ only in what they hand back.
 *
 * | | `parse` | `parseDocument` |
 * | --- | --- | --- |
 * | Returns | plain objects and arrays | document · sections · collections · records |
 * | Native values | `Date`, `Decimal`, `BigInt` preserved | same |
 * | `structuredClone` / `postMessage` / RSC | ✅ | ❌ — `toJSON()` at the boundary |
 * | Header, sections, round-trip to IO text | ❌ | ✅ |
 * | Validated writes | ❌ | ✅ |
 *
 * `parse` is the default because it is what most code wants and the only one that crosses a
 * boundary. `parseDocument` is what you reach for when you need the document *as* a document.
 *
 * **One pipeline, two shapes.** `parse` is `parseDocument(...).toObject()` — the projection rules
 * live in exactly one place (§3). Two parse implementations would drift, and the day they did,
 * `parse(text)` would quietly stop agreeing with `parseDocument(text).toObject()`. A dedicated POJO
 * builder is worth adding only when a benchmark says so, and then underneath this signature.
 */
import Definitions from '../core/definitions';
import Schema from '../schema/schema';
import parseCore from '../parser/index';
import { proxyDocument } from '../proxy';
import { ErrorSink, withSink } from './error-sink';

export type { ErrorSink } from './error-sink';

/** Definitions, a bare schema, or a schema's name — whatever the caller already holds. */
export type ParseDefs = Definitions | Schema | string | null;

/**
 * The options the parse family takes — one flag.
 *
 * `IOCommonOptions.schemaName` is deliberately **not** here: selecting a named schema for a parse
 * has no implementation on this path yet, and a public option that silently does nothing is worse
 * than a missing one — that is the whole reason `ParserOptions` was deleted (§2.4). Pass the schema
 * itself in the `defs` slot instead.
 */
export interface ParseOptions {
  /** Omit failed records from the result instead of embedding them in place (§5.1). */
  skipErrors?: boolean;
}

/**
 * Parses Internet Object text into the **proxied document** — sections, collections and records
 * reachable by name and by index, and writable in place.
 *
 * ```ts
 * const doc = io.parseDocument(`
 *   ~ $person: {name: string, age: int}
 *   --- employees: $person
 *   ~ Alice, 30
 *   ~ Bob, 25
 * `);
 *
 * doc.sections.employees[0].name     // 'Alice'
 * doc.sections.employees[1].age = 26 // written through to the document
 * doc.toObject()                     // the plain projection, whenever you need it
 * ```
 *
 * @param source The document text.
 * @param defs Definitions, a schema, or a schema name.
 * @param sink An array to fill or a function to call. Omit it and the first error throws.
 */
export function parseDocument(source: string, defs?: ParseDefs, sink?: ErrorSink): any {
  return withSink(sink, (bag) => proxyDocument(parseCore(source, defs, bag)));
}

/**
 * Parses Internet Object text into **plain JavaScript** — the shape the playground's JSON panel
 * shows, and the shape your code sees.
 *
 * ```ts
 * io.parse('name: string, age: int\n---\n~ Alice, 30\n~ Bob, 25')
 * // [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]
 * ```
 *
 * Values keep their real types: a `date` is a `Date`, a `decimal` a `Decimal`, a `bigint` a
 * `BigInt`. `toJSON()` is the spelling for the wire.
 *
 * @param source The document text.
 * @param defs Definitions, a schema, or a schema name.
 * @param sink An array to fill or a function to call. Omit it and the first error throws.
 * @param options `skipErrors` omits failed records rather than embedding them.
 */
export function parse(source: string, defs?: ParseDefs, sink?: ErrorSink, options?: ParseOptions): any {
  return withSink(sink, (bag) => parseCore(source, defs, bag).toObject(options));
}
