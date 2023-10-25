import InternetObject from './internet-object';

class Collection<T = InternetObject> {
  _items: T[] | null = null;

  public push(item: T): Collection<T> {
    if (!this._items) {
      this._items = [];
    }

    this._items.push(item);
    return this;
  }

  public get length(): number {
    return this._items?.length || 0;
  }

  public toObject(): any {
    return this._items?.map((item) => {
      if (item instanceof InternetObject) {
        return item.toObject();
      }

      // Unsupported type
      throw new Error('Invalid item type.');
    });
  }
}

export default Collection;
