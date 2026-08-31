import Definitions      from './core/definitions';
import Document         from './core/document';
import InternetObject from './core/internet-object';
import ASTParser from './parser/ast-parser';
import parse            from './parser/index';
import parseDefinitions from './parser/parse-defs';
import Tokenizer from './parser/tokenizer';
import Schema from './schema/schema';
import parseSchema from './schema/parse-schema';
import { buildTemplateSource } from './template-literal';
import { parse as parsePlain, parseDocument as parseDoc } from './facade/parse';
import type { ParseDefs } from './facade/parse';
import type { ErrorSink } from './facade/error-sink';

/**
 * The bare tag: Internet Object text written in place, handed back as **plain JavaScript**.
 *
 * ```ts
 * const people = io`
 *   name: string, age: int
 *   ---
 *   ~ Alice, 30
 *   ~ Bob, 25
 * `;
 * // [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]
 * ```
 *
 * This is `parse` in tag form, and the pairing is deliberate: `io` is to `io.doc` exactly what
 * `parse` is to `parseDocument`. Plain by default, the document when you ask for it by name.
 *
 * An interpolated `${value}` is written as a **value**, never spliced in as source, so
 * `${'Smith, John'}` stays one string rather than becoming two members.
 *
 * @param {TemplateStringsArray} strings - Template string segments.
 * @param {...any} args - Interpolated values.
 * @returns {any} Plain objects and arrays.
 */
export function ioParse(strings: TemplateStringsArray, ...args: any[]): any {
  return parsePlain(buildTemplateSource(strings, args));
}

/**
 * The bare tag with external definitions, and a sink in the same slot as every other `.with`.
 *
 * ```ts
 * const person = io.schema`{name: string, age: int}`;
 * const alice  = io.with(person)`Alice, 30`;   // { name: 'Alice', age: 30 }
 * ```
 *
 * A `Definitions` block works the same way, provided it designates a default schema (`$schema`);
 * a named one that nothing selects leaves the record positional, exactly as `io.doc.with` does.
 *
 * @param {ParseDefs} defs - Definitions, a schema, or a schema name.
 * @param {ErrorSink} [sink] - An array to fill or a function to call; omit it and the first error throws.
 * @returns {function(TemplateStringsArray, ...any[]): any} A tag function returning plain JavaScript.
 */
ioParse.with = (defs: ParseDefs, sink?: ErrorSink): (strings: TemplateStringsArray, ...args: any[]) => any => {
  return (strings: TemplateStringsArray, ...args: any[]) =>
    parsePlain(buildTemplateSource(strings, args), defs, sink);
}

/**
 * Parses a string (template literal) as an Internet Object document and returns a Document instance.
 *
 * @example
 *   const doc = ioDocument`
 *     name, age
 *     ---
 *     ~ Alice, 30
 *     ~ Bob, 40
 *   `;
 *
 * @param {TemplateStringsArray} strings - Template string segments.
 * @param {...any} args - Interpolated values.
 * @returns {Document} Parsed Document instance.
 */
export function ioDocument(strings: TemplateStringsArray, ...args: any[]): Document {
  const input = buildTemplateSource(strings, args);

  // Through the facade, not the core parser: `io.doc` must return what `parseDocument` returns,
  // which is the PROXIED document. Measured 2026-08-31, it did not -- the tag called the core
  // parser directly, so `` io.doc`...`.data `` was `undefined` where `parseDocument(...).data`
  // gave the section. Same asymmetry the bare `io` tag was missing entirely.
  return parseDoc(input);
}

/**
 * Tag function for parsing a document with external definitions (such as variables or schema).
 *
 * @example
 *   const defs = ioDefinitions`~ $schema: { name, age }`;
 *   const doc = ioDocument.with(defs)`
 *     ~ Alice, 30
 *     ~ Bob, 40
 *   `;
 *
 * @param {Definitions | Schema | string | null} defs - External definitions (variables, schema).
 * @param {Error[]} [errorCollector] - Optional array to collect validation errors.
 * @returns {function(TemplateStringsArray, ...any[]): Document} A tag function for parsing with definitions.
 */
ioDocument.with = (defs: ParseDefs, sink?: ErrorSink): (strings: TemplateStringsArray, ...args: any[]) => Document => {
  return (strings: TemplateStringsArray, ...args: any[]) => {
    const input = buildTemplateSource(strings, args);

    return parseDoc(input, defs, sink);
  }
}

/**
 * Parses a string (template literal) as an Internet Object document and returns a plain JavaScript object or array.
 *
 * @example
 *   const obj = ioObject`name, age --- ~ Alice, 30`;
 *   // obj: [{ name: 'Alice', age: 30 }]
 *
 * @param {TemplateStringsArray} strings - Template string segments.
 * @param {...any} args - Interpolated values.
 * @returns {any} Parsed JavaScript object or array.
 */
export function ioObject(strings: TemplateStringsArray, ...args: any[]): InternetObject | null {
  const input = buildTemplateSource(strings, args);

  // Tokenize the source
  const tokenizer = new Tokenizer(input);
  const tokens    = tokenizer.tokenize();

  const parser    = new ASTParser(tokens);
  const docNode   = parser.parse();

  return docNode.firstChild?.firstChildObject?.toValue() || null;
}

/**
 * Parses a string and returns an Internet Object instance with external definitions (variables, schema, etc.).
 *
 * @example
 *   const defs = ioDefinitions`
 *     ~ $schema: { name, age }
 *    ~ @foo: 123
 *  `;
 *  const obj = ioObject.with(defs)`Alice, 30`;
 * @param {Definitions | Schema | string | null} defs - External definitions (variables, schema).
 * @param {Error[]} [errorCollector] - Optional array to collect validation errors.
 * @return {function(TemplateStringsArray, ...any[]): any} A tag function for parsing with definitions.
 */
ioObject.with = (defs: Definitions | Schema | string | null, errorCollector?: Error[]): (strings: TemplateStringsArray, ...args: any[]) => InternetObject | null => {
  return (strings: TemplateStringsArray, ...args: any[]) => {
    const input = buildTemplateSource(strings, args);

    // §2.5: `.with` must return what the tag returns. Measured 2026-08-30, it did not --
    // `` ioObject`name: Alice` `` gave an `IOObject` and `` ioObject.with(defs)`name: Alice` ``
    // gave a plain object, because this branch called `.toJSON()`. Same tag, two types, decided by
    // whether definitions happened to be involved.
    const section = parse(input, defs, errorCollector).sections?.getAt(0)?.data ?? null;
    return section instanceof InternetObject ? section : null;
  }
}

/**
 * Parses a string (template literal) as Internet Object definitions (variables, schema, etc.).
 *
 * @example
 *   const defs = ioDefinitions`
 *     ~ $schema: { name, age }
 *     ~ @foo: 123
 *   `;
 *
 * @param {TemplateStringsArray} strings - Template string segments.
 * @param {...any} args - Interpolated values.
 * @returns {Definitions|null} Parsed Definitions instance, or null if invalid.
 */
export function ioDefinitions(strings: TemplateStringsArray, ...args: any[]): Definitions | null {
  const input = buildTemplateSource(strings, args);

  return parseDefinitions(input, null);
}

/**
 * Parses an inline schema (template literal) and returns a Schema instance.
 *
 * @example
 *   const schema = ioSchema`{ name: string, age: int }`;
 *
 * @param {TemplateStringsArray} strings - Template string segments.
 * @param {...any} args - Interpolated values.
 * @returns {Schema} Parsed Schema instance.
 */
export function ioSchema(strings: TemplateStringsArray, ...args: any[]): Schema {
  const input = buildTemplateSource(strings, args);

  return parseSchema(input, null);
}

/**
 * Parses a schema with external/parent definitions to allow $schema references.
 *
 * @example
 *   const defs = ioDefinitions`~ $Address: { street: string }`;
 *   const schema = ioSchema.with(defs)`{ addresses: [$Address] }`;
 */
/**
 * ⚠ **No sink here, deliberately.** The other three tags take `(defs, sink)` since §2.5, and this
 * one takes definitions alone. Schema compilation fails fast — the first error is fatal, there is
 * no partial schema to hand back — so a sink would have to either report and throw anyway, or
 * report and return nothing. Both are worse than the throw, and an argument that cannot change the
 * outcome is the "public option that lies" this exercise deleted `ParserOptions` for.
 */
ioSchema.with = (parentDefs: Definitions | null): (strings: TemplateStringsArray, ...args: any[]) => Schema => {
  return (strings: TemplateStringsArray, ...args: any[]) => {
    const input = buildTemplateSource(strings, args);

    return parseSchema(input, parentDefs);
  }
}

/**
 * Parses definitions with external/parent definitions to extend or merge.
 *
 * @example
 *   const baseDefs = ioDefinitions`~ $base: { id: int }`;
 *   const extendedDefs = ioDefinitions.with(baseDefs)`
 *     ~ $user: { $base, name: string }
 *   `;
 *
 * @param {Definitions | null} parentDefs - Parent definitions to extend.
 * @param {Error[]} [errorCollector] - Optional sink, in the same slot as every other `.with` (§2.5).
 * @returns {function(TemplateStringsArray, ...any[]): Definitions | null} A tag function for parsing with parent definitions.
 */
ioDefinitions.with = (parentDefs: Definitions | null, errorCollector?: Error[]): (strings: TemplateStringsArray, ...args: any[]) => Definitions | null => {
  return (strings: TemplateStringsArray, ...args: any[]) => {
    const input = buildTemplateSource(strings, args);

    return parseDefinitions(input, parentDefs, errorCollector as Error[]);
  }
}

/**
 * ## Internet Object Facade
 *
 * Unified API for all core Internet Object functionality.
 *
 * ### Aliases:
 * - `doc` ➔ `ioDocument`
 * - `defs` ➔ `ioDefinitions`
 * - `object` ➔ `ioObject`
 * - Full names also available: `document`, `definitions`
 *
 * @example
 *   import io from 'internet-object';
 *   const doc = io.doc`name, age --- ~ Alice, 30`;
 *   const defs = io.defs`$schema: { name, age }`;
 *
 * @property {typeof ioDocument} doc      - Alias for ioDocument (preferred usage)
 * @property {typeof ioObject} object     - Alias for ioObject (preferred usage)
 * @property {typeof ioDefinitions} defs  - Alias for ioDefinitions (preferred usage)
 * @property {typeof ioDocument} document - Full name for ioDocument
 * @property {typeof ioDefinitions} definitions - Full name for ioDefinitions
 */
const io = {
  // Short, ergonomic aliases
  doc: ioDocument,
  object: ioObject,
  defs: ioDefinitions,
  schema: ioSchema,

  // Full names for discoverability
  document: ioDocument,
  definitions: ioDefinitions,
};

export default io;
