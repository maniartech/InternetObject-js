
import IOCollection from "./collection";
import IOObject from "./internet-object";

class IOSection<T = any> {
  private _data: IOCollection<T> | IOObject<T> | null;
  private _name?: string;
  private _schemaName?: string;

  constructor(data: any, name?: string, _schemaName?: string) {
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

  public get data(): IOCollection<T> | IOObject<T> | null {
    return this._data;
  }

  public toJSON(options?: { skipErrors?: boolean }): any {
    // IOObject
    if (this._data instanceof IOObject) {
      return this._data.toJSON();
    }
    // IOCollection
    else if (this._data instanceof IOCollection) {
      return this._data.toJSON(options);
    }
    // Plain object
    else if (this._data && typeof this._data === 'object') {
      return this._data;
    }
    return null;
  }
}

export default IOSection;