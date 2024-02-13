import {
  ioDocument,
  ioDefinitions,
} from '../src/';

describe('IO Namescpae', () => {

  test('should be able to parse the document', () => {

    const doc = ioDocument`
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

  test('should be able to parse the object', () => {
    const defs = ioDefinitions`
      name, age, address: { street, city, zip }
    `;

    if (!defs) {
      throw new Error('Defs is null');
    }

    const obj = ioDocument.with(defs)`
      John, 30, { ${123} Main St, Springfield, 12345 }
    `;

    expect(obj.toObject()).toEqual({
      name: 'John',
      age: 30,
      address: { street: '123 Main St', city: 'Springfield', zip: 12345 }
    });
  });
})