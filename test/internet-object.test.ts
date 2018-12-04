import "jest"
import IO from "../src/internet-object"


describe("Internet Object", () => {
  it("has a parse method", () => {
    expect(typeof IO.parse).toBe("function")
  })
})

describe("Scalar Number", () => {
  it("parses the integer", () => {
    expect(IO.parse("1")).toBe(1)
    expect(IO.parse("10")).toBe(10)
    expect(IO.parse("100")).toBe(100)
  })
})

describe("Scalar Boolean", () => {
  it("parses the boolean", () => {
    expect(IO.parse("true")).toBe(true)
    expect(IO.parse("false")).toBe(false)
  })
})

describe("Scalar String", () => {
  it("parses the string", () => {
    expect(IO.parse("Hello World")).toBe("Hello World")
    expect(IO.parse("Wow, great!")).toBe("Wow, great!")
  })
})
