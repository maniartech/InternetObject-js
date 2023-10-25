import Document from "../src/core/document";
import Header from "../src/core/header";
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

    // const x = new Document(new Header(), null)

    // x.sections? ('name', 'name').data(
    //   ['Spiderman', '25', 'M'],
    //   ['Batman', '30', 'M'],
    //   ['Superman', '35', 'M'],
    // )

  });
});
