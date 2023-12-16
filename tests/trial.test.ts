import parse from "../src/parser";
import Tokenizer from "../src/tokenizer";

describe('Trial', () => {
  it('should try wip tasks', () => {
    const input = String.raw`
    dt'2021-01-01T00:00:00.000Z',
    d'2021-01-01',
    t'02:30',
    `

    const tokenizer = new Tokenizer(input);
    const tokens = tokenizer.tokenize();
    console.log(tokens);

    // const input = String.raw`~ recordCount: 22
    // ~ page: 3
    // ~ prevPage: "/api/v1/people/pa ge/2"
    // ~ nextPage: N
    // ~ $schema: {
    //     name: string,  # The person name
    //     age: {int, min:20, max:35},  # The person age!
    //     joiningDt: date,  # The person joining date
    //     gender?: {string, choices:[m, f, u]},
    //     address?*: { # Person's address (optional) (Nullable)
    //       street: string,
    //       city: {string, choices:[New York, San Fransisco, Washington]},
    //       state: {string, maxLen:2, choices:[NY, CA, WA]}
    //     },
    //     colors?: [string], # Color array inthe form of string array
    //     isActive?: {bool, F}
    //   }
    // ---
    // ~ John Doe, 25, d'2022-01-01', m, {Bond Street, New York, NY}, [red, blue], T
    // ~ Jane Done, 20, d'2022-10-10', f, {Bond Street, New York, NY}, [green, purple]
    // `

    // const result = parse(input);
    // if (result.sections) {
    //   const data = result.sections[0]._data[0]
    //   const o:any = { ...data }
    //   console.log(o)
    // }
    // console.log(result.toObject())
  });
});
