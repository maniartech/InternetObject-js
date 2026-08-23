import { toJSONValue } from '../utils/json-projection';
import IOSection from "./section";

/**
 * IOSectionCollection manages multiple IOSection instances within a document.
 *
 * Features:
 * - Method-based access via `get(nameOrIndex)` — by index (`get(0)`) or name (`get('users')`) (R7)
 * - Iterable for iterating over all sections
 *
 * @template T The type of data items in the sections
 *
 * @example
 * ```typescript
 * const sections = new IOSectionCollection();
 * sections.push(new IOSection(users, 'users'));
 * sections.push(new IOSection(products, 'products'));
 *
 * // Access by name
 * const usersSection = sections.get('users');
 *
 * // Access by index
 * const firstSection = sections.get(0);
 *
 * // Iteration
 * for (const section of sections) {
 *   console.log(section.name);
 * }
 * ```
 */
class IOSectionCollection<T = any> {
  private _sections: Array<IOSection<T>> = [];
  private _sectionNames: { [key: string]: number } = {};

  public get sections(): Array<IOSection<T>> {
    return this._sections;
  }

  public get length(): number {
    return this._sections.length;
  }

  public get(nameOrIndex: string | number): IOSection<T> | undefined {
    if (typeof nameOrIndex === 'string') {
      const index = this._sectionNames[nameOrIndex];
      if (index === undefined) {
        return undefined;
      }
      return this._sections[index];
    }
    return this._sections[nameOrIndex];
  }

  /**
   * Return a clean object for nodejs console logging.
   */
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return this._sections;
  }

  public push(section: IOSection<T>) {
    if (section.name !== undefined) {
      this._sectionNames[section.name] = this._sections.length;
    }
    this._sections.push(section);
  }

  /**
   * Converts the sections to a plain JavaScript value, with values LIVE.
   *
   * Mirrors how a Document composes its sections: a lone section IS the data, and several sections
   * become an object keyed by section name — so `sections.toObject()` and `doc.toObject()` agree
   * on shape rather than each having its own idea.
   *
   * @param options.skipErrors If true, excludes error objects from collection output.
   */
  public toObject(options?: { skipErrors?: boolean }): any {
    if (this._sections.length === 0) return null;
    if (this._sections.length === 1) return this._sections[0].toObject(options);

    const data: Record<string, any> = {};
    this._sections.forEach((section, i) => {
      data[(section.name as string) ?? String(i)] = section.toObject(options);
    });
    return data;
  }

  /**
   * Converts to JSON — the same data as {@link toObject}, with every value spelled the way JSON
   * can carry it (dates as ISO strings, decimals and bigints as strings, binary as base64), all
   * the way down. See `toJSONValue`.
   */
  public toJSON(options?: { skipErrors?: boolean }): any {
    return toJSONValue(this.toObject(options));
  }

  /**
   * Makes the IOSectionCollection iterable, yielding key-value pairs.
   */
  *[Symbol.iterator]() {
    for (const section of this._sections) {
      yield section;
    }
  }
}

export default IOSectionCollection;
