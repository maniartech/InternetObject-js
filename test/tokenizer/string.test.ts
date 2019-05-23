import "jest"
import Tokenizer from "../../src/parser/tokenizer"


describe("String", () => {
  it("parses the simple string", () => {
    const tokenizer = new Tokenizer("Hello World")
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe("Hello World")
    expect(token.type).toBe("string")
    expect(token.col).toBe(1)
    expect(token.row).toBe(1)
    expect(token.index).toBe(0)
  })

  it("String with emoji", () => {
    const tokenizer = new Tokenizer(`Hello World 😀`)
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe("Hello World 😀")
    expect(token.type).toBe("string")
    expect(token.col).toBe(1)
    expect(token.row).toBe(1)
    expect(token.index).toBe(0)
  })

  it("String with surrounding white spaces", () => {
    const tokenizer = new Tokenizer(`   Hello World 😀   `)
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe("Hello World 😀")
    expect(token.type).toBe("string")
    expect(token.col).toBe(4)
    expect(token.row).toBe(1)
    expect(token.index).toBe(3)
  })

  it("String with newline", () => {
    const tokenizer = new Tokenizer(`   Hello
    World 😀   `)
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe(`Hello
    World 😀`)
    expect(token.type).toBe("string")
    expect(token.col).toBe(4)
    expect(token.row).toBe(1)
    expect(token.index).toBe(3)
  })

  it("String with newline - 2", () => {
    const tokenizer = new Tokenizer(`   Hello\nWorld 😀   `)
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe(`Hello\nWorld 😀`)
    expect(token.type).toBe("string")
    expect(token.col).toBe(4)
    expect(token.row).toBe(1)
    expect(token.index).toBe(3)
  })

  it("String with quotes", () => {
    const tokenizer = new Tokenizer(`   "Hello\nWorld 😀"   `)
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe(`Hello\nWorld 😀`)
    expect(token.type).toBe("string")
    expect(token.col).toBe(4)
    expect(token.row).toBe(1)
    expect(token.index).toBe(3)
  })

  it("String with quotes escaped", () => {
    const tokenizer = new Tokenizer(`"Hello\\"World\\" 😀"`)
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe(`Hello"World" 😀`)
    expect(token.type).toBe("string")
    expect(token.col).toBe(1)
    expect(token.row).toBe(1)
    expect(token.index).toBe(0)
  })

  it("String with other escapes escaped", () => {
    const tokenizer = new Tokenizer(`"\\Hello\\nWorld\\t 😀"`)
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(tokenizer.length).toBe(1)
    expect(token.value).toBe(`Hello\nWorld\t 😀`)
    expect(token.type).toBe("string")
    expect(token.col).toBe(1)
    expect(token.row).toBe(1)
    expect(token.index).toBe(0)
  })

  it("Do not escape non-escaped keywords", () => {
    const tokenizer = new Tokenizer(`"Hello//\\sWorld\\a 😀"`)
    tokenizer.readAll()
    let token = tokenizer.get(0)
    expect(token.value).toBe(`Hello//sWorlda 😀`)
  })
})

