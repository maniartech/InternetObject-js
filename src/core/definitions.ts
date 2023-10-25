

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

  /**
   * Gets the varialbe value. This function is intend to be used internally
   * for quickly fetching the variable value, hence it accepts any key to keep the
   * consumer code free from type checking. The function validate the key and
   * returns the associated value, if avialable. Otherwise returns undefined.
   * @param key {any} The varialbe key starting with $
   * @returns The value associated with the variable
   */
  public getV(key: any) {
    if (typeof key === 'string' && key.startsWith('$') && key.length > 1) {
      return this._definitions[key.substring(1)];
    }
  }


}

const proxy = {
  get: (target: Definitions, property: string | symbol) => {
    // If the property is a member of the InternetObject, return it
    return Reflect.get(target, property);
  }
}

export default Definitions;