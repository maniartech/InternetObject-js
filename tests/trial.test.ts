import parse from "../src/parser";

describe('Trial', () => {
  it('should try wip tasks', () => {
    // const input = String.raw`
    // name:string, active:{bool, F}, age:byte, address: { name:string, state:string }, tags?:array,
    // birthdate?:{date, min:d"2023-01-01"}
    // ---
    // ~ John, , 20, { name: New York, state: NY }, [red], d"2020-01-01"
    // ~ Doe,  F, 20, { name: New York, state: NY }
    // ~ Kim,  T, 35, { name: California, state: CA }
    // `

    const input = String.raw`
    birthdate?:{date, min:d"2023-01-01"}
    ---
    d"2023-01-01"
    `
    const result = parse(input);
    // if (result.sections) {
    //   const data = result.sections[0]._data[0]
    //   const o:any = { ...data }
    //   console.log(o)
    // }
    console.log(result.toObject())
  });
});
