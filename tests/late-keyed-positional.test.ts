import { parse, stringify } from '../src/index';

describe('Late keyed optional members normalization', () => {
  it('normalizes multiple late keyed optional members into positional order', () => {
    const input = `
      name: string, age?: number, gender?: string, isActive: bool, colors?: [string]
      ---
      ~ John,,, T, age: 30, colors: [red, blue]`;

    const doc = parse(input, null);
    const out = stringify(doc, { includeTypes: true });

    // colors now properly shows element type: [string]
    const expected = `name: string, age?: number, gender?: string, isActive: bool, colors?: [string]\n---\n~ John, 30, , T, [red, blue]`;

    expect(out.trim()).toBe(expected.trim());
  });

  it('reorders late keyed optional member into positional slot', () => {

    const input = `
      name: string, age?: {number, min:20}, gender, joiningDt, address: {street, city, state?}, colors, isActive, *:string
      ---
      ~ Alice Smith, 28, f, d'2021-04-15', {Elm Street, Dallas, TX}, [yellow, green], T, detail: "Loves hiking", extra1: "extra value 1"
      ~ Bob Johnson,, m, d'2022-02-20', {Oak Street, Chicago, IL}, [blue, black], T, age: 28`;

    const doc = parse(input, null);
    // Request types (for schema line) but data rows should stay positional without keys
    const iotext = stringify(doc, { includeTypes: true });

    const expected = `name: string, age?: {number, min:20}, gender, joiningDt, address: {street, city, state?}, colors, isActive, *:string\n---\n~ Alice Smith, 28, f, d\"2021-04-15\", {Elm Street, Dallas, TX}, [yellow, green], T, detail: Loves hiking, extra1: extra value 1\n~ Bob Johnson, 28, m, d\"2022-02-20\", {Oak Street, Chicago, IL}, [blue, black], T`;

    expect(iotext.trim()).toBe(expected.trim());

  })
});
