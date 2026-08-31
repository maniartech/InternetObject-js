/**
 * The proxied document (ADR 0005 §7, A4).
 *
 * Reaching one value used to take five hops, three of them ceremony:
 *
 * ```ts
 * doc.sections.get(0).data.getAt(0).get('name')     // → 'Alice'
 * doc.sections.employees[0].name                    // the same read, proxied
 * ```
 *
 * ## What this is not
 *
 * It is **not** a change to the core classes. Nothing here is baked into `IODocument`,
 * `IOCollection` or `IOObject`; a proxy is put on only when a caller asks for one
 * ({@link proxyDocument}). `parse()` keeps returning exactly what it returned before. That is
 * deliberate: `io.parse` projects to plain objects and `io.parseDocument` returns *these*, and the
 * two paths must be separable.
 *
 * ## The one rule
 *
 * > **Data is own and enumerable. Methods are prototype and non-enumerable. The language does the
 * > rest.**
 *
 * This is JavaScript's own property resolution, not a convention the library invents: an own
 * property shadows a prototype one, and enumeration yields data only because prototype methods are
 * non-enumerable. So a section named `length` resolves to that section, while `io.sections(doc)`
 * — a functional form that cannot be shadowed — still answers the count. Symbol-keyed protocols and
 * numeric keys are immune by construction; IO names are strings.
 *
 * ## Targets
 *
 * Records and collections are proxied over a **plain object target**, because a proxy over a class
 * instance fails `isPlainObject` and `x.constructor === Object` — the checks lodash, redux, form
 * libraries and deep-equal utilities all make. Documents and section collections are proxied over a
 * plain target too, but report the real prototype from `getPrototypeOf`, so `instanceof IODocument`
 * keeps working on the container while the data stays ecosystem-plain.
 *
 * `structuredClone` throws `DataCloneError` on any proxy whatever the target. That is structural and
 * unfixable — hence `toObject()` at the boundary, and hence `io.parse` returning plain objects.
 *
 * ## Anything a proxy hands back is proxied
 *
 * Property reads, iteration, method return values, and the arguments a callback receives all come
 * back wrapped, so `rows.map(r => r.name)` works as readily as `rows.map(r => r.get('name'))` and a
 * write inside a `for..of` reaches the same node. Proxies are created on access and memoized per
 * node, so parsing 10,000 rows creates none, and `doc.data[0]` twice is the same object.
 */
import IOCollection from '../core/collection';
import IODocument from '../core/document';
import IOObject from '../core/internet-object';
import IOSection from '../core/section';
import IOSectionCollection from '../core/section-collection';

/** Reaches the core node behind a proxy. Present on every proxy this module makes. */
export const IO_NODE: unique symbol = Symbol.for('internet-object.node') as any;

/** One proxy per node, forever — so `doc.data[0] === doc.data[0]` and a loop allocates nothing. */
const proxies = new WeakMap<object, any>();

/** True for `"0"`, `"12"` — never `"01"`, `"-1"` or `"1.5"`. Numeric keys cannot collide with names. */
function indexOf(key: string): number {
  if (!/^(0|[1-9][0-9]*)$/.test(key)) return -1;
  return Number(key);
}

/** The node behind a proxy, or the value itself when it is not one. */
export function unwrap<T = any>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  return (value as any)[IO_NODE] ?? value;
}

/**
 * Puts a proxy on a core node, and hands everything else back untouched.
 *
 * A `Date`, a `Decimal`, an `ErrorNode` or a plain array is already the value the caller wants; only
 * the four container classes gain anything from being proxied.
 */
export function wrap(value: any): any {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof IOObject) return proxyRecord(value);
  if (value instanceof IOCollection) return proxyCollection(value);
  if (value instanceof IOSectionCollection) return proxySections(value);
  if (value instanceof IODocument) return proxyDocument(value);
  return value;
}

function memo<T extends object>(node: T, make: () => any): any {
  const existing = proxies.get(node);
  if (existing !== undefined) return existing;
  const made = make();
  proxies.set(node, made);
  return made;
}

/**
 * Reads a member off the node itself — a method or a plain property.
 *
 * Methods are returned as wrappers rather than bound originals so that the proxy boundary holds in
 * both directions: a proxy handed *in* (`rows.indexOf(rows[0])`) is unwrapped to its node, a
 * callback's parameters are wrapped on the way in, and whatever comes back is wrapped on the way
 * out. Without that, `rows.filter(r => r.age > 26)[0].name` would work for the filter and then fail
 * on the read.
 */
function member(node: any, key: PropertyKey): any {
  // `constructor` is a class, not a method to forward. Bound through the branch below it came back
  // as a FRESH arrow on every access, so `x.constructor === x.constructor` was false and any
  // same-type comparison failed. Handed back whole, a document and a section collection report the
  // class they already claim through `getPrototypeOf`. A record never reaches here for this key --
  // `plainMember` answers it from the plain target, which is the point of the plain target.
  if (key === 'constructor') return node.constructor;
  const value = node[key];
  if (typeof value !== 'function') return wrapResult(value);
  return (...args: any[]) => wrapResult(value.apply(node, args.map(lift)));
}

/** Callbacks see proxies; nodes passed back in are unwrapped. */
function lift(arg: any): any {
  if (typeof arg === 'function') return (...inner: any[]) => arg(...inner.map(wrap));
  return unwrap(arg);
}

/**
 * Wraps what a method hands back, iterators included.
 *
 * `for..of`, `entries()`, `values()` and `keys()` all hand back an iterator rather than a value, and
 * an iterator's elements never pass through {@link wrap} on their own. Re-yielding them is what
 * makes a write inside a loop reach the node rather than a bare record nobody is watching.
 */
function wrapResult(value: any): any {
  if (value !== null && typeof value === 'object'
      && typeof value.next === 'function' && typeof value[Symbol.iterator] === 'function') {
    return wrapIterator(value);
  }
  return wrap(value);
}

/** A tuple element is wrapped in place, so `entries()` keeps its `[key, value]` shape. */
function* wrapIterator(source: Iterable<any>): IterableIterator<any> {
  for (const item of source) yield Array.isArray(item) ? item.map(wrap) : wrap(item);
}

/**
 * True when the node's own class hierarchy defines `key` — anything above `Object.prototype`.
 *
 * A proxy over a plain target has to answer `constructor`, `toString` and `hasOwnProperty` from
 * `Object.prototype`, or `isPlainObject` and `x.constructor === Object` fail and the whole reason
 * for the plain target goes with them. Everything the IO class itself defines still wins.
 */
function definedOnNode(node: any, key: PropertyKey): boolean {
  // Every prototype carries an own `constructor`, so the walk below would always find the IO class
  // and report `IOObject` where the whole point is to report `Object`.
  if (key === 'constructor') return false;
  for (let o = node; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) {
    if (Object.prototype.hasOwnProperty.call(o, key)) return true;
  }
  return false;
}

/** A data miss on a plain-target proxy: the IO class first, then ordinary object behaviour. */
function plainMember(node: any, target: object, key: PropertyKey): any {
  return definedOnNode(node, key) ? member(node, key) : Reflect.get(target, key);
}

/** `{ enumerable, configurable }` is required, or spread disagrees with `ownKeys`. */
function dataDescriptor(value: any): PropertyDescriptor {
  return { value, enumerable: true, configurable: true, writable: true };
}

/**
 * The keys a record projects under, mirroring `IOObject.toObject()` exactly: the member's name where
 * it has one, its position where it does not.
 */
function recordKeys(node: IOObject<any>): string[] {
  const keys: string[] = [];
  node.forEach((value: any, key: string | undefined, index: number) => {
    if (typeof value === 'undefined') return;
    keys.push(key ?? String(index));
  });
  return keys;
}

/** The value a record exposes under `key`, or a miss when it holds no such member. */
function recordRead(node: IOObject<any>, key: string): { hit: boolean; value?: any } {
  if (node.has(key)) return { hit: true, value: node.get(key) };
  const index = indexOf(key);
  // A positional member answers to its position, and only then — a *keyed* member does not also
  // answer to `[0]`, because `toObject()` does not key it that way either.
  if (index !== -1 && node.keyAt(index) === undefined && node.getAt(index) !== undefined) {
    return { hit: true, value: node.getAt(index) };
  }
  return { hit: false };
}

/**
 * A record — the largest shadow surface in the library. `keys`, `values`, `length`, `get`, `set`,
 * `map` and `delete` are all plausible field names, and all of them resolve to the *field* when the
 * record has one, exactly as an own property shadows a prototype method on any object.
 * `io.node(rec).get('keys')` is the escape that cannot be shadowed.
 */
function proxyRecord<T>(node: IOObject<T>): any {
  return memo(node, () => new Proxy({} as any, {
    get(_t, key) {
      if (key === IO_NODE) return node;
      if (typeof key === 'symbol') return plainMember(node, _t, key);
      const read = recordRead(node, key as string);
      return read.hit ? wrap(read.value) : plainMember(node, _t, key);
    },
    set(_t, key, value) {
      if (typeof key === 'symbol') return false;
      // Delegated, never reimplemented: when `set()` starts validating (Tier B) the proxy inherits
      // it with no gap in between.
      node.set(key as string, unwrap(value));
      return true;
    },
    deleteProperty(_t, key) {
      if (typeof key === 'symbol') return false;
      node.delete(key as string);
      return true;
    },
    has(_t, key) {
      if (typeof key === 'symbol') return key in node;
      return recordRead(node, key as string).hit || key in node;
    },
    ownKeys: () => recordKeys(node),
    getOwnPropertyDescriptor(_t, key) {
      if (typeof key === 'symbol') return undefined;
      const read = recordRead(node, key as string);
      return read.hit ? dataDescriptor(wrap(read.value)) : undefined;
    },
  }));
}

/**
 * A collection — numeric index, modelled on Array. Numeric keys cannot collide with method names, so
 * this reintroduces none of the ambiguity R7 removed.
 */
function proxyCollection<T>(node: IOCollection<T>): any {
  const keys = () => Array.from({ length: node.length }, (_, i) => String(i));
  return memo(node, () => new Proxy({} as any, {
    get(_t, key) {
      if (key === IO_NODE) return node;
      if (typeof key === 'symbol') return plainMember(node, _t, key);
      const index = indexOf(key as string);
      if (index !== -1) return index < node.length ? wrap(node.getAt(index)) : undefined;
      return plainMember(node, _t, key);
    },
    set(_t, key, value) {
      if (typeof key === 'symbol') return false;
      const index = indexOf(key as string);
      if (index === -1) return false;
      node.setAt(index, unwrap(value));
      return true;
    },
    has(_t, key) {
      if (typeof key === 'symbol') return key in node;
      const index = indexOf(key as string);
      return index !== -1 ? index < node.length : key in node;
    },
    ownKeys: keys,
    getOwnPropertyDescriptor(_t, key) {
      if (typeof key === 'symbol') return undefined;
      const index = indexOf(key as string);
      if (index === -1 || index >= node.length) return undefined;
      return dataDescriptor(wrap(node.getAt(index)));
    },
  }));
}

/** The name a section is keyed under: its own, or its position when it has none. */
function sectionKeys(node: IOSectionCollection<any>): string[] {
  const keys: string[] = [];
  for (let i = 0; i < node.length; i++) keys.push(node.getAt(i)!.name ?? String(i));
  return keys;
}

/** The section stored under a name or a position, whichever `key` spells. */
function sectionAt(node: IOSectionCollection<any>, key: string): IOSection<any> | undefined {
  const named = node.get(key);
  if (named !== undefined) return named;
  const index = indexOf(key);
  return index === -1 ? undefined : node.getAt(index);
}

/**
 * A section collection. Property access yields the section's **data** — `doc.sections.employees[0]`
 * is the first record — while `io.section(doc, name)` yields the section object itself, with its
 * name, schema name and errors.
 */
function proxySections<T>(node: IOSectionCollection<T>): any {
  return memo(node, () => new Proxy({} as any, {
    getPrototypeOf: () => IOSectionCollection.prototype,
    get(_t, key) {
      if (key === IO_NODE) return node;
      if (typeof key === 'symbol') return member(node, key);
      const section = sectionAt(node, key as string);
      return section !== undefined ? wrap(section.data) : member(node, key);
    },
    has(_t, key) {
      if (typeof key === 'symbol') return key in node;
      return sectionAt(node, key as string) !== undefined || key in node;
    },
    ownKeys: () => sectionKeys(node),
    getOwnPropertyDescriptor(_t, key) {
      if (typeof key === 'symbol') return undefined;
      const section = sectionAt(node, key as string);
      return section !== undefined ? dataDescriptor(wrap(section.data)) : undefined;
    },
  }));
}

/**
 * A document.
 *
 * `doc.data` is not a special case: a document that names none of its sections has one called
 * `data` (the specification's rule, `the-structure/introduction/data.md`), so `doc.data` is simply
 * `doc.sections.data`, and is `undefined` on a document whose sections *are* named — where
 * `doc.sections.<name>` is the read that was meant.
 *
 * The document keeps no enumerable own keys, exactly as `IODocument` does today: `toObject()` is the
 * documented projection, and it unwraps a lone section in a way a key walk could not.
 */
export function proxyDocument(node: IODocument): any {
  return memo(node, () => new Proxy({} as any, {
    getPrototypeOf: () => IODocument.prototype,
    get(_t, key) {
      if (key === IO_NODE) return node;
      if (key === 'data') {
        const section = node.sections?.get('data');
        return section === undefined ? undefined : wrap(section.data);
      }
      return member(node, key);
    },
    has: (_t, key) => (key === 'data' ? node.sections?.get('data') !== undefined : key in node),
    ownKeys: () => [],
    getOwnPropertyDescriptor: () => undefined,
  }));
}
