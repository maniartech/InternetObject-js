import "jest"
import InternetObject from '../../src';


describe("Email", () => {
  it("valid emails", () => {
    const objStr = String.raw`
    e1:email, e2:email, e3:email
    ---
    test@example.com, test_server@example.co.in, test.mail@exaple.in
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.e1).toBe("test@example.com")
    expect(obj.data.e2).toBe("test_server@example.co.in")
    expect(obj.data.e3).toBe("test.mail@exaple.in")
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


describe("Url", () => {
  it("valid urls", () => {
    const objStr = String.raw`
    u1:url, u2:url, u3:url
    ---
    "https://example.com",
    "ftp://username:password@example.com",
    "https://test.mailexaple.in?p1=v1&p2=v2#slug"
    `
    const obj = new InternetObject(objStr)
    expect(obj.data.u1).toBe("https://example.com")
    expect(obj.data.u2).toBe("ftp://username:password@example.com")
    expect(obj.data.u3).toBe("https://test.mailexaple.in?p1=v1&p2=v2#slug")
  })

  it("invalid urls", () => {
    const t1 = () => {
      return new InternetObject(String.raw`
        url:url
        ---
        example
      `)
    }
    const t2 = () => {
      return new InternetObject(String.raw`
        url:url
        ---
        example.com
      `)
    }

    expect(t1).toThrowError()
    expect(t2).toThrowError()
  })
})