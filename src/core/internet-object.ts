import type Schema from '../schema/schema';
import { toJSONValue } from '../utils/json-projection';

/**
 * One value on its way out of {@link IOObject.toObject} — containers flattened, everything else
 * left alone.
 *
 * A `Date` / `Decimal` / byte array used to be converted here too, by calling its `toJSON()`. That
 * made `toObject()` half a JSON projection: a top-level `Date` came back a string while the same
 * `Date` one level down inside an array stayed a `Date`.
 */
function toPlainValue(value: any): any {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(toPlainValue);
  if (typeof value.toObject === 'function') return value.toObject();
  return value;
}

/**
 * IOObject is an ordered key-value collection that supports both keyed and positional access.
 *
 * Features:
 * - Maintains insertion order of key-value pairs
 * - Supports mixed keyed and positional (keyless) entries
 * - Provides O(1) key-based lookups via internal Map
 * - Implements Iterable for for..of loops
 * - Supports sparse deletions with optional compaction
 * - Method-only access (R7): data is read via `get`/`getAt` — there is NO dot-notation / instance-
 *   property sync, so a data key can never collide with a method name or with `.errors`/`.length`.
 *
 * @template T The type of values stored in the object
 *
 * @example
 * ```typescript
 * const obj = new IOObject<number>();
 * obj.set('a', 1);
 * obj.pushValue(2);       // positional entry (no key)
 * obj.set('b', 3);
 * console.log(obj.get('a'));  // 1  (method access — NOT obj.a)
 * console.log(obj.getAt(1));  // 2
 * ```
 */
class IOObject<T = any> implements Iterable<[string | undefined, T]> {
  private items!: ([string | undefined, T] | undefined)[];
  private keyMap!: Map<string, number>;
  /**
   * The shape this object was declared with, or `null`.
   *
   * OPTIONAL by design. Plenty of IOObjects have no schema -- a schema-less document produces
   * them -- and without one there is no position guarantee at all: members sit where they were
   * put, which is the only order anybody could mean. Everything below applies ONLY when a shape
   * was declared.
   */
  private schema!: Schema | null;
  /** `schema.names` as name -> declared index, so placement is a lookup rather than a scan. */
  private schemaOrder!: Map<string, number> | null;
  public errors: Error[] = [];

  constructor(o?: Record<string, T>) {
    // Initialize private properties as non-enumerable to prevent conflicts with user keys
    Object.defineProperty(this, 'items', {
      value: [],
      writable: true,
      enumerable: false,
      configurable: false
    });
    Object.defineProperty(this, 'keyMap', {
      value: new Map(),
      writable: true,
      enumerable: false,
      configurable: false
    });
    Object.defineProperty(this, 'errors', {
      value: [],
      writable: true,
      enumerable: false,
      configurable: false
    });
    // Non-enumerable like the rest of the internals, so a data key can never collide with them.
    Object.defineProperty(this, 'schema', {
      value: null,
      writable: true,
      enumerable: false,
      configurable: false
    });
    Object.defineProperty(this, 'schemaOrder', {
      value: null,
      writable: true,
      enumerable: false,
      configurable: false
    });

    if (o) {
      for (const [key, value] of Object.entries(o)) {
        this.set(key, value);
      }
    }
  }

  /**
   * Declares this object's shape.
   *
   * Attaching is all this does. It does NOT touch the members already present -- reordering an
   * existing object is {@link applySchemaOrder}, which a caller makes deliberately. What attaching
   * changes is every write from here on:
   *
   * > **A member the schema declares is placed at the position the schema declares it, whatever
   * > order it arrives in. A member the schema does not declare -- the extras an open (`*`) schema
   * > permits -- is appended, and so follows the declared members in arrival order.**
   *
   * That is what makes `getAt(i)` mean the same thing however the object was built: parsed from
   * text, loaded from JavaScript, or assembled one `set()` at a time.
   *
   * Passing `null` detaches the shape. It does not restore a previous order -- there is nothing to
   * restore to -- it only stops the rule applying to later writes.
   */
  attachSchema(schema: Schema | null): this {
    this.schema = schema ?? null;
    this.schemaOrder = schema
      ? new Map(schema.names.map((name, index) => [name, index]))
      : null;
    return this;
  }

  /** The shape declared for this object, or `null` when it has none. */
  getSchema(): Schema | null {
    return this.schema;
  }

  /**
   * Puts the members already present into the declared shape's order: everything the schema
   * declares first, in declaration order, then everything it does not, in the order it already
   * had.
   *
   * Voluntary, and a no-op when no schema is attached. Use it when members went in before the
   * shape was known -- {@link attachSchema} deliberately leaves them alone, because silently
   * rearranging an object somebody just handed you is not a thing a setter should do.
   *
   * Compacts as it goes: entries left `undefined` by `delete()` are dropped, since a hole has no
   * position in a declared shape.
   */
  applySchemaOrder(): this {
    if (this.schemaOrder === null) return this;
    const declared: [number, [string | undefined, T]][] = [];
    const extras: [string | undefined, T][] = [];
    for (const entry of this.items) {
      if (entry === undefined) continue;
      const at = this.orderOf(entry[0]);
      if (at === -1) extras.push(entry);
      else declared.push([at, entry]);
    }
    declared.sort((a, b) => a[0] - b[0]);
    this.items = [...declared.map(([, entry]) => entry), ...extras];
    this.reindex();
    return this;
  }

  /** Where `key` sits in the declared shape, or -1 when it is keyless, undeclared, or unshaped. */
  private orderOf(key: string | undefined): number {
    if (key === undefined || this.schemaOrder === null) return -1;
    return this.schemaOrder.get(key) ?? -1;
  }

  /**
   * The index a declared member with shape-position `order` belongs at: ahead of the first entry
   * that is either an extra (or keyless -- no name to place it by) or a declared member that comes
   * later in the shape. Holes are skipped rather than treated as boundaries.
   */
  private slotFor(order: number): number {
    for (let index = 0; index < this.items.length; index++) {
      const entry = this.items[index];
      if (entry === undefined) continue;
      const at = this.orderOf(entry[0]);
      if (at === -1 || at > order) return index;
    }
    return this.items.length;
  }

  /**
   * Rebuilds `keyMap` from `items`. Wholesale, because patching indices around holes is the kind
   * of cleverness that breaks the next time `delete()` is called.
   */
  private reindex(): void {
    this.keyMap.clear();
    for (let index = 0; index < this.items.length; index++) {
      const entry = this.items[index];
      if (entry !== undefined && entry[0] !== undefined) this.keyMap.set(entry[0], index);
    }
  }

  /**
   * Returns the validation/parse errors accumulated for this object.
   * The uniform error-read API shared by every core container (R6); `.errors` stays available directly.
   */
  getErrors(): ReadonlyArray<Error> {
    return [...this.errors];
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
      // With a shape declared, a member goes where the shape says -- not where it arrived. Without
      // one, `orderOf` is -1 for everything and this is the plain append it always was.
      const order = this.orderOf(key);
      if (order === -1) {
        const index = this.items.length;
        this.items.push([key, value]);
        this.keyMap.set(key, index);
      } else {
        this.items.splice(this.slotFor(order), 0, [key, value]);
        this.reindex();
      }
    }
    // R7: data is stored ONLY in items/keyMap and accessed via get()/getAt() — no instance-property
    // sync. This makes access consistent (method-only) and frees `.errors`/`.length` and every method
    // name from ever colliding with a data key (so no reserved-name guard is needed).
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
        const order = this.orderOf(key);
        if (order === -1) {
          const index = this.items.length;
          this.items.push([key, value]);
          this.keyMap.set(key, index);
        } else {
          this.items.splice(this.slotFor(order), 0, [key, value]);
          this.reindex();
        }
      } else {
  this.items.push([undefined, item]);
      }
    }
  }

  /**
   * Appends a single value as a POSITIONAL (keyless) member.
   *
   * Unlike `push()`, this does NOT apply the `[key, value]`-tuple interpretation to array arguments —
   * so an array DATA value (e.g. `["1984","T","N","Hello"]`) is stored intact as one positional value
   * rather than being destructured into `key="1984", value="T"` (which silently drops elements).
   * Use this for positional data values; use `push([k, v])` only when you genuinely mean a keyed pair.
   */
  pushValue(value: T): this {
    this.items.push([undefined, value]);
    return this;
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
  return this.length === 0;
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
   * Clears all key-value pairs from the IOObject.
   */
  clear(): void {
    this.items = [];
    this.keyMap.clear();
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
   * Converts the InternetObject to a plain JavaScript object, with its values LIVE.
   *
   * Containers (nested records, collections, arrays) become plain objects and arrays; every other
   * value is handed back as it is — a `Date` stays a `Date`, a `Decimal` a `Decimal`, bytes stay
   * bytes. This is the form to work with in code. For the JSON spelling of those values, use
   * {@link toJSON}.
   *
   * Keys are used where available; otherwise the positional index.
   */
  toObject(): any {
    const obj:any = {}
    this.forEach((value:any, key:string | undefined, index:number) => {
      if (typeof value === "undefined") return
      obj[key || index] = toPlainValue(value);
    });

    return obj;
  }

  /**
   * Converts the InternetObject to JSON — the same data as {@link toObject}, with every value
   * spelled the way JSON can carry it (dates as ISO strings, decimals and bigints as strings,
   * binary as base64), all the way down. See {@link toJSONValue}.
   */
  toJSON(): any {
    return toJSONValue(this.toObject());
  }

  /**
   * Custom inspector for Node.js `console.log`.
   * Returns the plain object representation for better readability.
   */
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return this.toObject();
  }
}

export default IOObject;
