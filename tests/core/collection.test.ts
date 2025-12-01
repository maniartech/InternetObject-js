
import IOCollection from '../../src/core/collection';

describe('IOCollection', () => {
  describe('Basic Properties', () => {
    it('should return correct length for empty and non-empty collections', () => {
      const col = new IOCollection<number>();
      expect(col.length).toBe(0);
      col.push(1);
      expect(col.length).toBe(1);
      col.push(2, 3);
      expect(col.length).toBe(3);
    });
    it('should report isEmpty correctly', () => {
      const empty = new IOCollection();
      const nonEmpty = new IOCollection([1]);
      expect(empty.isEmpty).toBe(true);
      expect(nonEmpty.isEmpty).toBe(false);
    });
  });

  describe('Iteration and Access', () => {
    it('should support iteration and accessors', () => {
      const col = new IOCollection<number>([1, 2, 3]);
      const values: number[] = [];
      for (const value of col) {
        values.push(value);
      }
      expect(values).toEqual([1, 2, 3]);
      expect(col.getAt(1)).toBe(2);
    });
    it('should provide entries() iterator', () => {
      const col = new IOCollection([10, 20, 30]);
      const entries = [...col.entries()];
      expect(entries).toEqual([[0, 10], [1, 20], [2, 30]]);
    });
    it('should provide keys() iterator', () => {
      const col = new IOCollection([10, 20, 30]);
      const keys = [...col.keys()];
      expect(keys).toEqual([0, 1, 2]);
    });
    it('should provide values() iterator', () => {
      const col = new IOCollection([10, 20, 30]);
      const values = [...col.values()];
      expect(values).toEqual([10, 20, 30]);
    });
  });

  describe('Mutators', () => {
    it('should support setAt and deleteAt', () => {
      const col = new IOCollection<number>([1, 2, 3]);
      col.setAt(1, 42);
      expect(col.getAt(1)).toBe(42);
      col.deleteAt(0);
      expect(col.length).toBe(2);
      expect(col.getAt(0)).toBe(42);
    });
    it('should support pop()', () => {
      const col = new IOCollection([1, 2, 3]);
      const popped = col.pop();
      expect(popped).toBe(3);
      expect(col.length).toBe(2);
      expect([...col]).toEqual([1, 2]);
    });
    it('should support insert()', () => {
      const col = new IOCollection([1, 3]);
      col.insert(1, 2);
      expect([...col]).toEqual([1, 2, 3]);
    });
  });

  describe('Functional Methods', () => {
    it('should map values to new IOCollection', () => {
      const col = new IOCollection([1, 2, 3]);
      const result = col.map(v => v * 2);
      expect(result).toBeInstanceOf(IOCollection);
      expect([...result]).toEqual([2, 4, 6]);
    });
    it('should filter values', () => {
      const col = new IOCollection([1, 2, 3, 4]);
      const filtered = col.filter(v => v % 2 === 0);
      expect(filtered.length).toBe(2);
      expect([...filtered]).toEqual([2, 4]);
    });
    it('should reduce values', () => {
      const col = new IOCollection([1, 2, 3, 4]);
      const sum = col.reduce((acc, v) => acc + v, 0);
      expect(sum).toBe(10);
    });
    it('should find value', () => {
      const col = new IOCollection([1, 2, 3, 4]);
      const found = col.find(v => v > 2);
      expect(found).toBe(3);
    });
    it('should find index', () => {
      const col = new IOCollection([1, 2, 3, 4]);
      const index = col.findIndex(v => v > 2);
      expect(index).toBe(2);
    });
    it('should return -1 when findIndex has no match', () => {
      const col = new IOCollection([1, 2]);
      const index = col.findIndex(v => v > 100);
      expect(index).toBe(-1);
    });
    it('should support some()', () => {
      const col = new IOCollection([1, 2, 3]);
      expect(col.some(v => v === 2)).toBe(true);
      expect(col.some(v => v === 99)).toBe(false);
    });
    it('should support every()', () => {
      const col = new IOCollection([2, 4, 6]);
      expect(col.every(v => v % 2 === 0)).toBe(true);
      expect(col.every(v => v > 2)).toBe(false);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const col = new IOCollection<number>([1, 2]);
      expect(col.toJSON()).toEqual([1, 2]);
    });
    it('should serialize nested IOCollections', () => {
      const inner = new IOCollection([10, 20]);
      const outer = new IOCollection([inner, 99]);
      const json = JSON.stringify(outer);
      expect(JSON.parse(json)).toEqual([[10, 20], 99]);
    });
  });
});
