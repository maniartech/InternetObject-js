import IOCollection from '../../src/core/collection';

describe('IOCollection', () => {
  it('should return correct length for empty and non-empty collections', () => {
    const col = new IOCollection<number>();
    expect(col.length).toBe(0);
    col.push(1);
    expect(col.length).toBe(1);
    col.push(2, 3);
    expect(col.length).toBe(3);
  });

  it('should support iteration and accessors', () => {
    const col = new IOCollection<number>([1, 2, 3]);
    const values: number[] = [];
    for (const value of col) {
      values.push(value);
    }
    expect(values).toEqual([1, 2, 3]);
    expect(col.getAt(1)).toBe(2);
  });

  it('should support mutators and deletion', () => {
    const col = new IOCollection<number>([1, 2, 3]);
    col.setAt(1, 42);
    expect(col.getAt(1)).toBe(42);
    col.deleteAt(0);
    expect(col.length).toBe(2);
    expect(col.getAt(0)).toBe(42);
  });

  it('should serialize to JSON correctly', () => {
    const col = new IOCollection<number>([1, 2]);
    expect(col.toJSON()).toEqual([1, 2]);
  });
});
