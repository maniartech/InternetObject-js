import { toJSONValue } from '../utils/json-projection';
import IOHeader from "./header";
import IOSection from "./section";
import IOSectionCollection from "./section-collection";
import Revision, { touch } from './revision';
import { stringifyDocument } from '../facade/stringify-document';

/**
 * IODocument represents a complete Internet Object document.
 *
 * A document consists of:
 * - A header containing schema definitions, variables, and metadata
 * - Zero or more data sections, each optionally named and schema-bound
 * - Accumulated parsing and validation errors
 *
 * Features:
 * - Aggregates errors from all sections for single-pass diagnostics
 * - JSON serialization with optional header output
 * - Schema-aware section management
 *
 * @example
 * ```typescript
 * const doc = parse(`
 *   ~ $person: {name: string, age: int}
 *   ---
 *   ~ Alice, 30
 *   ~ Bob, 25
 * `);
 *
 * console.log(doc.toJSON());
 * // [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]
 *
 * if (doc.errors.length > 0) {
 *   console.error('Parsing errors:', doc.errors);
 * }
 * ```
 */
class IODocument {
  private _header!: IOHeader;
  private _sections!: IOSectionCollection | null;
  private _ownErrors!: Error[]; // Accumulated errors during parsing
  /**
   * The shared change counter for this document, once somebody has subscribed (§8).
   *
   * Created by `io.subscribe` and stamped onto every container underneath, so a write anywhere
   * reaches the same listeners without anything carrying a parent pointer. `undefined` until then.
   *
   * @internal
   */
  _revision?: Revision;

  constructor(header: IOHeader, sections: IOSectionCollection | null, errors: Error[] = []) {
    // Non-enumerable, matching IOObject: plain assignment would make these own enumerable keys, and
    // `{ ...doc }` would hand back `{ _header, _sections, _ownErrors }` — internals, where a caller
    // expected data. Accessors (`header`, `sections`, `errors`) are unaffected.
    const hidden = { writable: true, enumerable: false, configurable: false };
    Object.defineProperty(this, '_header', { value: header, ...hidden });
    Object.defineProperty(this, '_sections', { value: sections, ...hidden });
    Object.defineProperty(this, '_ownErrors', { value: errors, ...hidden });
    Object.defineProperty(this, '_revision', { value: undefined, writable: true, enumerable: false, configurable: true });
  }

  public get header(): IOHeader {
    return this._header;
  }

  public get sections(): IOSectionCollection | null {
    return this._sections;
  }

  /**
   * Returns all errors accumulated during parsing and validation.
   * This enables IDEs and tools to show all diagnostics in one pass.
   *
   * @returns A defensive copy of the errors array to prevent external mutation
   */
  public get errors(): Error[] {
    const aggregatedErrors = [...this._ownErrors];
    if (this._sections) {
      for (const section of this._sections) {
        aggregatedErrors.push(...section.errors);
      }
    }
    return aggregatedErrors;
  }

  /**
   * Returns all errors accumulated during parsing and validation.
   * This enables IDEs and tools to show all diagnostics in one pass.
   *
   * @returns A defensive copy of the errors array to prevent external mutation
   */
  public getErrors(): ReadonlyArray<Error> {
    return this.errors;
  }

  /**
   * Adds validation errors to the document.
   * This method is package-private and should only be called by the parser.
   *
   * @internal
   * @param errors - Array of validation errors to append
   */
  public addErrors(errors: Error[]): void {
    if (errors.length > 0) {
      this._ownErrors.push(...errors);
      touch(this);
    }
  }

  /**
   * The document as Internet Object text — so `String(doc)` and `` `${doc}` `` round-trip.
   *
   * Without this they gave `"[object Object]"`, which is the default `Object.prototype.toString`
   * and tells a reader nothing. A document knows how to write itself; asking it to, in the one
   * spelling JavaScript reserves for exactly that question, should not need a named function.
   *
   * ```ts
   * const doc = io.parseDocument('name: string, age: int
---
~ Alice, 30');
   * String(doc);                       // 'name: string, age: int
---
~ Alice, 30'
   * io.parseDocument(String(doc));     // the same document again
   * ```
   *
   * **It throws when the document holds a failed record** (B3, `forbidden-error-node`) — a
   * projection may describe errors, a file may not contain them. `stringifyDocument(doc,
   * { skipErrors: true })` writes the records that validated. `console.log` is unaffected: it uses
   * the inspector below, not this.
   */
  public toString(): string {
    return stringifyDocument(this);
  }

  /**
   * Return a clean object for nodejs console logging.
   */
  [Symbol.for('nodejs.util.inspect.custom')]() {
    return {
      header: this._header,
      sections: this._sections,
      ...(this._ownErrors.length > 0 ? { errors: this._ownErrors } : {})
    }
  }

  /**
   * Converts the data sections into a JavaScript object.
   * @param options Optional configuration for object conversion
   * @param options.skipErrors If true, excludes error objects from collections (default: false)
   */
  public toObject(options?: { skipErrors?: boolean }): any {
    const sectionsLen = this._sections?.length || 0;
    let data: any = null;

    if (sectionsLen === 1) {
      const section = this._sections?.get(0) as IOSection;
      data = section.toObject(options);
    } else if (sectionsLen > 1) {
      data = {};
      for (let i = 0; i < sectionsLen; i++) {
        const section = this._sections?.get(i) as IOSection;
        data[section.name as string] = section.toObject(options);
      }
    }

    // Only return header+data if header has non-empty definitions
    const headerObject = this.header.toObject();
    if (headerObject && Object.keys(headerObject).length > 0) {
      return {
        header: headerObject,
        data,
      };
    }

    return data;
  }

  /**
   * Converts to JSON — the same data as {@link toObject}, with every value spelled the way JSON
   * can carry it (dates as ISO strings, decimals and bigints as strings, binary as base64), all
   * the way down. See `toJSONValue`.
   */
  public toJSON(options?: { skipErrors?: boolean }): any {
    return toJSONValue(this.toObject(options));
  }
}

export default IODocument;
