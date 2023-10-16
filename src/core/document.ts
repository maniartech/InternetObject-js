import Header from "./header";
import SectionCollection from "./section-collection";


class Document {
  private _header: Header
  private _sections: SectionCollection

  constructor() {
    this._header = new Header();
    this._sections = new SectionCollection();
  }

  public get header(): Header {
    return this._header;
  }

  public get sections(): SectionCollection{
    return this._sections;
  }
}

export default Document;
