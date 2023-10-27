import parse from "../src/parser";

describe('Trial', () => {
  it('should try wip tasks', () => {
    const input = String.raw`
    name:string, active:{bool, F}, age:byte, address: { name:string, state:string }, tags?:array
    ---
    ~ John, , 20, { name: New York, state: NY }, [red]
    ~ Doe,  F, 20, { name: New York, state: NY }
    ~ Kim,  T, 35, { name: California, state: CA }
    `

    console.log(parse(input).toObject())
  });
});
