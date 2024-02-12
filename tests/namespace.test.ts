import iosf from '../src/index';


describe('IO Namescpae', () => {

  test('should be able to parse the document', () => {
    const doc = iosf.doc`
      name, age, address: { street, city, zip }
      ---
      John, 30, { ${123} Main St, Springfield, 12345 }
    `;

    expect(doc).toBeDefined();
    expect(doc.toObject()).toEqual({
      name: 'John',
      age: 30,
      address: { street: '123 Main St', city: 'Springfield', zip: 12345 }
    });
  });
})