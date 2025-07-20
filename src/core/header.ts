
import Schema from "../schema/schema";
import IODefinitions from './definitions';

class IOHeader {
  private _schema: Schema | null = null;
  private _definitions: IODefinitions;

  constructor() {
    this._definitions = new IODefinitions();
  }

  get schema(): Schema | null {
    return this._schema || this._definitions.defaultSchema;
  }

  set schema(value: Schema | null) {
    this._schema = value;
  }

  get definitions(): IODefinitions {
    return this._definitions;
  }

  merge(other: IOHeader, override: boolean = false) {
    if (override && other.schema) {
      this._schema = other.schema;
    }
    if (other.definitions) {
      // Merge all keys from other.definitions into this.definitions
      for (const key of other.definitions.keys) {
        const value = other.definitions.getV(key);
        if (override || typeof this._definitions.getV(key) === 'undefined') {
          this._definitions.set(key, value);
        }
      }
    }
  }

  toJSON() {
    return this._definitions.toJSON();
  }
}

export default IOHeader;
