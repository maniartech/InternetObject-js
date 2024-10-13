import assertNever from '../errors/asserts/asserts';
import InternetObject from './internet-object';

class Collection<T = InternetObject> {
  private _items: T[];

  /**
   * Constructs a new Collection instance.
   * @param items - An optional array of items to initialize the collection with.
   */
  constructor(items: T[] = []) {
    this._items = items;
  }

  /**
   * Pushes one or more items to the collection without modifying the original instance.
   * @param items - The items to push.
   * @returns A new collection with the item added.
   */
  public push(...items: T[]): Collection<T> {
    return new Collection([...this._items, ...items]);
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
   * @returns The updated collection.
   */
  public setAt(index: number, item: T): Collection<T> {
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
   * Deletes an item from the collection at the specified index.
   * @param index - The index of the item to delete.
   * @throws {Error} If the index is out of range.
   * @returns The updated collection.
   */
  public deleteAt(index: number): Collection<T> {
    if (index < 0 || index >= this._items.length) {
      throw new Error('Index out of range');
    }
    this._items.splice(index, 1);
    return this;
  }

  /**
   * Gets the length of the collection.
   * @returns The number of items in the collection.
   */
  public get length(): number {
    return this._items.length;
  }

  /**
   * Checks if the collection is empty.
   * @returns True if the collection is empty, otherwise false.
   */
  public get isEmpty(): boolean {
    return this.length === 0;
  }

  /**
   * Creates a new collection with the results of calling a provided function on every element.
   * @param callback - Function that produces an element of the new collection.
   * @returns A new collection with each element being the result of the callback function.
   */
  public map<U>(callback: (item: T, index: number, array: T[]) => U): Collection<U> {
    const mappedItems = this._items.map(callback);
    return new Collection<U>(mappedItems);
  }

  /**
   * Creates a new collection with all elements that pass the test implemented by the provided function.
   * @param callback - Function to test each element of the collection.
   * @returns A new collection with the elements that pass the test.
   */
  public filter(callback: (item: T, index: number, array: T[]) => boolean): Collection<T> {
    const filteredItems = this._items.filter(callback);
    return new Collection<T>(filteredItems);
  }

  /**
   * Applies a function against an accumulator and each element in the collection to reduce it to a single value.
   * @param callback - Function to execute on each element in the collection.
   * @param initialValue - Initial value to start the reduction.
   * @returns The single value that results from the reduction.
   */
  public reduce<U>(callback: (accumulator: U, item: T, index: number, array: T[]) => U, initialValue: U): U {
    return this._items.reduce(callback, initialValue);
  }

  /**
   * Executes a provided function once for each collection element.
   * @param callback - Function to execute on each element.
   */
  public forEach(callback: (item: T, index: number, array: T[]) => void): void {
    this._items.forEach(callback);
  }

  /**
   * Tests whether at least one element in the collection passes the test implemented by the provided function.
   * @param callback - Function to test each element.
   * @returns True if the callback function returns a truthy value for at least one element, otherwise false.
   */
  public some(callback: (item: T, index: number, array: T[]) => boolean): boolean {
    return this._items.some(callback);
  }

  /**
   * Tests whether all elements in the collection pass the test implemented by the provided function.
   * @param callback - Function to test each element.
   * @returns True if the callback returns a truthy value for all elements, otherwise false.
   */
  public every(callback: (item: T, index: number, array: T[]) => boolean): boolean {
    return this._items.every(callback);
  }

  /**
   * Returns the value of the first element in the collection that satisfies the provided testing function.
   * @param callback - Function to execute on each element.
   * @returns The first element that satisfies the testing function, or undefined if no elements satisfy it.
   */
  public find(callback: (item: T, index: number, array: T[]) => boolean): T | undefined {
    return this._items.find(callback);
  }

  /**
   * Returns the index of the first element in the collection that satisfies the provided testing function.
   * @param callback - Function to execute on each element.
   * @returns The index of the first element that satisfies the testing function, or -1 if no elements satisfy it.
   */
  public findIndex(callback: (item: T, index: number, array: T[]) => boolean): number {
    return this._items.findIndex(callback);
  }

  /**
   * Inserts one or more items into the collection at the specified index.
   * @param index - The index at which to insert the items.
   * @param items - The items to insert.
   * @returns The new length of the collection.
   */
  public insert(index: number, ...items: T[]): number {
    this._items.splice(index, 0, ...items);
    return this._items.length;
  }

  /**
   * Removes the last item from the collection.
   * @returns The removed item, or undefined if the collection is empty.
   */
  public pop(): T | undefined {
    return this._items.pop();
  }

  /**
   * Converts the collection to a JSON-compatible representation.
   * @returns An array of JSON-compatible representations of the items.
   */
  public toJSON(): any {
    return this._items.map((item) => {
      if (item instanceof InternetObject) {
        return item.toJSON();
      } else if (typeof item === 'object' && item !== null) {
        return JSON.stringify(item);
      }
      return item;
    });
  }

  /**
   * Allows iteration over the collection using for..of syntax.
   * @returns An iterator for the collection.
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
   * Returns an iterator of collection items.
   * @returns An iterator of collection items.
   */
  *values(): IterableIterator<T> {
    yield* this._items;
  }
}

const proxy = {
  get: (target: Collection<any>, property: string | symbol) => {
    if (property in target) {
      return Reflect.get(target, property);
    }

    if (typeof property === 'string' && /^[0-9]+$/.test(property)) {
      return target.getAt(Number(property));
    }

    assertNever(property as never);
  },

  set: (target: Collection<any>, property: string | number | symbol, value: any) => {
    if (typeof property === 'string' && /^[0-9]+$/.test(property)) {
      target.setAt(Number(property), value);
      return true;
    }

    throw new Error('Cannot set a value on a Collection');
  },

  deleteProperty: (target: Collection<any>, property: string | symbol) => {
    if (typeof property === 'string' && /^[0-9]+$/.test(property)) {
      const index = Number(property);
      target.deleteAt(index);
      return true;
    }

    throw new Error('Cannot delete a value on a Collection');
  }
};

export default Collection;
