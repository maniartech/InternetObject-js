import assertNever from '../errors/asserts/asserts';
import InternetObject from './internet-object';

class Collection<T = InternetObject> {
  private _items: T[];
  private _proxy: Collection<T> | null = null;

  /**
   * Adds an item to the collection without modifying the original instance.
   * @param item - The item to add.
   * @returns A new collection with the item added.
   */
  public add(item: T): Collection<T> {
    return new Collection([...this._items, item]);
  }

  constructor(items: T[] = []) {
    this._items = items;
  }

  public get(index: number): T {
    if (index < 0 || index >= this._items.length) {
      throw new Error('Index out of range');
    }
    return this._items[index];
  }

  public set(index: number, item: T): Collection<T> {
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

  public get length(): number {
    return this._items.length;
  }

  public get isEmpty(): boolean {
    return this.length === 0;
  }

  // Map
  public map<U>(callback: (item: T, index: number, array: T[]) => U): Collection<U> {
    const mappedItems = this._items.map(callback);
    return new Collection<U>(mappedItems);
  }

  // Filter
  public filter(callback: (item: T, index: number, array: T[]) => boolean): Collection<T> {
    const filteredItems = this._items.filter(callback);
    return new Collection<T>(filteredItems);
  }

  // Reduce
  public reduce<U>(callback: (accumulator: U, item: T, index: number, array: T[]) => U, initialValue: U): U {
    return this._items.reduce(callback, initialValue);
  }

  // forEach
  public forEach(callback: (item: T, index: number, array: T[]) => void): void {
    this._items.forEach(callback);
  }

  // Some
  public some(callback: (item: T, index: number, array: T[]) => boolean): boolean {
    return this._items.some(callback);
  }

  // Every
  public every(callback: (item: T, index: number, array: T[]) => boolean): boolean {
    return this._items.every(callback);
  }

  // Find
  public find(callback: (item: T, index: number, array: T[]) => boolean): T | undefined {
    return this._items.find(callback);
  }

  // FindIndex
  public findIndex(callback: (item: T, index: number, array: T[]) => boolean): number {
    return this._items.findIndex(callback);
  }

  // Push
  /**
   * Adds items to the collection in-place.
   * @param items - The items to add.
   * @returns The new length of the collection.
   */
  public push(...items: T[]): number {
    return this._items.push(...items);
  }

  // Pop
  /**
   * Removes the last item from the collection.
   * @returns The removed item, or undefined if the collection is empty.
   */
  public pop(): T | undefined {
    return this._items.pop();
  }

  public withIndex(): Collection<T> {
    if (!this._proxy) {
      this._proxy = new Proxy(this, proxy);
    }
    return this._proxy;
  }

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

  // Iterable protocol
  /**
   * Allows iteration over the collection using for..of syntax.
   * @returns An iterator for the collection.
   */
  *[Symbol.iterator](): IterableIterator<T> {
    yield* this._items;
  }

  // Entries Iterator
  /**
   * Returns an iterator of [index, item] pairs.
   * @returns An iterator of index-item pairs.
   */
  *entries(): IterableIterator<[number, T]> {
    for (let index = 0; index < this._items.length; index++) {
      yield [index, this._items[index]];
    }
  }

  // Keys Iterator
  /**
   * Returns an iterator of item indices.
   * @returns An iterator of item indices.
   */
  *keys(): IterableIterator<number> {
    for (let index = 0; index < this._items.length; index++) {
      yield index;
    }
  }

  // Values Iterator
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
      return target.get(Number(property));
    }

    assertNever(property as never);
  },

  set: (target: Collection<any>, property: string | number | symbol, value: any) => {
    throw new Error('Cannot set a value on a Collection');
  }
};

export default Collection;
