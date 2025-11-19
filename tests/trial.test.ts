import { parse, stringify } from '../src/index';

describe('Trial Debug Playground', () => {

  it('DEBUG: playground', () => {

    const input = `
      name: string, age?: {number, min:20}, gender, joiningDt, address: {street, city, state?}, colors, isActive
      ---
      ~ Alice Smith, 28, f, d'2021-04-15', {Elm Street, Dallas, TX}, [yellow, green], T
      ~ Bob Johnson, 22, m, d'2022-02-20', {Oak Street, Chicago, IL}, [blue, black], T`;

    const doc = parse(input, null);
    const iotext = stringify(doc, undefined, undefined, { includeTypes: true });

    console.log('--- INPUT ---');
    console.log(input);
    console.log('--- PARSED/STRINGIFIED ---');
    console.log(iotext);

  })
});