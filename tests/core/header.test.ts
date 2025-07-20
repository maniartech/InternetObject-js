import IOHeader from '../../src/core/header';
import IODefinitions from '../../src/core/definitions';

describe('IOHeader', () => {
  it('should store and return schema and definitions', () => {
    const header = new IOHeader();
    expect(header.schema).toBeNull();
    expect(header.definitions).toBeInstanceOf(IODefinitions);
  });

  it('should merge definitions from another header', () => {
    const header1 = new IOHeader();
    const header2 = new IOHeader();
    header2.definitions.set('key', 'value');
    header1.merge(header2);
    expect(header1.definitions.getV('key')).toBe('value');
  });

  it('should serialize to JSON correctly', () => {
    const header = new IOHeader();
    header.definitions.set('key', 'value');
    expect(header.toJSON()).toEqual({ key: 'value' });
  });
});
