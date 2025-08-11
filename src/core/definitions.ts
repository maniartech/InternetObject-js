import ErrorCodes       from '../errors/io-error-codes';
import ValidationError  from '../errors/io-validation-error';
import TokenNode        from '../parser/nodes/tokens';
import TokenType        from '../parser/tokenizer/token-types';
import Schema           from '../schema/schema';

type IODefinitionValue = {
  isSchema: boolean,
  isVariable: boolean,
  value: any
};

/**
 * IODefinitions manages definitions (schemas, variables, and regular definitions) for Internet Object.
 *
 * Definitions are accessed by key, but the order in which they are defined is important:
 * - Variables and schema references defined earlier can be used in later definitions, but not vice versa.
 * - This follows the Internet Object specification (see 'the-definitions').
 *
 * The class provides key-based access, mutation, and iteration facilities, while ensuring definition order is respected for reference resolution.
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
   * @returns The default Schema instance or null.
   */
  public get defaultSchema(): Schema | null {
    return this._defaultSchema || this._definitions["$schema"]?.value || null;
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

    if ((k || {}).type === TokenType.STRING) {
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
