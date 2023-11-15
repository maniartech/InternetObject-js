import { compileSchema } from "../src/schema";

describe('Schema Parser', () => {
  it('should parse the schema', () => {
    const input = String.raw`
    friends:[string], addresses: [
      {
        city: string,
        country: string,
        zip: number
      }
    ]
    `
    const schema = compileSchema(input);
    console.log(schema);
  });
});
