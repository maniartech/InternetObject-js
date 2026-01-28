import IOCollection from "./collection";
import IOObject from "./internet-object";

/**
 * IOSection represents a single data section within an Internet Object document.
 *
 * Each section can:
 * - Have an optional name for multi-section documents
 * - Reference a schema definition by name
 * - Contain either a single IOObject or an IOCollection of items
 * - Track parsing/validation errors specific to the section's data
 *
 * @template T The type of data items stored in the section
 *
 * @example
 * ```typescript
 * // Named section with schema reference
 * // --- users: $person
 * const section = new IOSection(userCollection, 'users', '$person');
 *
 * console.log(section.name);       // 'users'
 * console.log(section.schemaName); // '$person'
 * console.log(section.data);       // IOCollection of user objects
 * ```
 */
class IOSection<T = any> {
  private _data: IOCollection<T> | IOObject<T> | null;
  private _name?: string;
  private _schemaName?: string;

  constructor(data: any, name?: string, _schemaName?: string) {
    this._data = data;
    this._name = name;
    this._schemaName = _schemaName;
  }

  public get name(): string | undefined {
    return this._name;
  }

  public get schemaName(): string | undefined {
    return this._schemaName;
  }

  public get data(): IOCollection<T> | IOObject<T> | null {
    return this._data;
  }

  public get errors(): Error[] {
    const errors: Error[] = [];

    if (this._data instanceof IOCollection) {
      // Add collection's own errors
      errors.push(...this._data.errors);
      // Also aggregate errors from child IOObjects within the collection
      for (const item of this._data) {
        if (item instanceof IOObject && item.errors.length > 0) {
          errors.push(...item.errors);
        }
      }
    } else if (this._data instanceof IOObject) {
      errors.push(...this._data.errors);
    }

    return errors;
  }

  /**
   * Return a clean object for nodejs console logging.
   */
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return {
      name: this._name,
      schema: this._schemaName,
      data: this._data
    }
  }

  /**
   * Converts the section data to a plain JavaScript object.
   * Delegates to the underlying data's `toObject` method if available.
   *
   * @param options - Conversion options.
   * @param options.skipErrors - If true, excludes error objects from collection output.
   * @returns The plain object representation of the section data.
   */
  public toObject(options?: { skipErrors?: boolean }): any {
    // IOObject
    if (this._data instanceof IOObject) {
      return this._data.toObject();
    }
    // IOCollection
    else if (this._data instanceof IOCollection) {
      return this._data.toObject(options);
    }
    // Plain object
    else if (this._data && typeof this._data === 'object') {
      return this._data;
    }
    return null;
  }

  /**
   * Alias for `toObject()`.
   * Provides compatibility with `JSON.stringify()`.
   */
  public toJSON(options?: { skipErrors?: boolean }): any {
    return this.toObject(options);
  }
}

export default IOSection;