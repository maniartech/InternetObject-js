import "jest"
import Tokenizer from "../../src/parser/tokenizer"
import ASTParser from '../../src/parser/ast-parser';


describe("Tokenizer", () => {
  it("Initialization", () => {
    const tokenizer = new Tokenizer("")
  })

  it("other methods", () => {
    const tokenizer = new Tokenizer("")
    expect(typeof tokenizer.read).toBe("function")
    expect(typeof tokenizer.readAll).toBe("function")
    expect(typeof tokenizer.get).toBe("function")
    expect(typeof tokenizer.length).toBe("number")
  })
})
