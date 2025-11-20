
import IOHeader from "./header";
import IOSection from "./section";
import IOSectionCollection from "./section-collection";
import IOCollection from "./collection";

class IODocument {
  private _header: IOHeader;
  private _sections: IOSectionCollection | null;
  private _ownErrors: Error[] = []; // Accumulated errors during parsing

  constructor(header: IOHeader, sections: IOSectionCollection | null, errors: Error[] = []) {
    this._header = header;
    this._sections = sections;
    this._ownErrors = errors;
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
    }
  }

  /**
   * Converts the data sections into a JavaScript object.
   * @param options Optional configuration for JSON conversion
   * @param options.skipErrors If true, excludes error objects from collections (default: false)
   */
  public toJSON(options?: { skipErrors?: boolean }): any {
    const sectionsLen = this._sections?.length || 0;
    let data: any = null;

    if (sectionsLen === 1) {
      const section = this._sections?.get(0) as IOSection;
      data = section.toJSON(options);
    } else if (sectionsLen > 1) {
      data = {};
      for (let i = 0; i < sectionsLen; i++) {
        const section = this._sections?.get(i) as IOSection;
        data[section.name as string] = section.toJSON(options);
      }
    }

    // Only return header+data if header has non-empty definitions
    const headerObject = this.header.toJSON();
    if (headerObject && Object.keys(headerObject).length > 0) {
      return {
        header: headerObject,
        data,
      };
    }

    return data;
  }

  /**
   * Alias for toJSON() method for backward compatibility
   * @param options Optional configuration for JSON conversion
   */
  public toObject(options?: { skipErrors?: boolean }): any {
    return this.toJSON(options);
  }
}

export default IODocument;
