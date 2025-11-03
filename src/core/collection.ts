import assertNever from '../errors/asserts/asserts';
import InternetObject from './internet-object';

import IOObject from "./internet-object";

/**
 * IOCollection is a collection of IOObject instances.
 */
class IOCollection<T = IOObject> {
  private _items: T[];

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
   * Converts the IOCollection to a JSON-compatible representation.
   * @returns An array of JSON-compatible representations of the items.
   */
  public toJSON(): any {
    return this._items.map((item) => {
      if (item instanceof IOObject) {
        return item.toJSON();
      } else if (typeof item === 'object' && item !== null) {
        // Check if item has toValue method (e.g., ErrorNode)
        if (typeof (item as any).toValue === 'function') {
          return (item as any).toValue();
        }
        // Check if item has toJSON method
        if (typeof (item as any).toJSON === 'function') {
          return (item as any).toJSON();
        }
        return JSON.stringify(item);
      }
      return item;
    });
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

const proxy = {
  get: (target: IOCollection<any>, property: string | symbol) => {
    if (property in target) {
      return Reflect.get(target, property);
    }

    if (typeof property === 'string' && /^[0-9]+$/.test(property)) {
      return target.getAt(Number(property));
    }

    assertNever(property as never);
  },

  set: (target: IOCollection<any>, property: string | number | symbol, value: any) => {
    if (typeof property === 'string' && /^[0-9]+$/.test(property)) {
      target.setAt(Number(property), value);
      return true;
    }

    throw new Error('Cannot set a value on a Collection');
  },

  deleteProperty: (target: IOCollection<any>, property: string | symbol) => {
    if (typeof property === 'string' && /^[0-9]+$/.test(property)) {
      const index = Number(property);
      target.deleteAt(index);
      return true;
    }

    throw new Error('Cannot delete a value on a Collection');
  }
};

export default IOCollection;
