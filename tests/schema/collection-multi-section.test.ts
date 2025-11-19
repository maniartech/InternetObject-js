import parse from '../../src/parser';

describe('Multi-section collection collectionIndex handling', () => {
  it('resets collectionIndex per section and attaches correctly to errors', () => {
    const input = `name, age:{number, min:30}, gender, joiningDt, address: {street, city, state?}, colors, isActive
--- collection1
~ Alice Smith, 38, f, d'2021-04-15', {Elm Street, Dallas, TX}, [yellow, green], T
~ Bob Johnson, 22, m, d'2022-02-20', {Oak Street, Chicago, IL, [blue, black], T
--- collection2
~ Monica Geller, 27, f, d'2022-08-19', {Maple Street, New York, NY}, [red, yellow], T
~ Joey Tribbiani, 25, m, d'2023-01-10', {6th Street, Las Vegas, NV}, [black, blue], T
`;

    const doc = parse(input, null);
    const json: any = doc.toJSON();

    // Should have two named sections
    expect(json.collection1).toBeDefined();
    expect(json.collection2).toBeDefined();

    // Collection1: item 0 valid, item 1 syntax error
    const collection1 = json.collection1;
    expect(Array.isArray(collection1)).toBe(true);
    expect(collection1.length).toBe(2);

    // Item 0: valid
    expect(collection1[0].__error).toBeUndefined();
    expect(collection1[0].name).toBe('Alice Smith');
    expect(collection1[0].age).toBe(38);

    // Item 1: syntax error (missing closing brace) with collectionIndex = 1
    expect(collection1[1].__error).toBe(true);
    expect(collection1[1].category).toBe('syntax');
    expect(collection1[1].collectionIndex).toBe(1);
    expect(collection1[1].message).toMatch(/expecting-bracket|Missing closing brace/i);

    // Collection2: both items have validation errors (age < 30)
    const collection2 = json.collection2;
    expect(Array.isArray(collection2)).toBe(true);
    expect(collection2.length).toBe(2);

    // Item 0: validation error with collectionIndex = 0 (reset from previous section)
    expect(collection2[0].__error).toBe(true);
    expect(collection2[0].category).toBe('validation');
    expect(collection2[0].collectionIndex).toBe(0);
    expect(collection2[0].message).toMatch(/age.*27/i);

    // Item 1: validation error with collectionIndex = 1
    expect(collection2[1].__error).toBe(true);
    expect(collection2[1].category).toBe('validation');
    expect(collection2[1].collectionIndex).toBe(1);
    expect(collection2[1].message).toMatch(/age.*25/i);
  });

  it('handles three sections with mixed valid/invalid items and proper index reset', () => {
    const input = `name, value:{number, min:10}
--- sectionA
~ Alice, 15
~ Bob, 5
--- sectionB
~ Charlie, 20
~ David, 8
~ Eve, 12
--- sectionC
~ Frank, 3
`;

    const doc = parse(input, null);
    const json: any = doc.toJSON();

    // SectionA
    expect(json.sectionA.length).toBe(2);
    expect(json.sectionA[0].__error).toBeUndefined();
    expect(json.sectionA[0].name).toBe('Alice');
    expect(json.sectionA[1].__error).toBe(true);
    expect(json.sectionA[1].collectionIndex).toBe(1); // Error at index 1

    // SectionB
    expect(json.sectionB.length).toBe(3);
    expect(json.sectionB[0].__error).toBeUndefined();
    expect(json.sectionB[0].name).toBe('Charlie');
    expect(json.sectionB[1].__error).toBe(true);
    expect(json.sectionB[1].collectionIndex).toBe(1); // Error at index 1 (reset from sectionA)
    expect(json.sectionB[2].__error).toBeUndefined();
    expect(json.sectionB[2].name).toBe('Eve');

    // SectionC
    expect(json.sectionC.length).toBe(1);
    expect(json.sectionC[0].__error).toBe(true);
    expect(json.sectionC[0].collectionIndex).toBe(0); // Error at index 0 (reset from sectionB)
  });

  it('handles unnamed data section followed by named sections', () => {
    const input = `name, score:{number, min:50}
---
~ Alice, 60
~ Bob, 40
--- winners
~ Charlie, 95
~ David, 45
`;

    const doc = parse(input, null);
    const json: any = doc.toJSON();

    // Named section (winners) should exist
    expect(json.winners).toBeDefined();
    expect(json.winners.length).toBe(2);
    expect(json.winners[0].__error).toBeUndefined();
    expect(json.winners[0].name).toBe('Charlie');
    expect(json.winners[1].__error).toBe(true);
    expect(json.winners[1].collectionIndex).toBe(1); // Index reset for this section

    // Find the unnamed section - look for keys other than "winners"
    const keys = Object.keys(json).filter(k => k !== 'winners');
    expect(keys.length).toBeGreaterThan(0); // Should have at least one more section

    const unnamedSectionKey = keys[0]; // First non-winners key
    const firstSection = json[unnamedSectionKey];

    expect(Array.isArray(firstSection)).toBe(true);
    expect(firstSection.length).toBe(2);
    expect(firstSection[0].__error).toBeUndefined();
    expect(firstSection[0].name).toBe('Alice');
    expect(firstSection[1].__error).toBe(true);
    expect(firstSection[1].collectionIndex).toBe(1)
  });
});
