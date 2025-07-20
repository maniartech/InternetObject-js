
import IOSection from "./section";

class IOSectionCollection<T = any> {
  private _sections: Array<IOSection<T>> = [];
  private _sectionNames: { [key: string]: number } = {};

  // Support index access
  [key: string]: any;

  constructor() {
    return new Proxy(this, proxy);
  }

  public get sections(): Array<IOSection<T>> {
    return this._sections;
  }

  public get length(): number {
    return this._sections.length;
  }

  public get(nameOrIndex: string | number): IOSection<T> | undefined {
    if (typeof nameOrIndex === 'string') {
      const index = this._sectionNames[nameOrIndex];
      if (index === undefined) {
        return undefined;
      }
      return this._sections[index];
    }
    return this._sections[nameOrIndex];
  }

  public push(section: IOSection<T>) {
    if (section.name !== undefined) {
      this._sectionNames[section.name] = this._sections.length;
    }
    this._sections.push(section);
  }

  /**
   * Makes the IOSectionCollection iterable, yielding key-value pairs.
   */
  *[Symbol.iterator]() {
    for (const section of this._sections) {
      yield section;
    }
  }
}

const proxy = {
  get: (target: IOSectionCollection<any>, property: string | symbol) => {
    if (property in target) {
      return Reflect.get(target, property);
    }
    if (typeof property === 'string') {
      if (/^[0-9]+$/.test(property)) {
        return target.get(Number(property));
      }
      return target.get(property);
    }
  },
  set: (target: IOSectionCollection<any>, property: string | number | symbol, value: any) => {
    throw new Error('Cannot set a value on a IOSectionCollection');
  }
};

export default IOSectionCollection;
