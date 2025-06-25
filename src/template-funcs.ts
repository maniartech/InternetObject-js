import Definitions      from './core/definitions';
import Document         from './core/document';
import InternetObject from './core/internet-object';
import ASTParser from './parser/ast-parser';
import parse            from './parser/index';
import parseDefinitions from './parser/parse-defs';
import Tokenizer from './parser/tokenizer';

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
  const input = strings.reduce((acc, str, i) => {
    return acc + str + (args[i] === undefined ? '' : args[i]);
  }, '');

  return parse(input, null);
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
 * @param {Definitions} defs - External definitions (variables, schema).
 * @returns {function(TemplateStringsArray, ...any[]): Document} A tag function for parsing with definitions.
 */
ioDocument.with = (defs: Definitions): (strings: TemplateStringsArray, ...args: any[]) => Document => {
  return (strings: TemplateStringsArray, ...args: any[]) => {
    const input = strings.reduce((acc, str, i) => {
      return acc + str + (args[i] === undefined ? '' : args[i]);
    }, '');

    return parse(input, defs);
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
  const input = strings.reduce((acc, str, i) => {
    return acc + str + (args[i] === undefined ? '' : args[i]);
  }, '');

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
 * @param {Definitions} defs - External definitions (variables, schema).
 * @return {function(TemplateStringsArray, ...any[]): any} A tag function for parsing with definitions.
 */
ioObject.with = (defs: Definitions): (strings: TemplateStringsArray, ...args: any[]) => InternetObject | null => {
  return (strings: TemplateStringsArray, ...args: any[]) => {
    const input = strings.reduce((acc, str, i) => {
      return acc + str + (args[i] === undefined ? '' : args[i]);
    }, '');

    return parse(input, defs).toJSON();
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
  const input = strings.reduce((acc, str, i) => {
    return acc + str + (args[i] === undefined ? '' : args[i]);
  }, '');

  return parseDefinitions(input, null);
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

  // Full names for discoverability
  document: ioDocument,
  definitions: ioDefinitions,
};

export default io;
