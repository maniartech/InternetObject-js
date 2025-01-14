import Collection     from "./collection";
import InternetObject from "./internet-object";

class Section<T  = any> {
  private _data: Collection<T> | InternetObject<T> | null;
  private _name?: string;
  private _schemaName?: string;

  constructor(data:any, name?: string, _schemaName?: string) {
    this._data = data;
    this._name = name;
    this._schemaName = _schemaName;
  }

  public get name(): string | undefined {
    return this._name;
  }

  public get schemaName(): string | undefined {
    return this._schemaName;
  }

  public get data(): Collection<T> | InternetObject<T> | null {
    return this._data;
  }

  public toJSON(): any {

    // Internet Object
    if (this._data instanceof InternetObject) {
      return this._data.toJSON();
    }

    // Collection
    else if (this._data instanceof Collection) {
      return this._data.toJSON();
    }

    return null;
  }

}

export default Section;