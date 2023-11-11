import { assertFailure } from '../errors/asserts';
import InternetObject from './internet-object';

class Collection<T = InternetObject> {
  _items: T[];
  _proxy: Collection<T> | null = null;

  constructor(items: T[] = []) {
    this._items = items;
  }

  public get(index: number): T {
    if (!this._items) {
      throw new Error('Collection is empty');
    }

    if (index < 0 || index >= this._items.length) {
      throw new Error('Index out of range');
    }

    return this._items[index];
  }

  public set(index: number, item: T): Collection<T> {
    if (!this._items) {
      throw new Error('Collection is empty');
    }

    if (index < 0) {
      throw new Error('Index out of range, index cannot be negative');
    }

    if (index >= this._items.length) {
      throw new Error('Index out of range, push the item instead');
    }

    this._items[index] = item;
    return this;
  }

  public get length(): number {
    return this._items?.length || 0;
  }

  public get isEmpty(): boolean {
    return this.length === 0;
  }

  // Map
  map<U>(callback: (item: T, index: number, array: T[]) => U): Collection<U> {
    const mappedItems = this._items.map(callback);
    return new Collection<U>(mappedItems);
  }

  // Filter
  filter(callback: (item: T, index: number, array: T[]) => boolean): Collection<T> {
      const filteredItems = this._items.filter(callback);
      return new Collection<T>(filteredItems);
  }

  // Reduce
  reduce<U>(callback: (accumulator: U, item: T, index: number, array: T[]) => U, initialValue: U): U {
      return this._items.reduce(callback, initialValue);
  }

  // forEach
  forEach(callback: (item: T, index: number, array: T[]) => void): void {
      this._items.forEach(callback);
  }

  // Some
  some(callback: (item: T, index: number, array: T[]) => boolean): boolean {
      return this._items.some(callback);
  }

  // Every
  every(callback: (item: T, index: number, array: T[]) => boolean): boolean {
      return this._items.every(callback);
  }

  // Find
  find(callback: (item: T, index: number, array: T[]) => boolean): T | undefined {
      return this._items.find(callback);
  }

  // FindIndex
  findIndex(callback: (item: T, index: number, array: T[]) => boolean): number {
      return this._items.findIndex(callback);
  }

  // Push
  push(...items: T[]): number {
      return this._items.push(...items);
  }

  // Pop
  pop(): T | undefined {
      return this._items.pop();
  }

  public withIndex(): Collection<T> {
    if (!this._proxy) {
      this._proxy = new Proxy(this, proxy);
    }

    return this._proxy;
  }

  public toObject(): any {
    return this._items?.map((item) => {
      if (item instanceof InternetObject) {
        return item.toObject();
      }

      // Unsupported type
      throw new Error('Invalid item type.');
    });
  }

  // Iterable protocol
  *[Symbol.iterator]() {
    for (let item of this._items) {
        yield item;
    }
  }
}

const proxy = {
  get: (target: Collection<any>, property: string | symbol) => {
    // If the property is a member of the InternetObject, return it
    if (property in target) {
      return Reflect.get(target, property);
    }

    if (typeof property === 'string') {
      // If the property is a number, get the value at that index
      if (/^[0-9]+$/.test(property)) {
        return target.get(Number(property));
      }

      assertFailure(property as never);
    }
  },

  set: (target: Collection<any>, property: string | number | symbol, value: any) => {
    throw new Error('Cannot set a value on a Collection');
  }
}


export default Collection;
