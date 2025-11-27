import { parse, stringify } from '../src/index';

describe('Trial Debug Playground', () => {

  it('reorders late keyed optional member into positional slot', () => {

    const input = `
      # Employee Schema
      ~ $employee: { name, age:{number, min:25}, isActive:bool,
      joiningDt:date, managers?*: $employee}
      ~ $user: $employee
      ~ $schema: $employee
      ---
      ~ John Doe, 25, T, d'2022-01-01',
        { Peter Parker, 30, T, d'2018-10-01' }
    `;

    const doc = parse(input, null);
    // Request types (for schema line) but data rows should stay positional without keys
    const iotext = stringify(doc, undefined, undefined, { includeTypes: true });

    console.log('Full output:\n', iotext);

    // Also check just the data without schema
    const dataOnly = stringify(doc);
    console.log('Data only:\n', dataOnly);
  })
});