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

  it('includes collectionIndex in error envelopes for invalid items', () => {
    const doc = parse(input, null);
    const json: any = doc.toJSON();
    const dataOut = json && json.data ? json.data : json;
    expect(Array.isArray(dataOut)).toBe(true);
    const arr = dataOut as any[];
    const errorItem = arr.find(x => x && x.__error === true);
    expect(errorItem).toBeTruthy();
    // The first record (index 0) has age 27 < min 30
    expect(errorItem.collectionIndex).toBe(0);
  });

  it('preserves order and attaches collectionIndex for mixed success/failure including syntax errors', () => {
    const mixed = `name, age:{number, min:30}\n---\n~ John, 25\n~ Jane, 35\n~ Bob, {invalid\n~ Alice, 45\n`;
    const doc = parse(mixed, null);
    const json: any = doc.toJSON();
    const dataOut = json && json.data ? json.data : json;
    expect(Array.isArray(dataOut)).toBe(true);
    const arr = dataOut as any[];
    // Expect 4 items in the same order
    expect(arr.length).toBe(4);

    // Index 0: validation error (age 25 < 30)
    const item0 = arr[0];
    expect(item0 && item0.__error).toBe(true);
    expect(item0.collectionIndex).toBe(0);
    expect(item0.category).toBe('validation');

    // Index 1: valid
    const item1 = arr[1];
    expect(item1 && item1.__error).toBeUndefined();
    expect(item1.name).toBe('Jane');
    expect(item1.age).toBe(35);

    // Index 2: parser error (unclosed object)
    const item2 = arr[2];
    expect(item2 && item2.__error).toBe(true);
    expect(item2.collectionIndex).toBe(2);
    expect(item2.category).toBe('syntax');

    // Index 3: valid
    const item3 = arr[3];
    expect(item3 && item3.__error).toBeUndefined();
    expect(item3.name).toBe('Alice');
    expect(item3.age).toBe(45);
  });
});
