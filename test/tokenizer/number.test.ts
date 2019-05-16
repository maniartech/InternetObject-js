import "jest"
import Tokenizer from "../../src/parser/tokenizer"


describe("Scalar Number", () => {
  it("parses the integer", () => {
    const tokenizer = new Tokenizer("1")
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe(1)
    expect(token.col).toBe(1)
    expect(token.row).toBe(1)
    expect(token.index).toBe(0)
  })

  it("parses the float", () => {
    const tokenizer = new Tokenizer("1.2")
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe(1.2)
    expect(token.col).toBe(1)
    expect(token.row).toBe(1)
    expect(token.index).toBe(0)
  })

  it("parses the negative number", () => {
    const tokenizer = new Tokenizer("-100.101")
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe(-100.101)
    expect(token.col).toBe(1)
    expect(token.row).toBe(1)
    expect(token.index).toBe(0)
  })

  it("parses the positive number", () => {
    const tokenizer = new Tokenizer("+100.101")
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe(100.101)
    expect(token.col).toBe(1)
    expect(token.row).toBe(1)
    expect(token.index).toBe(0)
  })
})
