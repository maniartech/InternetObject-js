import Header from "./header";
import Section from "./section";
import SectionCollection from "./section-collection";


class Document {
  private _header: Header;
  private _sections: SectionCollection | null;

  constructor(header: Header, sections: SectionCollection | null) {
    this._header = header
    this._sections = sections
  }

  public get header(): Header{
    return this._header;
  }

  public get sections(): SectionCollection | null{
    return this._sections;
  }

  /**
   * Conerts the data sections into a JavaScript object.
   */
  public toObject(): any {
    const sectionsLen = this._sections?.length || 0


    // Only one section
    if (sectionsLen === 1) {
      const section = this._sections?.get(0) as Section
      return section.toObject()
    }

    // Multiple sections
    if (sectionsLen > 1) {
      const result: any = {}
      for (let i=0; i<sectionsLen; i++) {
        const section = this._sections?.get(i) as Section
        result[section.name as string] = section.toObject()
      }
      return result
    }

    // No sections
    return null
  }
}

export default Document;
