import Schema       from "../schema/schema";
import Definitions  from './definitions';

class Header {
  private _schema: Schema | null = null;
  private _definitions: Definitions;

  constructor() {
    this._definitions = new Definitions();
  }

  get schema(): Schema | null {
    return this._schema || this._definitions.defaultSchema;
  }

  set schema(value: Schema | null) {
    this._schema = value;
  }

  get definitions(): Definitions | null {
    return this._definitions;
  }

}



export default Header;
