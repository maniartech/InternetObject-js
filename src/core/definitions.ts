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
   * Gets a definition value by key, regardless of whether it's a variable, schema, or regular definition.
   * @param key The definition key
   * @returns The value associated with the key, or undefined if not found
   */
  public get(key: string): any {
    return this._definitions[key]?.value;
  }

  /**
   * Gets the variable value. This function is intended to be used internally
   * for quickly fetching the variable value, hence it accepts any key to keep the
   * consumer code free from type checking. The function validates the key and
   * returns the associated value, if available. Otherwise returns undefined.
   * @param key {any} The variable key starting with $
   * @returns The value associated with the variable
   */
  public getV(k: any): any {
    let key: string = "";

    // Check if k is a TokenNode (can have lowercase 'string' or uppercase 'STRING' type)
    if ((k || {}).type === TokenType.STRING || (k || {}).type === 'string') {
      key = k.value;
    } else if (typeof k === 'string') {
      key = k;
    } else {
      return;
    }

    const def = this._definitions[key];
    if (!def) {
      // Only throw errors for variables and schemas
      if (key.startsWith("$") || key.startsWith("@")) {
        const positionParam = (typeof k === 'string') ? undefined : k;
        if (key.startsWith("$")) {
          throw new ValidationError(ErrorCodes.schemaNotDefined, `Schema ${key} is not defined.`, positionParam);
        }
        throw new ValidationError(ErrorCodes.variableNotDefined, `Variable ${key} is not defined.`, positionParam);
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

  public toJSON() {
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
