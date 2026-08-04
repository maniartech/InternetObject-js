import IOObject from "./internet-object";

/**
 * IOCollection is an ordered collection of items, accessed by method (get via `getAt(i)`).
 *
 * Features:
 * - Array-like operations (push, pop, insert, deleteAt)
 * - Functional methods (map, filter, reduce, forEach, find, some, every)
 * - Iterable support for for..of loops
 * - JSON serialization with error handling options
 * - Method-based index access via `getAt(i)` (no proxy / `collection[0]` — R7)
 *
 * @template T The type of items stored in the collection (defaults to IOObject)
 *
 * @example
 * ```typescript
 * const collection = new IOCollection<Person>();
 * collection.push({ name: 'Alice', age: 30 });
 * collection.push({ name: 'Bob', age: 25 });
 *
 * // Iteration
 * for (const person of collection) {
 *   console.log(person.name);
 * }
 *
 * // Functional operations
 * const names = collection.map(p => p.name);
 * ```
 */
class IOCollection<T = IOObject> {
  private _items: T[];
  public errors: Error[] = [];

  /**
   * Constructs a new IOCollection instance.
   * @param items - An optional array of items to initialize the collection with.
   */
  constructor(items: T[] = []) {
    this._items = items;
  }

  /**
   * Pushes one or more items to the IOCollection
   * @param items - The items to push.
   * @returns The updated IOCollection.
   */
  public push(...items: T[]): IOCollection<T> {
    this._items.push(...items);
    return this;
  }

  /**
   * Gets the item at the specified index.
   * @param index - The index of the item to retrieve.
   * @throws {Error} If the index is out of range.
   * @returns The item at the specified index.
   */
  public getAt(index: number): T {
    if (index < 0 || index >= this._items.length) {
      throw new Error('Index out of range');
    }
    return this._items[index];
  }

  /**
   * Sets the item at the specified index.
   * @param index - The index at which to set the item.
   * @param item - The item to set.
   * @throws {Error} If the index is negative.
   * @returns The updated IOCollection.
   */
  public setAt(index: number, item: T): IOCollection<T> {
    if (index < 0) {
      throw new Error('Index cannot be negative.');
    }
    if (index >= this._items.length) {
      this._items.push(item);
    } else {
      this._items[index] = item;
    }
    return this;
  }

  /**
   * Deletes an item from the IOCollection at the specified index.
   * @param index - The index of the item to delete.
   * @throws {Error} If the index is out of range.
   * @returns The updated IOCollection.
   */
  public deleteAt(index: number): IOCollection<T> {
    if (index < 0 || index >= this._items.length) {
      throw new Error('Index out of range');
    }
    this._items.splice(index, 1);
    return this;
  }

  /**
   * Gets the length of the IOCollection.
   * @returns The number of items in the IOCollection.
   */
  public get length(): number {
    return this._items.length;
  }

  /**
   * Checks if the IOCollection is empty.
   * @returns True if the IOCollection is empty, otherwise false.
   */
  public get isEmpty(): boolean {
    return this.length === 0;
  }

  /**
   * Creates a new IOCollection with the results of calling a provided function on every element.
   * @param callback - Function that produces an element of the new IOCollection.
   * @returns A new IOCollection with each element being the result of the callback function.
   */
  public map<U>(callback: (item: T, index: number, array: T[]) => U): IOCollection<U> {
    const mappedItems = this._items.map(callback);
    return new IOCollection<U>(mappedItems);
  }

  /**
   * Creates a new IOCollection with all elements that pass the test implemented by the provided function.
   * @param callback - Function to test each element of the IOCollection.
   * @returns A new IOCollection with the elements that pass the test.
   */
  public filter(callback: (item: T, index: number, array: T[]) => boolean): IOCollection<T> {
    const filteredItems = this._items.filter(callback);
    return new IOCollection<T>(filteredItems);
  }

  /**
   * Applies a function against an accumulator and each element in the IOCollection to reduce it to a single value.
   * @param callback - Function to execute on each element in the IOCollection.
   * @param initialValue - Initial value to start the reduction.
   * @returns The single value that results from the reduction.
   */
  public reduce<U>(callback: (accumulator: U, item: T, index: number, array: T[]) => U, initialValue: U): U {
    return this._items.reduce(callback, initialValue);
  }

  /**
   * Executes a provided function once for each IOCollection element.
   * @param callback - Function to execute on each element.
   */
  public forEach(callback: (item: T, index: number, array: T[]) => void): void {
    this._items.forEach(callback);
  }

  /**
   * Tests whether at least one element in the IOCollection passes the test implemented by the provided function.
   * @param callback - Function to test each element.
   * @returns True if the callback function returns a truthy value for at least one element, otherwise false.
   */
  public some(callback: (item: T, index: number, array: T[]) => boolean): boolean {
    return this._items.some(callback);
  }

  /**
   * Tests whether all elements in the IOCollection pass the test implemented by the provided function.
   * @param callback - Function to test each element.
   * @returns True if the callback returns a truthy value for all elements, otherwise false.
   */
  public every(callback: (item: T, index: number, array: T[]) => boolean): boolean {
    return this._items.every(callback);
  }

  /**
   * Returns the value of the first element in the IOCollection that satisfies the provided testing function.
   * @param callback - Function to execute on each element.
   * @returns The first element that satisfies the testing function, or undefined if no elements satisfy it.
   */
  public find(callback: (item: T, index: number, array: T[]) => boolean): T | undefined {
    return this._items.find(callback);
  }

  /**
   * Returns the index of the first element in the IOCollection that satisfies the provided testing function.
   * @param callback - Function to execute on each element.
   * @returns The index of the first element that satisfies the testing function, or -1 if no elements satisfy it.
   */
  public findIndex(callback: (item: T, index: number, array: T[]) => boolean): number {
    return this._items.findIndex(callback);
  }

  /**
   * Inserts one or more items into the IOCollection at the specified index.
   * @param index - The index at which to insert the items.
   * @param items - The items to insert.
   * @returns The new length of the IOCollection.
   */
  public insert(index: number, ...items: T[]): number {
    this._items.splice(index, 0, ...items);
    return this._items.length;
  }

  /**
   * Removes the last item from the IOCollection.
   * @returns The removed item, or undefined if the IOCollection is empty.
   */
  public pop(): T | undefined {
    return this._items.pop();
  }

  /**
   * Converts the collection to a plain JavaScript array.
   * Recursively calls `toObject()` on items that support it.
   *
   * @param options Optional configuration for conversion
   * @param options.skipErrors If true, excludes error objects from output (default: false)
   * @returns An array of plain JavaScript values.
   */
  public toObject(options?: { skipErrors?: boolean }): any {
    const skipErrors = options?.skipErrors ?? false;

    return this._items
      .filter((item) => {
        // If skipErrors is true, filter out items with toValue that return __error
        if (skipErrors && typeof item === 'object' && item !== null) {
          if (typeof (item as any).toValue === 'function') {
            const value = (item as any).toValue();
            if (value && value.__error === true) {
              return false; // Skip this error item
            }
          }
        }
        return true; // Keep this item
      })
      .map((item) => {
        if (item instanceof IOObject) {
          return item.toObject();
        } else if (typeof item === 'object' && item !== null) {
          // Check if item has toValue method (e.g., ErrorNode)
          if (typeof (item as any).toValue === 'function') {
            return (item as any).toValue();
          }
           // Check if item has toObject method
          if (typeof (item as any).toObject === 'function') {
            return (item as any).toObject();
          }
          // Check if item has toJSON method
          if (typeof (item as any).toJSON === 'function') {
            return (item as any).toJSON();
          }
          return JSON.stringify(item); // TODO: Should this be parsed back to object or left as string?
        }
        return item;
      });
  }

  /**
   * Alias for `toObject()`.
   * Provides compatibility with `JSON.stringify()`.
   */
  public toJSON(options?: { skipErrors?: boolean }): any {
    return this.toObject(options);
  }

  /**
   * Custom inspector for Node.js `console.log`.
   * Returns the plain object representation for better readability.
   */
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return this.toObject();
  }

  /**
   * Returns the errors for this collection: its own accumulated `errors` PLUS any Error objects held
   * by ErrorNode items. The uniform error-read API shared by every core container (R6).
   *
   * Note: when using `Document.getErrors()`, all errors (parser + validation) are already aggregated
   * at the document level.
   */
  public getErrors(): ReadonlyArray<Error> {
    const errors: Error[] = [...this.errors];   // R6: include the collection's own accumulated errors
    for (const item of this._items) {
      // ErrorNode-like shape: has an `error` property of type Error
      if (item && typeof item === 'object' && (item as any).error instanceof Error) {
        errors.push((item as any).error as Error);
      }
    }
    return errors;
  }

  /**
   * Allows iteration over the IOCollection using for..of syntax.
   * @returns An iterator for the IOCollection.
   */
  *[Symbol.iterator](): IterableIterator<T> {
    yield* this._items;
  }

  /**
   * Returns an iterator of [index, item] pairs.
   * @returns An iterator of index-item pairs.
   */
  *entries(): IterableIterator<[number, T]> {
    for (let index = 0; index < this._items.length; index++) {
      yield [index, this._items[index]];
    }
  }

  /**
   * Returns an iterator of item indices.
   * @returns An iterator of item indices.
   */
  *keys(): IterableIterator<number> {
    for (let index = 0; index < this._items.length; index++) {
      yield index;
    }
  }

  /**
   * Returns an iterator of IOCollection items.
   * @returns An iterator of IOCollection items.
   */
  *values(): IterableIterator<T> {
    yield* this._items;
  }
}

export default IOCollection;
