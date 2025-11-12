import { parse } from "../../src/schema-v2";

describe('Collections', () => {
  it('should parse collection of objects', () => {
    const ioString = `
    name:string, age:number
    ---
    ~ John, 30
    ~ Jane, 25
    ~ Bob, 35
    `;

    const result = parse(ioString);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(3);
    expect(result[0]).toEqual({ name: 'John', age: 30 });
    expect(result[1]).toEqual({ name: 'Jane', age: 25 });
    expect(result[2]).toEqual({ name: 'Bob', age: 35 });
  });
});