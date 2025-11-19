import { parse, stringify } from '../src/index';
import Document from '../src/core/document';

describe('Debug Serialization', () => {
  test('check nested object parsing', () => {
    const io = `
~ $address: {street, city}
~ $schema: {name, email, address: $address}
---
~ Alice, alice@test.com, {Main St, NYC}
~ Bob, bob@test.com, {Oak Ave, LA}
`;
    const doc = parse(io, null) as Document;
    const data = doc.toJSON() as any[];

    console.log('=== PARSED DATA ===');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n=== FIRST RECORD $address ===');
    console.log(JSON.stringify(data[0].address, null, 2));

    expect(data).toBeDefined();
  });
});