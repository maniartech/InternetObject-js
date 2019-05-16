import "jest"
import Tokenizer from "../../src/parser/tokenizer"


describe("Scalar Boolean", () => {
  it("parses the true", () => {
    const tokenizer = new Tokenizer("T")
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe(true)
    expect(token.col).toBe(1)
    expect(token.row).toBe(1)
    expect(token.index).toBe(0)
  })

  it("parses the false", () => {
    const tokenizer = new Tokenizer("F")
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe(false)
    expect(token.col).toBe(1)
    expect(token.row).toBe(1)
    expect(token.index).toBe(0)
  })
})
