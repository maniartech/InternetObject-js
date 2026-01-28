import Schema from "../schema/schema";
import IODefinitions from './definitions';

/**
 * IOHeader contains the header section of an Internet Object document.
 *
 * The header stores:
 * - Schema definitions (prefixed with $)
 * - Variables (prefixed with @)
 * - Regular key-value metadata
 * - The default schema for the document's data sections
 *
 * Features:
 * - Schema resolution and merging from multiple sources
 * - Definition inheritance via merge() for document composition
 * - JSON serialization of non-schema, non-variable definitions
 *
 * @example
 * ```typescript
 * // Header from:
 * // ~ @yes: T
 * // ~ $person: {name: string, age: int}
 * // ~ $schema: {items: [$person]}
 *
 * const header = new IOHeader();
 * header.definitions.set('@yes', true);
 * header.definitions.set('$person', personSchema);
 * header.schema = itemsSchema;
 * ```
 */
class IOHeader {
  private _schema: Schema | null = null;
  private _definitions: IODefinitions;

  constructor() {
    this._definitions = new IODefinitions();
  }

  /**
   * Gets the active schema for the document.
   * If a specific schema is set, it is returned.
   * Otherwise, returns the default schema ($schema) from definitions.
   */
  get schema(): Schema | null {
    return this._schema || this._definitions.defaultSchema;
  }

  /**
   * Explicitly sets the schema for the document.
   * This overrides the default schema found in definitions.
   * @param value - The Schema instance to set.
   */
  set schema(value: Schema | null) {
    this._schema = value;
  }

  /**
   * Gets the Definitions object managed by this header.
   */
  get definitions(): IODefinitions {
    return this._definitions;
  }

  /**
   * Merges another IOHeader into this one.
   *
   * @param other - The other IOHeader to merge from.
   * @param override - If true, definitions and schema from 'other' overwrite existing ones.
   */
  merge(other: IOHeader, override: boolean = false) {
    if (override && other.schema) {
      this._schema = other.schema;
    }
    if (other.definitions) {
      this._definitions.merge(other.definitions, override);
    }
  }

  /**
   * Converts the header definitions to a plain JavaScript object.
   * Note: Variables (@) and schemas ($) are conceptually metadata/definitions
   * and are typically included in the output object structure.
   *
   * @returns A plain JavaScript object representing the header definitions.
   */
  toObject() {
    return this._definitions.toObject();
  }

  /**
   * Alias for `toObject()`.
   * Provides compatibility with `JSON.stringify()`.
   */
  toJSON() {
    return this.toObject();
  }
}

export default IOHeader;
