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

    const input = String.raw`~ recordCount: 22
    ~ page: 3
    ~ prevPage: "/api/v1/people/pa ge/2"
    ~ nextPage: N
    ~ $schema: {
        name: string,  # The person name
        age: {int, min:20, max:35},  # The person age!
        joiningDt: date,  # The person joining date
        gender?: {string, choices:[m, f, u]},
        address?*: { # Person's address (optional) (Nullable)
          street: string,
          city: {string, choices:[New York, San Fransisco, Washington]},
          state: {string, maxLen:2, choices:[NY, CA, WA]}
        },
        colors?: [string], # Color array inthe form of string array
        isActive?: {bool, F}
      }
    ---
    ~ John Doe, 25, d'2022-01-01', m, {Bond Street, New York, NY}, [red, blue], T
    ~ Jane Done, 20, d'2022-10-10', f, {Bond Street, New York, NY}, [green, purple]
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
