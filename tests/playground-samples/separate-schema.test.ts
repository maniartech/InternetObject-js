import { parse, parseDefinitions } from '../../src';

describe('Playground separate-schema sample', () => {
  test('doc + separate defs/schema', () => {
    const defsText = `
# Employee Schema and Variables
~ @officeAddr: {Santacruze, California, CA}
~ $address: {
      street: string,
      city: {string, choices:[New York, California, San Fransisco, Washington]},
      state: {string, maxLen:2, choices:[NY, CA, WA]}
    }
~ $schema: {
    name: string,  # The person name
    age: {int, min:20, max:35},  # The person age!
    joiningDt: date,  # The person joining date
    gender?: {string, choices:[m, f, u]},
    currentAddress: $address,
    permanentAddress?*: $address,
    colors?: [string], # Color array inthe form of string array
    isActive?: {bool, F}
  }
`.trim();

    const doc = `
~ recordCount: 23
~ page: 3
~ prevPage: "/api/v1/people/page/2"
~ nextPage: T
---
~ John Doe, 25, d'2022-01-01', m, @officeAddr,@officeAddr, [red, green, blue]
~ Jane Done, 20, d'2022-10-10', f, {\uD83D\uDCC8 Bond Street, "New York", NY},N, [green, purple]
`.trim();

    const defs = parseDefinitions(defsText, null);
    const out = parse(doc, defs).toJSON();
    // Output is { header, data } when header has content
    expect(out.header).toMatchObject({ recordCount: 23, page: 3, nextPage: true });
    expect(Array.isArray(out.data)).toBe(true);
    expect(out.data[0]).toMatchObject({
      name: 'John Doe',
      age: 25,
      gender: 'm',
      currentAddress: expect.objectContaining({
        street: 'Santacruze',
        city: 'California',
        state: 'CA'
      })
    });
  });
});
