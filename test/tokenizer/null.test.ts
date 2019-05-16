import "jest"
import Tokenizer from "../../src/parser/tokenizer"


describe("Scalar Null", () => {
  it("parses the null", () => {
    const tokenizer = new Tokenizer("N")
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe(null)
    expect(token.col).toBe(1)
    expect(token.row).toBe(1)
    expect(token.index).toBe(0)
  })
})

