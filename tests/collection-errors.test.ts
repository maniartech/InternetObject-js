import { loadCollection } from '../src/facade/load';
import { compileSchema } from '../src/schema';
import Definitions from '../src/core/definitions';

describe('IOCollection Errors', () => {
  it('should embed errors in the collection', () => {
    const schema = compileSchema('$schema', '{ name: string, age: number }');
    const defs = new Definitions();
    defs.push('$schema', schema, true);

    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 'invalid' }
    ];

    const collection = loadCollection(data, defs);

    expect(collection.length).toBe(2);
    expect(collection.errors.length).toBe(1);
    expect(collection.errors[0].message).toContain('invalid-type');
    expect((collection.errors[0] as any).collectionIndex).toBe(1);
  });

  it('should still support external error collector', () => {
    const schema = compileSchema('$schema', '{ name: string, age: number }');
    const defs = new Definitions();
    defs.push('$schema', schema, true);

    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 'invalid' }
    ];

    // loadCollection doesn't throw by default, errors are embedded in collection
    const collection = loadCollection(data, defs);

    expect(collection.length).toBe(2);
    expect(collection.errors.length).toBe(1);
    // Errors are collected in collection.errors, not external array
    expect(collection.errors[0].message).toContain('invalid-type');
  });
});
