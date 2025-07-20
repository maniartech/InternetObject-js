class IOObject<T = any> implements Iterable<[string | undefined, T]> {
  private items: ([string | undefined, T] | undefined)[];
  private keyMap: Map<string, number>;
  private _size: number;

  constructor(o?: Record<string, T>) {
    this.items = [];
    this.keyMap = new Map();
    this._size = 0;

    if (o) {
      for (const [key, value] of Object.entries(o)) {
        this.set(key, value);
      }
    }
  }

  /**
   * Adds or updates a key-value pair in the IOObject.
   * If the key exists, updates the value at its index.
   * @param key The key to add or update.
   * @param value The value associated with the key.
   * @returns The IOObject instance.
   */
  set(key: string, value: T): this {
    if (this.keyMap.has(key)) {
      const index = this.keyMap.get(key)!;
      this.items[index] = [key, value];
    } else {
      const index = this.items.length;
      this.items.push([key, value]);
      this.keyMap.set(key, index);
      this._size++;
    }
    return this;
  }

  /**
   * Appends values to the IOObject.
   * Values can be with or without keys.
   * @param items Variadic arguments of values or [key, value] pairs.
   */
  push(...items: ([string, T] | T)[]): void {
    for (const item of items) {
      if (Array.isArray(item)) {
        const [key, value] = item;
        if (this.has(key)) {
          throw new Error(`Key '${key}' already exists`);
        }
        const index = this.items.length;
        this.items.push([key, value]);
        this.keyMap.set(key, index);
        this._size++;
      } else {
        this.items.push([undefined, item]);
        this._size++;
      }
    }
  }

  /**
   * Retrieves the value associated with the given key.
   * @param key The key to look up.
   * @returns The value if found, otherwise undefined.
   */
  get(key: string): T | undefined {
    const index = this.keyMap.get(key);
    if (index !== undefined) {
      const entry = this.items[index];
      return entry ? entry[1] : undefined;
    }
    return undefined;
  }

  /**
   * Retrieves the value at the specified index.
   * @param index The index to access.
   * @returns The value if index is valid and entry exists, otherwise undefined.
   */
  getAt(index: number): T | undefined {
    if (index < 0 || index >= this.items.length) {
      return undefined;
    }
    const entry = this.items[index];
    return entry ? entry[1] : undefined;
  }

  /**
   * Retrieves the key at the specified index.
   * @param index The index to access.
   * @returns The key if index is valid and exists, otherwise undefined.
   */
  keyAt(index: number): string | undefined {
    if (index < 0 || index >= this.items.length) {
      return undefined;
    }
    const entry = this.items[index];
    return entry ? entry[0] : undefined;
  }

  /**
   * Checks if the IOObject contains a given key.
   * @param key The key to check.
   * @returns True if the key exists, otherwise false.
   */
  has(key: string): boolean {
    return this.keyMap.has(key);
  }

  /**
   * Deletes a key-value pair from the IOObject by key.
   * @param key The key to delete.
   * @returns True if the key was found and deleted, otherwise false.
   */
  delete(key: string): boolean {
    const index = this.keyMap.get(key);
    if (index !== undefined && this.items[index]) {
      this.items[index] = undefined;
      this.keyMap.delete(key);
      this._size--;
      return true;
    }
    return false;
  }

  /**
   * Deletes a value at a specific index.
   * Throws an error if the index is out of range.
   * @param index The index to delete.
   * @returns True if the value was deleted, otherwise false.
   * @throws Error if the index is invalid.
   */
  deleteAt(index: number): boolean {
    if (index < 0 || index >= this.items.length) {
      throw new Error('Index out of range');
    }

    const entry = this.items[index];
    if (entry) {
      const key = entry[0];
      if (key !== undefined) {
        this.keyMap.delete(key);
      }
      this.items[index] = undefined;
      this._size--;
      return true;
    }
    return false;
  }

  /**
   * Updates the value at the specified index.
   * Throws an error if the index is out of range.
   * @param index The index to set.
   * @param value The value to set.
   * @returns True if the value was updated, otherwise false.
   * @throws Error if the index is invalid.
   */
  setAt(index: number, value: T): boolean {
    if (index < 0 || index >= this.items.length) {
      throw new Error('Index out of range');
    }
    const entry = this.items[index];
    if (entry) {
      this.items[index] = [entry[0], value];
      return true;
    }
    return false;
  }

  /**
   * Returns the index of the given key.
   * @param key The key to find.
   * @returns The index if found, otherwise -1.
   */
  indexOfKey(key: string): number {
    return this.keyMap.get(key) ?? -1;
  }

  /**
   * Returns the index of the given value.
   * @param value The value to find.
   * @returns The index if found, otherwise -1.
   */
  indexOf(value: T): number {
    return this.items.findIndex(
      (entry) => entry !== undefined && Object.is(entry[1], value)
    );
  }

  /**
   * Checks if the IOObject is empty.
   * @returns True if empty, otherwise false.
   */
  isEmpty(): boolean {
    return this._size === 0;
  }

  /**
   * Creates an IOObject from an array of values or [key, value] pairs.
   * @param array The array to create from.
   * @returns A new IOObject instance.
   */
  static fromArray<T>(array: (T | [string, T])[]): IOObject<T> {
    const io = new IOObject<T>();
    for (const item of array) {
      if (Array.isArray(item)) {
        io.set(item[0], item[1]);
      } else {
        io.push(item);
      }
    }
    return io;
  }

  /**
   * Returns the number of entries in the IOObject, including undefined entries.
   */
  get length(): number {
    return this.items.length;
  }

  /**
   * Returns the number of active entries in the IOObject.
   */
  get size(): number {
    return this._size;
  }

  /**
   * Clears all key-value pairs from the IOObject.
   */
  clear(): void {
    this.items = [];
    this.keyMap.clear();
    this._size = 0;
  }

  /**
   * Compacts the items array by removing undefined entries and updating the keyMap.
   * Note: This operation is O(n) and may affect performance on large datasets.
   * Use this method when you need to reduce memory usage or after multiple deletions.
   */
  compact(): void {
    const newItems: ([string | undefined, T])[] = [];
    const newKeyMap = new Map<string, number>();

    for (const entry of this.items) {
      if (entry !== undefined) {
        newItems.push(entry);
        const key = entry[0];
        if (key !== undefined) {
          newKeyMap.set(key, newItems.length - 1);
        }
      }
    }

    this.items = newItems;
    this.keyMap = newKeyMap;
    this._size = this.items.length;
  }

  /**
   * Executes a provided function once for each key-value pair.
   * @param callbackfn Function to execute for each element.
   * @param thisArg Value to use as `this` when executing callback.
   */
  forEach(
    callbackfn: (value: T, key: string | undefined, index: number) => void,
    thisArg?: any
  ): void {
    for (let index = 0; index < this.items.length; index++) {
      const entry = this.items[index];
      if (entry !== undefined) {
        callbackfn.call(thisArg, entry[1], entry[0], index);
      }
    }
  }

  /**
   * Returns an iterable of key, value pairs for every entry in the IOObject.
   */
  entries(): IterableIterator<[string | undefined, T]> {
    return this._createIterator((entry) => entry);
  }

  /**
   * Returns an array of keys in the IOObject.
   * Excludes entries without keys (i.e., where key is undefined).
   * @returns An array of keys.
   */
  keysArray(): string[] {
    return this.items
      .filter((entry): entry is [string, T] => entry !== undefined && entry[0] !== undefined)
      .map((entry) => entry[0]);
  }

  /**
   * Returns an iterable of keys in the IOObject.
   * Excludes entries without keys (i.e., where key is undefined).
   */
  keys(): IterableIterator<string> {
    return (function* (items) {
      for (const entry of items) {
        if (entry !== undefined && entry[0] !== undefined) {
          yield entry[0];
        }
      }
    })(this.items);
  }

  /**
   * Returns an iterable of values in the IOObject.
   */
  values(): IterableIterator<T> {
    return (function* (items) {
      for (const entry of items) {
        if (entry !== undefined) {
          yield entry[1];
        }
      }
    })(this.items);
  }

  /**
   * Returns an array of values in the IOObject.
   * Includes all entries, even those without keys.
   * @returns An array of values.
   */
  valuesArray(): T[] {
    return this.items
      .filter((entry): entry is [string | undefined, T] => entry !== undefined)
      .map((entry) => entry[1]);
  }

  /**
   * Creates an iterator based on a selector function.
   * @param selector Function to select the output of the iterator.
   */
  private *_createIterator<U>(
    selector: (entry: [string | undefined, T]) => U
  ): IterableIterator<U> {
    for (const entry of this.items) {
      if (entry !== undefined) {
        yield selector(entry);
      }
    }
  }

  /**
   * Returns an iterator over the entries in insertion order.
   */
  [Symbol.iterator](): IterableIterator<[string | undefined, T]> {
    return this.entries();
  }

  /**
   * Returns the default string representation of the object.
   */
  get [Symbol.toStringTag](): string {
    return 'IOObject';
  }

  /**
   * Finds a value based on a predicate function.
   * @param predicate Function to test each element.
   * @returns The value if found, otherwise undefined.
   */
  find(
    predicate: (value: T, key: string | undefined, index: number) => boolean
  ): T | undefined {
    let index = 0;
    for (const entry of this.items) {
      if (entry !== undefined && predicate(entry[1], entry[0], index)) {
        return entry[1];
      }
      index++;
    }
    return undefined;
  }

  /**
   * Finds the index of a value based on a predicate function.
   * @param predicate Function to test each element.
   * @returns The index if found, otherwise -1.
   */
  findIndex(
    predicate: (value: T, key: string | undefined, index: number) => boolean
  ): number {
    let index = 0;
    for (const entry of this.items) {
      if (entry !== undefined && predicate(entry[1], entry[0], index)) {
        return index;
      }
      index++;
    }
    return -1;
  }

  /**
   * Creates a new array populated with the results of calling a provided function on every element.
   * @param callbackfn Function that produces an element of the new Array.
   * @param thisArg Value to use as `this` when executing callback.
   * @returns A new array with each element being the result of the callback function.
   */
  map<U>(
    callbackfn: (value: T, key: string | undefined, index: number) => U,
    thisArg?: any
  ): U[] {
    const result: U[] = [];
    let index = 0;
    for (const entry of this.items) {
      if (entry !== undefined) {
        result.push(callbackfn.call(thisArg, entry[1], entry[0], index));
      }
      index++;
    }
    return result;
  }

  /**
   * Converts the InternetObject to a JSON object. If the items do not have keys,
   * use the index as the key. If the value has toJSON method, it will be called.
   * Used when calling JSON.stringify.
   * @returns An array of entries.
   */
  toJSON(): any {
    const obj:any = {}
    this.forEach((value:any, key:string | undefined, index:number) => {
      if (typeof value === "undefined") return

      obj[key || index] =
        typeof value === 'object' && typeof value?.toJSON === 'function'
          ? value.toJSON()
          : value;
    });

    return obj;
  }
}

export default IOObject;
