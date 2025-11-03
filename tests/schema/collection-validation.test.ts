import parse from '../../src/parser';
import NumberDef from '../../src/schema/types/number';

const input = `name, age:{number, min:30}, gender, joiningDt, address: {street, city, state?}, colors, isActive\n---\n~ Monica Geller, 27, f, d'2022-08-19', {Maple Street, New York, NY}, [red, yellow], T\n~ Chandler Bing, 30, m, d'2023-03-12', {Wall Street, New York, NY}, [blue, grey], T\n`;

describe('Schema validation in collections', () => {
  it('produces an ErrorNode for age below min and aggregates error on document', () => {
    const doc = parse(input, null);
    const defaultSchema: any = (doc as any).header.definitions.defaultSchema;
    expect(defaultSchema).toBeTruthy();
    const ageDef = defaultSchema.defs['age'];
    expect(ageDef).toBeTruthy();
    expect(ageDef.type).toBe('number');
    expect(ageDef.min).toBe(30);
  const errors = doc.getErrors();

    // The first section should be a collection with one error item and one valid item
  const json: any = doc.toJSON();
    // When header is present, data is under data
  const dataOut = json && json.data ? json.data : json;
  expect(Array.isArray(dataOut)).toBe(true);
  const arr = dataOut as any[];
    // One of the items should be an error object
    const hasErrorObject = arr.some(x => x && x.__error === true);
    expect(hasErrorObject).toBe(true);

    // Additionally, inspect raw section items (pre-serialization) for ErrorNode shape
  const firstSection: any = (doc as any).sections.get(0);
  const data = firstSection.data;
    const rawItems: any[] = [];
    if (data && typeof data[Symbol.iterator] === 'function') {
      for (const it of data as any) rawItems.push(it);
    }
    const hasRawErrorNode = rawItems.some(it => it && typeof it === 'object' && it.error instanceof Error);
    expect(hasRawErrorNode).toBe(true);
  });

  it('number type enforces min constraint', () => {
    const num = new (NumberDef as any)('number');
    const call = () => num.parse(27 as any, { type: 'number', min: 30, path: 'age' } as any, undefined);
    expect(call).toThrow();
  });
});
