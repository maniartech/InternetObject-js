

class Definitions {
  private _definitions: {[key: string]: any} = {};

  constructor() {
    return new Proxy(this, proxy);
  }

  public get length(): number {
    return Object.keys(this._definitions).length;
  }

  public get keys(): string[] {
    return Object.keys(this._definitions);
  }

}

const proxy = {
  get: (target: Definitions, property: string | symbol) => {
    // If the property is a member of the InternetObject, return it
    return Reflect.get(target, property);
  }
}

export default Definitions;