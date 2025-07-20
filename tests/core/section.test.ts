import IOSection from '../../src/core/section';
import IOCollection from '../../src/core/collection';
import IOObject from '../../src/core/internet-object';

describe('IOSection', () => {
  it('should store and return name, schemaName, and data', () => {
    const data = new IOCollection<number>([1, 2, 3]);
    const section = new IOSection(data, 'section1', 'schema1');
    expect(section.name).toBe('section1');
    expect(section.schemaName).toBe('schema1');
    expect(section.data).toBe(data);
  });

  it('should serialize to JSON correctly for IOObject', () => {
    const obj = new IOObject({ a: 1, b: 2 });
    const section = new IOSection(obj, 'section2');
    expect(section.toJSON()).toEqual({ a: 1, b: 2 });
  });

  it('should serialize to JSON correctly for IOCollection', () => {
    const col = new IOCollection<number>([1, 2]);
    const section = new IOSection(col, 'section3');
    expect(Array.isArray(section.toJSON())).toBe(true);
    expect(section.toJSON()).toEqual([1, 2]);
  });

  it('should return null for toJSON if data is null', () => {
    const section = new IOSection(null, 'section4');
    expect(section.toJSON()).toBeNull();
  });
});
