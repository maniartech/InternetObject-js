import { toJSONValue } from '../utils/json-projection';
import ErrorCodes       from '../errors/io-error-codes';
import ValidationError  from '../errors/io-validation-error';
import TokenNode        from '../parser/nodes/tokens';
import TokenType        from '../parser/tokenizer/token-types';
import Schema           from '../schema/schema';

/**
 * Represents a stored definition value with metadata.
 */
type IODefinitionValue = {
  /** True if this is a schema definition (key starts with $) */
  isSchema: boolean;
  /** True if this is a variable definition (key starts with @) */
  isVariable: boolean;
  /** The actual definition value */
  value: any;
};

/**
 * IODefinitions manages schema definitions, variables, and metadata for Internet Object documents.
 *
 * Key Types:
 * - Schema definitions: Keys starting with `$` (e.g., `$person`, `$schema`)
 * - Variables: Keys starting with `@` (e.g., `@yes`, `@baseUrl`)
 * - Metadata: Regular keys (e.g., `version`, `page`)
 *
 * Features:
 * - Preserves insertion order (definitions can reference earlier definitions)
 * - O(1) key-based access
 * - Forward reference validation (throws for undefined variables/schemas)
 * - Merge support for document composition
 * - Iterable for processing all definitions
 *
 * Definition Order Rules (per Internet Object spec):
 * - Variables and schemas defined earlier can be used in later definitions
 * - Forward references (using definitions not yet defined) throw errors
 *
 * @example
 * ```typescript
 * const defs = new IODefinitions();
 * defs.set('@baseUrl', 'https://api.example.com');
 * defs.set('$person', personSchema);
 * defs.set('$schema', mainSchema);
 *
 * // Variables are accessed via getV()
 * const url = defs.getV('@baseUrl'); // 'https://api.example.com'
 *
 * // Schemas are accessed via get()
 * const schema = defs.get('$person'); // Schema instance
 * ```
 */
class IODefinitions {
  /**
   * The default schema, if defined. Reset when $schema is deleted or updated.
   */
  private _defaultSchema: Schema | null = null;

  /**
   * Internal storage for definitions. Order is preserved as per insertion sequence.
   */
  private _definitions: { [key: string]: IODefinitionValue } = {};

  /**
   * Returns the number of definitions in the collection.
   * @returns Number of definitions.
   */
  public get length(): number {
    return Object.keys(this._definitions).length;
  }

  /**
   * Returns an array of definition keys, in insertion order.
   * @returns Array of keys.
   */
  public get keys(): string[] {
    return Object.keys(this._definitions);
  }

  /**
   * Returns the key-value pair at the specified index, preserving definition order.
   * @param index Index of the definition.
   * @returns Object with key and value.
   */
  public at(index: number): { key: string, value: IODefinitionValue } {
    const key = this.keys[index];
    return { key, value: this._definitions[key] };
  }

  /**
   * Returns the definition VALUE at a position.
   *
   * A7 (ADR 0005): positional access is spelled `getAt` on every other container. `at(index)` is
   * kept, and is a different thing -- it returns the `{ key, value }` PAIR, so it is not simply a
   * misnamed `getAt`.
   *
   * @param index Zero-based position, in definition order.
   * @returns The value, or undefined if the index is out of range.
   */
  public getAt(index: number): any {
    const key = this.keys[index];
    return key === undefined ? undefined : this.get(key);
  }

  /**
   * Returns the default schema, if defined.
   * Resolves schema variable references (e.g., $schema: $otherSchema).
   * @returns The default Schema instance or null.
   */
  public get defaultSchema(): Schema | null {
    if (this._defaultSchema) {
      return this._defaultSchema;
    }

    // Use getV to resolve any nested references (e.g., $schema: $otherSchema)
    const schemaValue = this._definitions["$schema"]?.value;
    if (!schemaValue) {
      return null;
    }

    // If it's already a Schema, return it
    if (schemaValue instanceof Schema) {
      return schemaValue;
    }

    // If it's a TokenNode reference, resolve it
    if (schemaValue instanceof TokenNode) {
      try {
        const resolved = this.getV(schemaValue);
        if (resolved instanceof Schema) {
          // Cache the resolved schema
          this._definitions["$schema"].value = resolved;
          return resolved;
        }
      } catch (e) {
        // If resolution fails, return null
        return null;
      }
    }

    return null;
  }

  /**
   * Checks if there are any definitions beyond just the default $schema.
   * Used to determine serialization format:
   * - false: Output bare schema line (schema-only mode)
   * - true: Output ~ definitions format (has variables, metadata, or multiple schemas)
   * @returns True if there are any definitions other than a single $schema, false otherwise
   */
  public get defaultSchemaOnly(): boolean {
    const keys = Object.keys(this._definitions);

    return keys.length === 1 && keys[0] === "$schema"
  }

  /**
   * Gets a definition's **value** by key — a variable decoded, a schema as the `Schema` it is.
   *
   * A7 (ADR 0005) completed: `get` now means on this container what it means on every other one.
   * It used to return the STORED form, so `defs.get('@env')` handed back a `TokenNode` while
   * `rec.get('name')` handed back a string — the same verb with two contracts, distinguishable
   * only by which container you happened to be holding.
   *
   * The three key getters now differ along one axis each, which is the point:
   *
   * ```
   *   get            lenient, decoded   -> the value, or undefined
   *   getValue       strict,  decoded   -> the value, or throws
   *   getTokenNode   strict,  stored    -> the TokenNode / Schema, or throws   (getV)
   * ```
   *
   * Lenient is what separates this from `getValue`: a missing `$name` or `@name` is `undefined`
   * here and a thrown `undefined-schema` / `undefined-variable` there. Library code that needs the
   * node — the schema type-checkers read `.type` off it to decide what a variable holds — takes
   * `getTokenNode`.
   *
   * @param key The definition key.
   * @returns The value, or `undefined` when the key names no definition.
   */
  public get(key: string): any {
    const name = this.keyOf(key);
    if (name === "" || !this._definitions[name]) return undefined;
    return this.getValue(name);
  }

  /**
   * Gets the variable value. This function is intended to be used internally
   * for quickly fetching the variable value, hence it accepts any key to keep the
   * consumer code free from type checking. The function validates the key and
   * returns the associated value, if available. Otherwise returns undefined.
   * @param key {any} The variable key starting with $
   * @returns The value associated with the variable
   */
  /**
   * Strict lookup returning the STORED value -- a `TokenNode` for a variable, a `Schema` for a
   * schema reference. Throws `undefined-variable` / `undefined-schema` when the key is absent.
   *
   * A7 (ADR 0005): the readable name for what `getV` has always done. `getV` remains as an alias
   * so the 46 internal call sites and any external caller keep working.
   *
   * @internal Prefer `get` (lenient) or `getValue` (decoded) from outside the library.
   */
  public getTokenNode(k: any): any {
    return this.getV(k);
  }

  public getV(k: any): any {
    const key = this.keyOf(k);
    if (key === "") return;

    const def = this._definitions[key];
    if (!def) {
      // Only throw errors for variables and schemas
      if (key.startsWith("$") || key.startsWith("@")) {
        const positionParam = (typeof k === 'string') ? undefined : k;
        if (key.startsWith("$")) {
          throw new ValidationError(ErrorCodes.undefinedSchema, `Schema ${key} is not defined.`, positionParam);
        }
        throw new ValidationError(ErrorCodes.undefinedVariable, `Variable ${key} is not defined.`, positionParam);
      }
      return undefined;
    }

    if (def.isVariable) {
      return def.value;
    }

    // Check nested references. If yes, then resolve them and set in the
    // place of the variable.
    if (def.value instanceof TokenNode) {
      const schema = this.getV(def.value);
      if (schema instanceof Schema) {
        this.set(key, schema);
        return schema;
      }
    }

    return def.value;
  }

  /**
   * The KEY a lookup argument names, or "" when it names nothing. Shared by `getV` and
   * `getValue` so the two cannot disagree about what a TokenNode refers to.
   */
  private keyOf(k: any): string {
    // A TokenNode can carry lowercase 'string' or uppercase 'STRING' as its type.
    if ((k || {}).type === TokenType.STRING || (k || {}).type === 'string') return k.value;
    if (typeof k === 'string') return k;
    return "";
  }

  /** Variables being resolved right now, so a self-referential definition is reported, not recursed. */
  private readonly _resolvingValues = new Set<string>();

  /**
   * Resolve a reference to its VALUE — the sibling of {@link getV}, which returns the stored
   * NODE.
   *
   * Both are needed, and conflating them is a bug in either direction:
   *
   *   getV       returns the AST node. The schema type-checkers depend on this: they read
   *              `valueNode.type` to decide whether a variable holds a string, a boolean, a
   *              number, and report `expected-string` when it does not.
   *   getValue   returns the decoded value. The document projection depends on THIS.
   *
   * Until 2026-08-22 only `getV` existed, and `TokenNode.toValue` used it — so a variable read
   * without a schema projected the parser's internals into the value model. `~ @red: "#f00"`
   * followed by `color: @red` produced `{ pos, row, col, token, value, type, subType }` instead
   * of `"#f00"`, and an array variable leaked its brackets as nodes. It stayed invisible because
   * every example in the specification declares a schema, and the schema path decodes separately.
   *
   * Decoding also resolves a variable defined in terms of another (`~ @b: @a`), which previously
   * yielded the literal string "@a".
   *
   * @returns the value, or `undefined` when the key names no definition (so a caller can treat
   *   the text as an ordinary string).
   */
  public getValue(k: any): any {
    const key = this.keyOf(k);
    const found = this.getV(k);
    if (found === null || found === undefined) return found;

    // ONLY a variable is decoded here. A `$` reference resolves to a Schema, and a schema is
    // allowed to refer to ITSELF {EM} that is how a recursive type is written, and inference emits
    // one whenever a map's values can contain the map:
    //
    //   ~ $node: {"*": {any, "null": T}, child: {object, schema: {*: $node}, optional: T}}
    //
    // Guarding those as cycles broke every recursive schema, which the round-trip fuzzer caught
    // within one run. A VARIABLE defined in terms of itself has no value and must still be
    // reported, so the guard stays {EM} scoped to `@`.
    if (!key.startsWith('@')) return found;
    if (typeof (found as any).toValue !== 'function') return found;

    if (this._resolvingValues.has(key)) {
      throw new ValidationError(
        ErrorCodes.invalidDefinition,
        `Variable ${key} is defined in terms of itself.`
      );
    }
    this._resolvingValues.add(key);
    try {
      return (found as any).toValue(this);
    } finally {
      this._resolvingValues.delete(key);
    }
  }

  public set(k: string, v: any) {
    const dv = {
      isSchema: k.startsWith("$"),
      isVariable: k.startsWith("@"),
      value: v
    };
    this._definitions[k] = dv;
    this._defaultSchema = null;
  }

  /**
   * Removes a definition by key.
   * @param key The key of the definition to remove
   * @returns True if the key existed and was deleted, false otherwise
   */
  public delete(key: string): boolean {
    if (key in this._definitions) {
      delete this._definitions[key];
      // If the deleted key was $schema, reset _defaultSchema
      if (key === "$schema") {
        this._defaultSchema = null;
      }
      return true;
    }
    return false;
  }

  /**
   * Pushes a new definition to the definitions list.
   * @param key The key of the definition
   * @param value The value of the definition
   */
  public push(key: string, value: any, isSchema: boolean = false, isVariable: boolean = false) {
    this._definitions[key] = { isSchema, isVariable, value };
    if (key === "$schema") {
      this._defaultSchema = value;
    }
  }

  /**
   * Merges the definitions with the other definitions.
   * @param other     The other definitions to merge with
   * @param override  If true, the other definitions will override the current
   *                  definitions
   */
  public merge(other: IODefinitions, override: boolean = false) {
    for (let i = 0; i < other.length; i++) {
      const { key, value } = other.at(i);
      if (override || !this._definitions[key]) {
        this.push(key, value.value, value.isSchema, value.isVariable);
      }
    }
  }

  /**
   * Return a clean object for nodejs console logging.
   */
  [Symbol.for('nodejs.util.inspect.custom')]() {
    const obj: any = {};
    for (const key of this.keys) {
      const def = this._definitions[key];
      obj[key] = def.value;
    }
    return obj;
  }

  public toObject() {
    const obj: any = {};
    let keysCount = 0;
    for (let i = 0; i < this.length; i++) {
      const def = this.at(i);

      // Skip schema and variable definitions
      if (def.value.isSchema || def.value.isVariable) {
        continue;
      }

      keysCount++;
      obj[def.key] = def.value.value?.toObject ? def.value.value.toObject() : def.value.value;
    }

    if (keysCount) {
      return obj;
    }

    return null;
  }

  /**
   * Converts to JSON — the same data as {@link toObject}, with every value spelled the way JSON
   * can carry it (dates as ISO strings, decimals and bigints as strings, binary as base64), all
   * the way down. See `toJSONValue`.
   */
  public toJSON() {
    return toJSONValue(this.toObject());
  }

  /**
   * Returns an iterator of definition keys.
   */
  /**
   * Returns an iterator of definition keys (useful for for...of).
   */
  *keyIterator(): IterableIterator<string> {
    for (const key of Object.keys(this._definitions)) {
      yield key;
    }
  }

  /**
   * Returns an iterator of [key, value] pairs.
   */
  *entries(): IterableIterator<[string, IODefinitionValue]> {
    for (const key of this.keyIterator()) {
      yield [key, this._definitions[key]];
    }
  }

  /**
   * Default iterator for [key, value] pairs.
   */
  *[Symbol.iterator](): IterableIterator<[string, IODefinitionValue]> {
    yield* this.entries();
  }
}

export default IODefinitions;
