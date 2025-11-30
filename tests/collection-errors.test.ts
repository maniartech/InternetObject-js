import io from '../src/facade';

describe('IOCollection Errors', () => {
  it('should embed errors in the collection', () => {
    const schema = '{ name: string, age: number }';
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 'invalid' }
    ];

    const collection = io.loadObject(data, schema);

    expect(collection.length).toBe(2);
    expect(collection.errors.length).toBe(1);
    expect(collection.errors[0].message).toContain('invalid-type');
    expect((collection.errors[0] as any).collectionIndex).toBe(1);
  });

  it('should still support external error collector', () => {
    const schema = '{ name: string, age: number }';
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 'invalid' }
    ];
    const errors: any[] = [];

    const collection = io.loadObject(data, schema, undefined, errors);

    expect(collection.length).toBe(2);
    expect(collection.errors.length).toBe(1);
    expect(errors.length).toBe(1);
    expect(errors[0]).toBe(collection.errors[0]);
  });
});
