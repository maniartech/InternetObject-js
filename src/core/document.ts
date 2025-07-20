
import IOHeader from "./header";
import IOSection from "./section";
import IOSectionCollection from "./section-collection";

class IODocument {
  private _header: IOHeader;
  private _sections: IOSectionCollection | null;

  constructor(header: IOHeader, sections: IOSectionCollection | null) {
    this._header = header;
    this._sections = sections;
  }

  public get header(): IOHeader {
    return this._header;
  }

  public get sections(): IOSectionCollection | null {
    return this._sections;
  }

  /**
   * Converts the data sections into a JavaScript object.
   */
  public toJSON(): any {
    const sectionsLen = this._sections?.length || 0;
    let data: any = null;

    if (sectionsLen === 1) {
      const section = this._sections?.get(0) as IOSection;
      data = section.toJSON();
    } else if (sectionsLen > 1) {
      data = {};
      for (let i = 0; i < sectionsLen; i++) {
        const section = this._sections?.get(i) as IOSection;
        data[section.name as string] = section.toJSON();
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
   */
  public toObject(): any {
    return this.toJSON();
  }
}

export default IODocument;
