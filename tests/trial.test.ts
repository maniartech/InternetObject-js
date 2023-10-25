import parse from "../src/parser";

describe('Trial', () => {
  it('should try wip tasks', () => {
    const input = String.raw`
    name, active:bool, age, address
    ---
    ~ John, T, 30, { name: New York, state: NY }
    ~ Doe,  F, 20, { name: New York, state: NY }
    ~ Kim,  T, 35, { name: California, state: CA }
    `

    console.log(parse(input).toObject())
  });
});
