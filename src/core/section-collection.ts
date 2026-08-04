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
   * Makes the IOSectionCollection iterable, yielding key-value pairs.
   */
  *[Symbol.iterator]() {
    for (const section of this._sections) {
      yield section;
    }
  }
}

export default IOSectionCollection;
