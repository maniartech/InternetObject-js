import Header             from "./header";
import Section            from "./section";
import SectionCollection  from "./section-collection";

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

    let data:any = null

    // Only one section
    if (sectionsLen === 1) {
      const section = this._sections?.get(0) as Section
      data = section.toObject()
    }

    // More than one section
    else {
      data = {}
      for (let i=0; i<sectionsLen; i++) {
        const section = this._sections?.get(i) as Section
        data[section.name as string] = section.toObject()
      }
    }

    if (this.header.definitions?.length) {
      const header:any = {}
      const defs = this.header.definitions
      for (let i=0; i<defs.length; i++) {
        const def = defs.at(i)
        if (def.value.isSchema) {
          continue
        }

        header[def.key] = def.value.value
      }

      if (Object.keys(header).length) {
        return {
          header,
          data
        }
      }
    }

    return data
  }
}

export default Document;
