import io from "../src/parser/io";

describe('Trial', () => {
  it('should try parsing wip docs', () => {
    const d = io`
    name: Spiderman,
    age: 25,
    address: {
      street: '123 Fake St.',
      city: Springfield,
      state: IL,
      zip: 62701,
    }`;

  });
});
