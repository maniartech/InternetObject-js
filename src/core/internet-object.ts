/**
 * Represents a hybrid kind of object that allows member access by both key
 * and index. The key is optional and can be any string. Any value can be
 * accessed using its index as well. Provides proxy-based intuitive access
 * and direct methods for performance-critical operations.
 */
class InternetObject<T = any> {
  private _keys: string[] = [];
  private _values: [string | undefined, T][] = [];
  private _keyIndexMap: { [key: string]: number } = {};
  [key: string | number]: any;

  constructor(o?: { [key: string]: T }) {
    // If an object is passed, populate the InternetObject
    if (o) {
      for (const key in o) {
        this.push([key, o[key]]);
      }
    }

    return new Proxy(this, ioProxyHandler);
  }

  /**
   * Directly sets a key-value pair in the InternetObject. If the key already
   * exists, the value is overwritten. Otherwise, a new key-value pair is
   * created and appended to the end of the InternetObject.
   * @param key - The key associated with the value.
   * @param value - The value to set.
   */
  public set(key: string, value: T): InternetObject<T> {
    const index = this._keyIndexMap[key];

    // If the key already exists, overwrite the value
    if (index !== undefined) {
      this._values[index][1] = value;
      return this;
    }

    this._keys.push(key);
    this._values.push([key, value]);
    this._keyIndexMap[key] = this._values.length - 1;
    return this;
  }

  public setAt(index: number, value: T): InternetObject<T> {
    if (index < 0 || index >= this._values.length) {
      throw new Error("Index out of range");
    }

    this._values[index][1] = value;
    return this;
  }

  /**
   * Pushes values to the end of the InternetObject. It allows pushing
   * items with or without keys. If the item has a key, it must not be
   * present in the InternetObject. Only new keys are allowed.
   * @param items - Array of key-value pairs or values to push.
   */
  public push(...items: (T | [string | undefined, T])[]) {
    for (const item of items) {
      if (Array.isArray(item)) {
        const [key, value] = item;
        if (key !== undefined) {
          if (this._keyIndexMap[key] !== undefined) {
            throw new Error(`Key "${key}" already exists`);
          }
          this._keys.push(key);
        }
        this._values.push([key, value]);
        if (key !== undefined) {
          this._keyIndexMap[key] = this._values.length - 1;
        }
      } else {
        this._values.push([undefined, item]);
      }
    }
  }

  /**
   * Returns the keys set in the InternetObject.
   * @returns Array of keys.
   */
  get keys(): string[] {
    return this._keys.slice();
  }

  /**
   * Returns true if the key exists in the InternetObject, false otherwise.
   * @param key The key to check for.
   * @returns true if the key exists, false otherwise.
   */
  has = (key: string): boolean => {
    return this._keyIndexMap[key] !== undefined;
  }

  /**
   * Directly retrieves a value based on its key or index.
   * Bypasses the proxy for performance.
   * @param key - The key or index of the value to retrieve.
   * @returns The associated value, or undefined if not found.
   */
  get(key: string): T | undefined {
    const index = this._keyIndexMap[key];
    if (index === undefined) {
      return undefined;
    }

    return this._values[index][1];
  }

  getAt(index: number): T | undefined {
    if (index < 0 || index >= this._values.length) {
      return undefined;
    }
    return this._values[index][1];
  }

  /**
    * Returns the index of the given value.
    * @param value - The value to search for.
    * @returns The index of the value, or -1 if not found.
    */
  indexOf(value: T): number {
    for (let i = 0; i < this._values.length; i++) {
      if (this._values[i][1] === value) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Returns the index of the given key.
   * @param key - The key to search for.
   * @returns The index of the key, or -1 if not found.
   */
  indexOfKey(key: string): number {
    return this._keyIndexMap[key] === undefined ? -1 : this._keyIndexMap[key];
  }

  /**
    * Returns the values in the InternetObject.
    * @returns Array of values.
    */
  values(): T[] {
    return this._values.map(v => v[1]);
  }

  /**
    * Returns the key-value pairs in the InternetObject.
    * @returns Array of key-value pairs.
    */
  entries(): [string | undefined, T][] {
    return this._values.slice();
  }

  /**
   * Directly deletes a key-value pair based on its key. Also deletes the associated
   * value from the values array.
   * Bypasses the proxy for performance.
   * @param key - The key of the value to delete.
   */
  delete(key: string): InternetObject<T> {
    const index = this._keyIndexMap[key];
    if (index === undefined) {
      return this;
    }
    this.deleteAt(index);
    return this;
  }

  /**
   * Deletes the key-value pair at the given index.
   * @param index - The index to delete at.
   */
  deleteAt(index: number): InternetObject<T> {
    if (index < 0 || index >= this._values.length) {
      throw new Error("Index out of range");
    }
    const [key] = this._values.splice(index, 1)[0];
    if (key) {
      delete this._keyIndexMap[key];
    }

    // Adjust the indices in the map
    for (let i = index; i < this._values.length; i++) {
      const [currentKey] = this._values[i];
      if (currentKey !== undefined) {
        this._keyIndexMap[currentKey] = i;
      }
    }

    return this;
  }

  /**
   * Clears the InternetObject of all key-value pairs.
   */
  clear(): InternetObject<T> {
    this._keys = [];
    this._values = [];
    this._keyIndexMap = {};
    return this;
  }

  /**
   * Returns true if the InternetObject is empty, false otherwise.
   * @returns true if the InternetObject is empty, false otherwise.
   */
  isEmpty(): boolean {
    return this._values.length === 0;
  }

  /**
   * Gets the number of key-value pairs in the InternetObject.
   * @returns The number of key-value pairs.
   */
  get length(): number {
    return this._values.length;
  }

  toObject(): any {
    const o: any = {};
    for(let i=0; i<this._values.length; i++) {
      const [n, v] = this._values[i];
      o[n || i] = valueToObject(v);
    }

    return o;
  }

  /**
   * Makes the InternetObject iterable, yielding key-value pairs.
   */
  *[Symbol.iterator]() {
    for (const value of this._values) {
      yield value;
    }
  }

  /////////// Static ///////////

  // InternetObject.fromArray returns an InternetObject from an array of [key, value] pairs
  static fromArray<T>(array: [string, T][]): InternetObject<T> {
    const io = new InternetObject<T>();
    for (const [key, value] of array) {
      io.push([key, value]);
    }
    return io;
  }
}

const ioProxyHandler = {
  get: (target: InternetObject<any>, property: string | symbol) => {

    // If the property is a member of the InternetObject, return it
    if (property in target) {
      return Reflect.get(target, property);
    }

    if (typeof property === 'string') {
      // If the property is a number, get the value at that index
      if (/^[0-9]+$/.test(property)) {
        return target.getAt(Number(property));
      }

      // Return the string-keyed value
      return target.get(property);
    }
  },

  set: (target: InternetObject<any>, property: string | number | symbol, value: any) => {
    // If the property is a number, get the value at that index
    if (typeof property === 'string') {
      // setting of number is not supported through proxy
      if (/^[0-9]+$/.test(property)) {
        throw new Error('Direct assignment with numeric index is not supported. Use push, or setAt instead.');
      }

      // For strings, set the value associated with the key
      target.set(property, value);
    }

    // for symbols and other properties, defer to the standard set operation
    return Reflect.set(target, property, value);
  },

  delete: (target: InternetObject<any>, property: string | symbol) => {
    if (typeof property === 'string') {
      if (/^[0-9]+$/.test(property)) {
        target.deleteAt(Number(property));
      } else if (!Reflect.has(target, property)) {
        target.delete(property);
      }
      return true;
    }

    // For symbols and other properties, defer to the standard delete operation
    return Reflect.deleteProperty(target, property);
  }
};

function valueToObject(v:any):any {
  if (v instanceof InternetObject) {
    return v.toObject();
  }

  if (Array.isArray(v)) {
    return v.map(valueToObject);
  }

  return v;
}



export default InternetObject;
