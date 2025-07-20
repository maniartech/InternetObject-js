import IODefinitions from '../../src/core/definitions';

describe('IODefinitions', () => {
  it('should set and get variable values', () => {
    const defs = new IODefinitions();
    defs.set('@var', 123);
    expect(defs.getV('@var')).toBe(123);
  });

  it('should merge definitions', () => {
    const defs1 = new IODefinitions();
    const defs2 = new IODefinitions();
    defs2.set('@var', 456);
    defs1.merge(defs2);
    expect(defs1.getV('@var')).toBe(456);
  });

  it('should serialize to JSON correctly', () => {
    const defs = new IODefinitions();
    defs.set('key', 'value');
    expect(defs.toJSON()).toEqual({ key: 'value' });
  });
});
