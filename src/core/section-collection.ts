import Section from "./section";

class SectionCollection<T = any> {
  private _sections: Array<Section<T>> = [];
  private _sectionNames: { [key: string]: number } = {};

  // Support index access
  [key: string]: any

  constructor() {
    return new Proxy(this, proxy);
  }

  public get sections(): Array<Section> {
    return this._sections;
  }

  public get length(): number {
    return this._sections.length;
  }

  public get(nameOrIndex: string | number): Section<T> | undefined {
    if (typeof nameOrIndex === 'string') {
      const index = this._sectionNames[nameOrIndex];
      if (index === undefined) {
        return undefined;
      }
      return this._sections[index];
    }

    return this._sections[nameOrIndex];
  }

  public push(section: Section<T>) {
    if (section.name !== undefined) {
      this._sectionNames[section.name] = this._sections.length;
    }
    this._sections.push(section);
  }

  /**
   * Makes the SectionCollection iterable, yielding key-value pairs.
   */
  *[Symbol.iterator]() {
    for (const section of this._sections) {
      yield section;
    }
  }
}

const proxy = {
  get: (target: SectionCollection<any>, property: string | symbol) => {
    // If the property is a member of the InternetObject, return it
    if (property in target) {
      return Reflect.get(target, property);
    }

    if (typeof property === 'string') {
      // If the property is a number, get the value at that index
      if (/^[0-9]+$/.test(property)) {
        return target.get(Number(property));
      }

      // Return the string-keyed value
      return target.get(property);
    }
  },

  set: (target: SectionCollection<any>, property: string | number | symbol, value: any) => {
    throw new Error('Cannot set a value on a SectionCollection');
  }
}

export default SectionCollection;
