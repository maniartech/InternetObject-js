import Section from "./sections";

class SectionCollection<T = any> {
  private _sections: Array<Section<T>> = [];

  constructor() {
    return new Proxy(this, proxy);
  }

  public get sections(): Array<Section> {
    return this._sections;
  }

  public get length(): number {
    return this._sections.length;
  }

  public get(index: number): Section<T> | undefined {
    return this._sections[index];
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
    return Reflect.get(target, property);
  }
}

export default SectionCollection;