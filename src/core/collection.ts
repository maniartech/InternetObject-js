import { toJSONValue } from '../utils/json-projection';
import IOObject from "./internet-object";
import type Schema from '../schema/schema';
import type Definitions from './definitions';
import { adoptRecord } from './schema-hooks';
import Revision, { stamp, touch } from './revision';

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
  private _items!: T[];
  public errors!: Error[];
  /**
   * The shape every record in this collection must have, when the section declared one.
   *
   * A collection is where a *new* record enters a document, and it is the only place that knows
   * what shape the record is supposed to be: the record itself arrives carrying nothing.
   */
  private _schema!: Schema | null;
  /** The definitions the schema was declared in — a member definition may name a variable. */
  private _schemaDefs!: Definitions | undefined;
  /**
   * The document's shared change counter, when somebody has subscribed (§8).
   *
   * Non-enumerable like every other internal, and `undefined` until `io.subscribe` stamps the
   * tree — so a caller who never subscribes pays a null check per write and nothing else.
   */
  _revision?: Revision;


  /**
   * Constructs a new IOCollection instance.
   * @param items - An optional array of items to initialize the collection with.
   */
  constructor(items: T[] = []) {
    // Internals are defined non-enumerable, the same way IOObject defines `items`/`keyMap`.
    // A plain field assignment would make them own ENUMERABLE properties, and then every native
    // protocol that walks own keys leaks them: `{ ...collection }` and `structuredClone(collection)`
    // both hand back `{ _items: [...], errors: [] }` instead of the collection's data. `errors` stays
    // publicly readable (R6) — non-enumerable is not private, it is merely not part of the key walk.
    Object.defineProperty(this, '_items', { value: items, writable: true, enumerable: false, configurable: false });
    Object.defineProperty(this, 'errors', { value: [], writable: true, enumerable: false, configurable: false });
    Object.defineProperty(this, '_schema', { value: null, writable: true, enumerable: false, configurable: false });
    Object.defineProperty(this, '_schemaDefs', { value: undefined, writable: true, enumerable: false, configurable: false });
    Object.defineProperty(this, '_revision', { value: undefined, writable: true, enumerable: false, configurable: true });
  }

  /**
   * Declares the shape every record in this collection has — **checking the records already held**
   * (B4).
   *
   * ```ts
   * rows.attachSchema(person);              // throws on the first record that does not fit
   * rows.attachSchema(person, defs, sink);  // reports every one instead; nothing is attached
   * ```
   *
   * Atomic without a sink: either the shape is on and every record satisfies it, or the collection
   * is untouched. With a sink it is a **check** — *"do these records satisfy that schema?"* — and
   * still changes nothing, so a schema-bearing collection never comes to hold records it forbids.
   *
   * On success the records are replaced by the validated ones, exactly as an insertion
   * would produce them.
   *
   * @throws {ValidationError} Without a sink, when a record does not satisfy the schema.
   */
  public attachSchema(schema: Schema | null, defs?: Definitions, sink?: Error[]): this {
    if (schema && this._items.length > 0) {
      const checked: T[] = [];
      const failures: Error[] = [];
      for (const item of this._items) {
        try {
          checked.push(adoptRecord(schema, item, defs) as T);
        } catch (error) {
          failures.push(error as Error);
          if (!sink) break;              // without a sink the first failure is the whole answer
        }
      }
      if (failures.length > 0) {
        if (!sink) throw failures[0];
        sink.push(...failures);
        return this;
      }
      this._items = checked;
    }
    return this.declareSchema(schema, defs);
  }

  /**
   * Declares the shape without checking the records already held. **Internal.**
   *
   * The parser and the loader validate each record as they build it and attach afterwards;
   * checking here would validate every parsed row a second time.
   *
   * @internal
   */
  public declareSchema(schema: Schema | null, defs?: Definitions): this {
    this._schema = schema ?? null;
    this._schemaDefs = schema ? defs : undefined;
    return this;
  }

  /** The shape declared for this collection's records, or `null`. */
  public getSchema(): Schema | null {
    return this._schema;
  }

  /**
   * Validates a record on its way in and returns the one to store.
   *
   * **Adoption can replace the value.** A plain object becomes a record, and a record built by
   * hand is re-loaded so that a *missing* required member is caught and not only a bad one — so
   * read the stored record back out of the collection rather than keeping the reference you
   * pushed. A record that already carries this schema is left exactly as it is.
   */
  private adopt(item: T): T {
    const adopted = adoptRecord(this._schema, item, this._schemaDefs) as T;
    // A record inserted into a SUBSCRIBED collection has to start reporting its own writes, or the
    // first thing a user adds is the one thing that silently does not notify.
    if (this._revision) stamp(adopted, this._revision);
    return adopted;
  }

  /**
   * Pushes one or more items to the IOCollection
   * @param items - The items to push.
   * @returns The updated IOCollection.
   */
  public push(...items: T[]): IOCollection<T> {
    // Adopt every item BEFORE storing any: a push that rejects the third of three must not leave
    // the first two behind. `map` throws on the offending item with nothing yet written.
    const adopted = items.map((item) => this.adopt(item));
    this._items.push(...adopted);
    touch(this);
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
    const adopted = this.adopt(item);
    if (index >= this._items.length) {
      this._items.push(adopted);
    } else {
      this._items[index] = adopted;
    }
    touch(this);
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
    touch(this);
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
    const adopted = items.map((item) => this.adopt(item));
    this._items.splice(index, 0, ...adopted);
    touch(this);
    return this._items.length;
  }

  /**
   * Removes the last item from the IOCollection.
   * @returns The removed item, or undefined if the IOCollection is empty.
   */
  public pop(): T | undefined {
    const popped = this._items.pop();
    if (popped !== undefined) touch(this);
    return popped;
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
   * Converts to JSON — the same data as {@link toObject}, with every value spelled the way JSON
   * can carry it (dates as ISO strings, decimals and bigints as strings, binary as base64), all
   * the way down. See `toJSONValue`.
   */
  public toJSON(options?: { skipErrors?: boolean }): any {
    return toJSONValue(this.toObject(options));
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

  // ── A5: the rest of the array surface (ADR 0005) ─────────────────────────────────────────────
  //
  // The class already had map/filter/find/reduce/forEach/some/every but not join/sort/slice/at.
  // That split is not a principle -- it is whatever was needed when the class was written -- and it
  // is what forced `[...rows.map(r => r.get('name'))].join(', ')` in the examples: `map` returns an
  // IOCollection, and IOCollection had no `join`.
  //
  // `map`/`filter` keep returning IOCollection. `Array.prototype.map` returns the SAME TYPE as its
  // input; applying that rule here yields IOCollection, which is what they already do. Making them
  // return Array would be smaller but breaking -- `rows.filter(...).getAt(0)` would stop working.

  /** Joins the items into a string, like `Array.prototype.join`. */
  public join(separator?: string): string {
    return this._items.join(separator);
  }

  /** Returns the item at `index`; negative counts from the end, like `Array.prototype.at`. */
  public at(index: number): T | undefined {
    return this._items.at(index);
  }

  /** True if the collection contains `item`, like `Array.prototype.includes`. */
  public includes(item: T, fromIndex?: number): boolean {
    return this._items.includes(item, fromIndex);
  }

  /** First index of `item`, or -1, like `Array.prototype.indexOf`. */
  public indexOf(item: T, fromIndex?: number): number {
    return this._items.indexOf(item, fromIndex);
  }

  /** Last index of `item`, or -1, like `Array.prototype.lastIndexOf`. */
  public lastIndexOf(item: T, fromIndex?: number): number {
    return fromIndex === undefined
      ? this._items.lastIndexOf(item)
      : this._items.lastIndexOf(item, fromIndex);
  }

  /** A shallow slice as a new IOCollection, like `Array.prototype.slice`. */
  public slice(start?: number, end?: number): IOCollection<T> {
    return new IOCollection<T>(this._items.slice(start, end));
  }

  /** This collection followed by the given items, as a new IOCollection. */
  public concat(...items: Array<IOCollection<T> | T[] | T>): IOCollection<T> {
    const out = [...this._items];
    for (const part of items) {
      if (part instanceof IOCollection) out.push(...part._items);
      else if (Array.isArray(part)) out.push(...part);
      else out.push(part as T);
    }
    return new IOCollection<T>(out);
  }

  /** Maps then flattens one level, like `Array.prototype.flatMap`. */
  public flatMap<U>(callback: (item: T, index: number, array: T[]) => U | U[]): IOCollection<U> {
    return new IOCollection<U>(this._items.flatMap(callback as any) as U[]);
  }

  /**
   * Sorts IN PLACE and returns this collection, like `Array.prototype.sort`.
   *
   * This mutates the document. Prefer `toSorted` when the collection is being read elsewhere.
   */
  public sort(compare?: (a: T, b: T) => number): IOCollection<T> {
    this._items.sort(compare);
    touch(this);
    return this;
  }

  /** Reverses IN PLACE and returns this collection, like `Array.prototype.reverse`. */
  public reverse(): IOCollection<T> {
    this._items.reverse();
    touch(this);
    return this;
  }

  /** A sorted copy, leaving this collection untouched (ES2023 `toSorted`). */
  public toSorted(compare?: (a: T, b: T) => number): IOCollection<T> {
    return new IOCollection<T>([...this._items].sort(compare));
  }

  /** A reversed copy, leaving this collection untouched (ES2023 `toReversed`). */
  public toReversed(): IOCollection<T> {
    return new IOCollection<T>([...this._items].reverse());
  }
}

export default IOCollection;
