import { doc } from "../src/parser/document";

describe('Trial', () => {
  it('should try parsing wip docs', () => {
    const d = doc`
    name, age, gender
    ---
    Spiderman, 25, M ,[]
    `;

    console.log(d);
  });
});
