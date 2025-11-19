import { parse, stringify } from '../src/index';

describe('Trial Debug Playground', () => {

  it('reorders late keyed optional member into positional slot', () => {

    const input = `
      ~ @var: val
      ~ $schema: { name: string, age?: {number, min:20}, gender, joiningDt, address: {street, city, state?}, colors, isActive, *:string }
      ---
      ~ Alice Smith, 28, f, d'2021-04-15', {Elm Street, Dallas, TX}, [yellow, green], T, detail: "Loves hiking", extra1: "extra value 1"
      ~ Bob Johnson,, m, d'2022-02-20', {Oak Street, Chicago, IL}, [blue, black], T, age: 28`;

    const doc = parse(input, null);
    // Request types (for schema line) but data rows should stay positional without keys
    const iotext = stringify(doc, undefined, undefined, { includeTypes: true });

    console.log(iotext);
  })
});