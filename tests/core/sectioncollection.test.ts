import IOSectionCollection from '../../src/core/section-collection';
import IOSection from '../../src/core/section';

describe('IOSectionCollection', () => {
  it('should return correct length for empty and non-empty collections', () => {
    const col = new IOSectionCollection();
    expect(col.length).toBe(0);
    col.push(new IOSection('data1'));
    expect(col.length).toBe(1);
    col.push(new IOSection('data2'));
    expect(col.length).toBe(2);
  });

  it('should support iteration and accessors', () => {
    const col = new IOSectionCollection();
    col.push(new IOSection('data1', 'section1'));
    col.push(new IOSection('data2', 'section2'));
    const names: (string | undefined)[] = [];
    for (const section of col) {
      names.push(section.name);
    }
    expect(names).toEqual(['section1', 'section2']);
    expect(col.get('section1')?.name).toBe('section1');
    expect(col.get(1)?.name).toBe('section2');
  });

  it('should serialize to JSON correctly (if implemented)', () => {
    const col = new IOSectionCollection();
    col.push(new IOSection('data1', 'section1'));
    col.push(new IOSection('data2', 'section2'));
    if (typeof col.toJSON === 'function') {
      expect(typeof col.toJSON()).toBe('object');
    }
  });
});
