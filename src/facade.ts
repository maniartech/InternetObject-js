import IOCollection           from './core/collection';
import Decimal                from './core/decimal/decimal';
import IODefinitions          from './core/definitions';
import IODocument             from './core/document';
import IOObject               from './core/internet-object';
import IOSection              from './core/section';
import IOSectionCollection    from './core/section-collection';
import IOHeader               from './core/header';
import IOError                from './errors/io-error';
import ErrorCodes             from './errors/io-error-codes';
import IOSyntaxError          from './errors/io-syntax-error';
import IOValidationError      from './errors/io-validation-error';
import Schema                 from './schema/schema';
import { ioDefinitions, ioDocument, ioObject, ioParse, ioSchema } from './template-funcs';
import { parse, parseDocument } from './facade/parse';
import parseDefinitions       from './parser/parse-defs';
import parseSchema            from './schema/parse-schema';
import { load, loadObject }   from './facade/load';
import { stringify }          from './facade/stringify';
import { createStreamWriter, createStreamReader } from './streaming';
import { toObject, toJSON } from './facade/to-object';
import { validate, validateCollection, validateObject } from './facade/validate';
import registerTypes from './schema/types';
import { header, isError, node, section, sections } from './facade/accessors';
import { subscribe, version } from './facade/notify';

registerTypes();


/**
 * `io` is itself a tag, and calling it parses to **plain JavaScript** — the same thing `io.parse`
 * does with a string. `io.doc` is the document form, exactly as `parseDocument` is to `parse`.
 *
 * ```ts
 * io`name: string, age: int
 * ---
 * Alice, 30`                    // { name: 'Alice', age: 30 }
 * ```
 *
 * The wrapper exists so the members below are attached here rather than mutated onto the exported
 * `ioParse`, which would otherwise carry all forty of them for anyone importing it by name.
 */
export interface IOTag {
  /** `` io`name: Alice, age: 30` `` — parses to plain JavaScript. */
  (strings: TemplateStringsArray, ...args: any[]): any;
  /** `io.with(defs, sink)` — the same two slots every other tag's `.with` takes (§2.5). */
  with: typeof ioParse.with;
}

/**
 * Named and exported because a declaration build has to be able to *write down* the type of what
 * this module exports. Left as a bare local function, `io` inferred as `typeof ioTag & {...}` and
 * `tsup` failed with TS4023 — "has or is using name 'ioTag' ... but cannot be named".
 */
const ioTag: IOTag = Object.assign(
  (strings: TemplateStringsArray, ...args: any[]) => ioParse(strings, ...args),
  { with: ioParse.with }
);

// Short aliases
const io = Object.assign(ioTag, {
  // Facade methods
  parse,
  parseDocument,
  parseDefs: parseDefinitions,      // Short alias
  parseDefinitions,                 // Full name
  parseSchema,
  load,
  loadObject,
  stringify,
  toObject,
  toJSON,
  validate,
  validateObject,
  validateCollection,

  // The functional forms (A4). Property access is ergonomic and therefore shadowable; these are
  // the reads that a section called `length` or a member called `get` cannot displace.
  section,
  sections,
  header,
  isError,
  node,

  // Notification (§8). One pair satisfies React, Svelte, Vue and Solid, which is why there is no
  // framework package.
  subscribe,
  version,

  // Streaming
  createStreamReader,
  createStreamWriter,

  // Short aliases for template functions
  doc:    ioDocument,
  object: ioObject,
  defs:   ioDefinitions,
  schema: ioSchema,

  // Full names for template functions
  document: ioDocument,
  definitions: ioDefinitions,

  // Core types (power users)
  IODocument,
  IODefinitions,
  IOSectionCollection,
  IOSection,
  IOCollection,
  IOObject,
  IOHeader,
  IOSchema: Schema,
  Decimal,
  IOError,
  ErrorCodes,
  IOSyntaxError,
  IOValidationError,
});


export {
  ioDefinitions, ioDocument,
  ioObject,
  ioParse,
  ioSchema
};

export default io;
