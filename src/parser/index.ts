import Definitions from '../core/definitions';
import Document from '../core/document';
import Header from '../core/header';
import Section from '../core/section';
import SectionCollection from '../core/section-collection';
import assertNever from '../errors/asserts/asserts';
import InternetObjectError from '../errors/io-error';
import ErrorCodes from '../errors/io-error-codes';
import compileObject from '../schema/compile-object';
import processSchema from '../schema/processor';
import Schema from '../schema/schema';
import Tokenizer from './tokenizer';
import TokenType from './tokenizer/token-types';
import ASTParser from './ast-parser';
import CollectionNode from './nodes/collections';
import DocumentNode from './nodes/document';
import MemberNode from './nodes/members';
import ObjectNode from './nodes/objects';
import TokenNode from './nodes/tokens';
import ParserOptions from './parser-options';
import Node from './nodes/nodes';
import ErrorNode from './nodes/error';


/**
 * Parses an Internet Object document string into a Document instance.
 *
 * @param source - The IO document string to parse.
 * @param defs - Optional definitions to use for resolving schemas and variables.
 * @param errorCollector - Optional array to collect errors instead of throwing (for some error types).
 * @param options - Parser options configuration.
 * @returns The parsed IODocument.
 *
 * @example
 * ```typescript
 * // Simple parse
 * const doc = parse('Alice, 20');
 *
 * // Parse with definitions
 * const defs = parseDefinitions('~ $schema: { name: string, age: int }');
 * const doc = parse('Alice, 20', defs);
 * ```
 */
export default function parse(source: string, options?: ParserOptions): Document;
export default function parse(source: string, defs?: Definitions | null, options?: ParserOptions): Document;
export default function parse(source: string, defs?: Definitions | Schema | string | null, errorCollector?: Error[], options?: ParserOptions): Document;
export default function parse(
  source: string,
  defs?: Definitions | Schema | string | null | ParserOptions,
  errorCollector?: Error[] | ParserOptions,
  options?: ParserOptions
): Document {
  let externalDefs: Definitions | null = null;
  let schema: Schema | string | null = null;
  let o: ParserOptions = options || new ParserOptions();

  // Argument shifting for backward compatibility
  // If 2nd arg is ParserOptions (legacy call: parse(source, options))
  if (defs && !(defs instanceof Definitions) && typeof defs === 'object' && 'continueOnError' in defs) {
    o = defs as ParserOptions;
    externalDefs = null;
  }
  // If 2nd arg is Definitions (legacy call: parse(source, defs, options))
  else if (defs instanceof Definitions) {
    externalDefs = defs;
    // If 3rd arg is ParserOptions
    if (errorCollector && !Array.isArray(errorCollector) && typeof errorCollector === 'object') {
      o = errorCollector as ParserOptions;
      errorCollector = undefined;
    }
  }
  // If 2nd arg is Schema or string (new call: parse(source, schema, ...))
  else if (defs instanceof Schema || typeof defs === 'string') {
    schema = defs;
  }

  // If 3rd arg is ParserOptions (legacy call: parse(source, defs, options))
  if (errorCollector && !Array.isArray(errorCollector) && typeof errorCollector === 'object') {
    o = errorCollector as ParserOptions;
    errorCollector = undefined;
  }

  // Tokenize the source
  const tokenizer = new Tokenizer(source);
  const tokens = tokenizer.tokenize();

  // If the source is empty, then return empty document
  if (tokens.length === 0) {
    return new Document(new Header(), new SectionCollection());
  }

  // Parse the tokens into AST - optimize for simple cases
  const parser = new ASTParser(tokens);
  const docNode = parser.parse();

  // Extract errors from docNode for transfer to Document
  const errors = docNode.getErrors();

  // Create document with optimized initialization
  const doc = new Document(new Header(), new SectionCollection(), errors);

  // If the docNode contains header, then parse it
  if (docNode.header) {
    if (docNode.header.child) {
      // If ObjectNode, it is a default schema
      //
      // name, age, address  # <-- This is a schema
      // ---
      if (docNode.header.child instanceof ObjectNode) {
        const schema = compileObject("schema", docNode.header.child)
        if (schema instanceof Schema) {
          doc.header.definitions?.push("$schema", schema, true)
          doc.header.schema = schema  // Set as the default schema
        } else {
          assertNever(schema);
        }
      }

      // If CollectionNode, it's always definitions (may include $schema, @variables, or regular key-values)
      // Example: ~ $schema: {...}, ~ @x: 10, ~ success: T
      else if (docNode.header.child instanceof CollectionNode) {
        parseDefs(doc, docNode.header.child);
      }

      // Unexpected node
      else { assertNever(docNode.header.child) }

      if (externalDefs) {
        doc.header.definitions.merge(externalDefs, false);
      }
    } else {
      if (externalDefs) {
        doc.header.definitions.merge(externalDefs, false);
      }
    }

    parseDataWithSchema(docNode, doc, errorCollector);
  } else {
    if (externalDefs) {
      doc.header.definitions.merge(externalDefs, false);
    }
    // If explicit schema provided, use it as default schema
    if (schema) {
      if (schema instanceof Schema) {
        doc.header.schema = schema;
      } else if (typeof schema === 'string') {
        // If schema is string, it might be a reference in definitions or IO text
        // Since we are in parse, we can't easily compile IO text without recursion or duplication
        // But if it's a reference, we can look it up
        if (doc.header.definitions) {
          const resolved = doc.header.definitions.getV(schema);
          if (resolved instanceof Schema) {
            doc.header.schema = resolved;
          }
        }
      }
    }
    parseDataWithSchema(docNode, doc, errorCollector);
  }
  return doc;
}

function parseData(docNode: DocumentNode, doc: Document) {
  for (let i = 0; i < docNode.children.length; i++) {
    const sectionNode = docNode.children[i];
    doc.sections?.push(new Section(sectionNode.child?.toValue(doc.header.definitions || undefined), sectionNode.name));
  }
}

function parseDataWithSchema(docNode: DocumentNode, doc: Document, errorCollector?: Error[]): void {
  const sectionsLen = docNode.children.length;

  // Early return if no sections
  if (sectionsLen === 0) {
    return;
  }

  for (let i = 0; i < sectionsLen; i++) {
    const sectionNode = docNode.children[i];
    const schemaName = sectionNode.schemaName;

    // If no explicit schema name, fall back to document's default schema
    const schema = schemaName
      ? (schemaName === "$schema" ? doc.header.schema : doc.header.definitions?.getV(sectionNode.schemaNode))
      : doc.header.schema;

    if (!schema) {
      // No schema for this section, just parse without validation
      doc.sections?.push(new Section(sectionNode.child?.toValue(doc.header.definitions || undefined), sectionNode.name));
      continue;
    }

    const result = processSchema(sectionNode.child, schema, doc.header.definitions || undefined, errorCollector);
    doc.sections?.push(new Section(result, sectionNode.name, schemaName));
  }
}

function parseDefs(doc: Document, cols: CollectionNode): void {
  const defs = doc.header.definitions;
  if (!defs) {
    throw new Error("Document header definitions not initialized. This is an internal error - please report this issue.");
  }
  const schemaDefs: Array<{ key: string; schemaDef: Node }> = []

  for (let i = 0; i < cols.children.length; i++) {
    const child = cols.children[i];

    // If child is null or undefined then skip
    if (!child) {
      continue;
    }

    if (child instanceof ErrorNode) {
      throw new InternetObjectError(ErrorCodes.invalidDefinition,
        `Invalid definition: ${child.error.message}`,
        child);
    }

    // Must be an object node
    if (!(child instanceof ObjectNode)) {
      assertNever("Invalid definition, must be object");
    }

    // Type assertion after instance check - TypeScript now knows child is ObjectNode
    const objectNode = child as ObjectNode;

    // Must not be null
    if (objectNode.children[0] === null) {
      assertNever("Invalid definition");
    }

    // Must have only one child
    if (objectNode.children.length !== 1) {
      // throw new InternetObjectError(ErrorCodes.invalidDefinition, objectNode.children?.[1], objectNode.children?[1])
    }

    const memberNode = (objectNode.children[0] as MemberNode)

    // Must have a key
    if (!memberNode.key) {
      throw new InternetObjectError(ErrorCodes.invalidDefinition,
        `Invalid definition: missing key. Each definition must have a key (e.g., '$schema: {...}' or '@variable: value').`,
        memberNode.value)
    }

    const keyToken = memberNode.key as TokenNode

    // Key must be a string
    if (keyToken.type !== TokenType.STRING) {
      throw new Error("Invalid typedef definition: key must be a string.");
    }

    let key: string = keyToken.value as string

    // If key starts with $, then it is a schema. Dont compile it now,
    // just keep it as it is. After all the definitions are parsed, compile
    // the variable schemas.
    if (key.startsWith('$')) {
      defs.push(key, memberNode.value, true);
      schemaDefs.push({ key, schemaDef: memberNode.value });
      continue;
    }

    // If key starts with @, then it is a variable. Keep it as it is
    if (key.startsWith('@')) {
      defs.push(key, memberNode.value, false, true);
      continue;
    }

    let value: Node = (objectNode.children[0] as MemberNode).value;
    defs.push(key, value.toValue(doc.header.definitions || undefined));
  }

  // Compile the schema definitions
  for (let i = 0; i < schemaDefs.length; i++) {
    const { key, schemaDef } = schemaDefs[i];
    const def = compileObject(key, schemaDef, defs);

    defs.set(key, def);
  }
}