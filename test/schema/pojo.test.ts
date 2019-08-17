import "jest"
import InternetObject from '../../src';
import { print } from '../../src/utils/index';


describe("pojo load", () => {
  it("load", () => {
    const schema = "name, age:{number, max:20}"

    const obj = new InternetObject({
      name: "Peter Parker",
      age: 25
    }, schema)

    // console.warn(">>>", obj.data)

    expect(obj).toBeInstanceOf(InternetObject)
    expect(obj.data.name).toBe("Peter Parker")

  })


})
