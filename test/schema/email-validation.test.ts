import "jest"
import InternetObject from '../../src';


describe("Email", () => {
  it("valid emails", () => {
    const objStr = String.raw`
    e1:email, e2:email, e3:email
    ---
    test@example.com, test_server@example.co.in, test.mail@example.in
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.e1).toBe("test@example.com")
    expect(obj.data.e2).toBe("test_server@example.co.in")
    expect(obj.data.e3).toBe("test.mail@example.in")
  })

  it("invalid emails", () => {
    const t1 = () => {
      return new InternetObject(String.raw`
        email:email
        ---
        spiderman
      `)
    }
    const t2 = () => {
      return new InternetObject(String.raw`
        email:email
        ---
        spiderman
      `)
    }

    const t3 = () => {
      return new InternetObject(String.raw`
        email:email
        ---
        @marvel.com
      `)
    }
    expect(t1).toThrowError()
    expect(t2).toThrowError()
    expect(t3).toThrowError()
  })
})
