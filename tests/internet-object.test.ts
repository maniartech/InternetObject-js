import InternetObject from '../src/core/internet-object';

describe('InternetObject', () => {

  test('should create an InternetObject from an object passed to constructor', () => {
    const object = { key1: 'value1', key2: 'value2' };
    const io = new InternetObject();
    io.set('key1', 'value1');
    io.set('key2', 'value2');

    expect(io.get('key1')).toBe('value1');
    expect(io.get('key2')).toBe('value2');
  });

  test('should return empty InternetObject when no object is passed to constructor', () => {
    const io = new InternetObject();
    expect(io.isEmpty()).toBe(true);
  });

  test('should create an InternetObject from an array of key-value pairs using "fromArray" static method', () => {
    const io = InternetObject.fromArray([
      ['key1', 'value1'],
      ['key2', 'value2']
    ]);
    expect(io.get('key1')).toBe('value1');
    expect(io.get('key2')).toBe('value2');
  });

  test('should set and get using a key', () => {
    const io = new InternetObject();
    io.set('key', 'value');
    expect(io.get('key')).toBe('value');
  });

  test('should set and get using a numeric key', () => {
    const io = new InternetObject();
    io.set('1', 'value');
    expect(io.get('1')).toBe('value');
  });

  test('should overwrite existing value', () => {
    const io = new InternetObject();
    io.set('key', 'value1');
    io.set('key', 'value2');
    expect(io.get('key')).toBe('value2');
  });

  test('should push values without keys', () => {
    const io = new InternetObject();
    io.push('value1', 'value2');
    expect(io.getAt(0)).toBe('value1');
    expect(io.getAt(1)).toBe('value2');
  });

  test('should push values with keys', () => {
    const io = new InternetObject();
    io.push(['key1', 'value1'], ['key2', 'value2']);
    expect(io.get('key1')).toBe('value1');
    expect(io.get('key2')).toBe('value2');
  });

  test('should throw error for duplicate keys on push', () => {
    const io = new InternetObject();
    io.set('key1', 'value1');
    expect(() => {
        io.push(['key1', 'value2']);
    }).toThrow(`Key 'key1' already exists`);
  });

  test('should return length', () => {
    const io = new InternetObject();
    io.set('key1', 'value1');
    io.set('key2', 'value2');
    expect(io.length).toBe(2);
  });

  test('should throw error for invalid setAt index', () => {
    const io = new InternetObject();
    expect(() => {
        io.setAt(0, 'value');
    }).toThrow('Index out of range');
  });

  test('should return undefined for getAt at invalid index', () => {
    const io = new InternetObject();
    expect(io.getAt(0)).toBeUndefined();
  });

  test('should delete a key-value pair', () => {
    const io = new InternetObject();
    io.set('key', 'value');
    io.delete('key');
    expect(io.get('key')).toBeUndefined();
  });

  test('should return undefined for non-existing key', () => {
    const io = new InternetObject();
    expect(io.get('nonExisting')).toBeUndefined();
  });

  test('should return all keys', () => {
    const io = new InternetObject();
    io.set('key1', 'value1');
    io.set('key2', 'value2');
    expect(io.keysArray()).toEqual(['key1', 'key2']);
  });

  test('should be able to iterate', () => {
    const io = new InternetObject();
    io.set('key1', 'value1');
    io.set('key2', 'value2');

    const entries = Array.from(io);
    expect(entries).toEqual([
      ['key1', 'value1'],
      ['key2', 'value2']
    ]);
  });

  // test('should set and get using proxy', () => {
  //   const io = new InternetObject();
  //   io.key = 'value';
  //   const val = io.key;
  //   expect('value').toBe('value');
  // });

  test('should set and get using index through proxy', () => {
    const io = new InternetObject();
    // expect the error to be thrown
    expect(() => {
      io.setAt(0, 'value');
    }).toThrowError();
  });

  // test('should delete using proxy', () => {
  //   const io = new InternetObject();
  //   io.key = 'value';
  //   // delete io.key;
  //   io.delete('key');
  //   console.log(io, io.key);
  //   expect(io.key).toBeUndefined();
  // });

  test('should delete a key-value pair using index', () => {
    const io = new InternetObject();
    io.push('value');
    io.deleteAt(0);
    expect(io.getAt(0)).toBeUndefined();
  });

  test('should return true if key exists using "has" method', () => {
    const io = new InternetObject();
    io.set('key', 'value');
    expect(io.has('key')).toBe(true);
  });

  test('should return false if key does not exist using "has" method', () => {
    const io = new InternetObject();
    expect(io.has('key')).toBe(false);
  });

  test('should return the correct index of a value using "indexOf" method', () => {
    const io = new InternetObject();
    io.push('value1', 'value2');
    expect(io.indexOf('value1')).toBe(0);
    expect(io.indexOf('value2')).toBe(1);
  });

  test('should return -1 if value is not found using "indexOf" method', () => {
    const io = new InternetObject();
    expect(io.indexOf('value1')).toBe(-1);
  });

  test('should return the correct index of a key using "indexOfKey" method', () => {
    const io = new InternetObject();
    io.set('key1', 'value1');
    io.set('key2', 'value2');
    expect(io.indexOfKey('key1')).toBe(0);
    expect(io.indexOfKey('key2')).toBe(1);
  });

  test('should return -1 if key is not found using "indexOfKey" method', () => {
    const io = new InternetObject();
    expect(io.indexOfKey('key1')).toBe(-1);
  });

  test('should return all values using "values" method', () => {
    const io = new InternetObject();
    io.push('value1', 'value2');
    expect(io.valuesArray()).toEqual(['value1', 'value2']);
  });

  test('should return true if the InternetObject is empty using "isEmpty" method', () => {
    const io = new InternetObject();
    expect(io.isEmpty()).toBe(true);
  });

  test('should return false if the InternetObject is not empty using "isEmpty" method', () => {
    const io = new InternetObject();
    io.set('key', 'value');
    expect(io.isEmpty()).toBe(false);
  });

  // Large and Nested Objects
  test('should handle large objects', () => {
    const io = new InternetObject();
    const count = 100; // or any other large number you deem appropriate

    // Setting values
    for (let i = 0; i < count; i++) {
        io.set(`key${i}`, `value${i}`);
    }

    // Verifying values
    for (let i = 0; i < count; i++) {
        expect(io.get(`key${i}`)).toBe(`value${i}`);
    }
  });

  test('should handle nested objects', () => {
    const io = new InternetObject();

    const nestedIO = new InternetObject();
    nestedIO.set('nestedKey', 'nestedValue');

    io.set('key', nestedIO);

    // expect(io['key']['nestedKey']).toBe('nestedValue');
    expect(io.get('key').get('nestedKey')).toBe('nestedValue');
  });

  test('should handle deeply nested objects', () => {
    const io1 = new InternetObject();
    const io2 = new InternetObject();
    const io3 = new InternetObject();

    io3.set('deepKey', 'deepValue');
    io2.set('midKey', io3);
    io1.set('topKey', io2);

    // expect(io1['topKey']['midKey']['deepKey']).toBe('deepValue');
    expect(io1.get('topKey').get('midKey').get('deepKey')).toBe('deepValue');
  });

  test('should handle nested objects with arrays', () => {
    const io = new InternetObject();

    const arr = [
        new InternetObject().set('arrKey1', 'arrValue1'),
        new InternetObject().set('arrKey2', 'arrValue2')
    ];

    io.set('key', arr);

    // expect(io['key'][0]['arrKey1']).toBe('arrValue1');
    // expect(io['key'][1]['arrKey2']).toBe('arrValue2');

    expect(io.get('key')[0].get('arrKey1')).toBe('arrValue1');
    expect(io.get('key')[1].get('arrKey2')).toBe('arrValue2');
  });

  test('should handle deletion in large objects', () => {
    const io = new InternetObject();
    const count = 100;

    // Setting values
    for (let i = 0; i < count; i++) {
        io.set(`key${i}`, `value${i}`);
    }

    // Deleting values
    for (let i = 0; i < count; i+=2) { // Deleting every alternate key for variation
        io.delete(`key${i}`);
    }

    // Verifying deletions
    for (let i = 0; i < count; i++) {
        if (i % 2 === 0) {
            expect(io.get(`key${i}`)).toBeUndefined();
        } else {
            expect(io.get(`key${i}`)).toBe(`value${i}`);
        }
    }
  });

  // test('should handle deletion in nested objects', () => {
  //   const io = new InternetObject();

  //   const nestedIO = new InternetObject();
  //   nestedIO.set('nestedKey', 'nestedValue');
  //   nestedIO.set('toBeDeleted', 'deleteMe');

  //   io.set('key', nestedIO);

  //   // Deleting nested key
  //   io.get('key').delete('toBeDeleted');

  //   expect(io.get('key').get('nestedKey')).toBe('nestedValue');
  //   expect(io.get('key').get('toBeDeleted')).toBeUndefined();
  // });

  // test('should handle deletion in deeply nested objects', () => {
  //   const io1 = new InternetObject();
  //   const io2 = new InternetObject();
  //   const io3 = new InternetObject();

  //   io3.set('deepKey', 'deepValue');
  //   io3.set('deepDelete', 'toBeDeleted');
  //   io2.set('midKey', io3);
  //   io1.set('topKey', io2);

  //   // Delete deep nested key
  //   io1.get('topKey').get('midKey').delete('deepDelete');

  //   expect(io1.get('topKey').get('midKey').get('deepKey')).toBe('deepValue');
  //   expect(io1.get('topKey').get('midKey').get('deepDelete')).toBeUndefined();
  // });

  // test('should handle deletion in nested objects with arrays', () => {
  //   const io = new InternetObject();

  //   const arr = [
  //       new InternetObject().set('arrKey1', 'arrValue1').set('deleteMe1', 'value1'),
  //       new InternetObject().set('arrKey2', 'arrValue2').set('deleteMe2', 'value2')
  //   ];

  //   io.set('key', arr);

  //   // Deleting keys in nested array objects
  //   io.get('key')[0].delete('deleteMe1');
  //   io.get('key')[1].delete('deleteMe2');

  //   expect(io.get('key')[0].get('arrKey1')).toBe('arrValue1');
  //   expect(io.get('key')[1].get('arrKey2')).toBe('arrValue2');
  //   expect(io.get('key')[0].get('deleteMe1')).toBeUndefined();
  //   expect(io.get('key')[1].get('deleteMe2')).toBeUndefined();
  // });

  // Edge cases
  test('should handle setting undefined and null', () => {
    const io = new InternetObject();
    io.set('undefinedKey', undefined);
    io.set('nullKey', null);
    expect(io.get('undefinedKey')).toBeUndefined();
    expect(io.get('nullKey')).toBeNull();
  });
});
