import { parse, parseDefinitions, IODefinitions } from '../../src';

// Utility to run sample pairs (schema+doc or doc-only)
function runSample(doc: string, defs?: IODefinitions | null) {
  const result = parse(doc, defs || null);
  return result.toJSON();
}

describe('Playground simple samples', () => {
  test('simple-object (doc only)', () => {
    const doc = `name, age, isActive, joiningDt, address: {street, city, state}, colors\n---\nJohn Doe, 25, T, d'2022-01-01', {Bond Street, New York, NY}, [red, blue]\n`;
    const json = runSample(doc);
    // Output is direct object for single section, no header
    expect(json).toEqual({
      name: 'John Doe',
      age: 25,
      isActive: true,
      joiningDt: '2022-01-01T00:00:00.000Z',
      address: { street: 'Bond Street', city: 'New York', state: 'NY' },
      colors: ['red', 'blue']
    });
  });

  test('simple-collection (doc only)', () => {
    const doc = `name, age, gender, joiningDt, address: {street, city, state?}, colors, isActive\n---\n~ Alice Smith, 28, f, d'2021-04-15', {Elm Street, Dallas, TX}, [yellow, green], T`;
    const out = runSample(doc);
    // Output is array for collection
    expect(Array.isArray(out)).toBe(true);
    expect(out[0]).toMatchObject({
      name: 'Alice Smith',
      age: 28,
      gender: 'f',
      isActive: true,
      colors: ['yellow', 'green'],
      address: { street: 'Elm Street', city: 'Dallas', state: 'TX' }
    });
  });

  test('typed-collection (schema inline)', () => {
    const doc = `\nname: string,\nage: number,\ngender: {string, choices: [m, f]},\njoiningDt: date,\naddress: {\n  street: string,\n  city: string,\n  state?: {string, len: 2}\n},\ncolors: string\n---\n~ Alice Smith, 28, f, d'2021-04-15', {Elm Street, Dallas, TX}, yellow\n~ Bob Johnson, 22, m, d'2022-02-20', {Oak Street, Chicago, IL}, blue\n`.trim();
    const out = runSample(doc);
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(1);
    expect(out[0]).toMatchObject({ joiningDt: '2021-04-15T00:00:00.000Z' });
  });
});
