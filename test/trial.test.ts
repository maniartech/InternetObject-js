import 'jest'
import Tokenizer from '../src/parser/tokenizer'
import { print } from '../src/utils/index'
import ASTParser from '../src/parser/ast-parser'
import InternetObject from '../src'

describe('Trial Tests', () => {
  it('Blank string', () => {
    // expect((new InternetObject("")).data).toBe(null)
    // expect((new InternetObject("         ")).data).toBe(null)
    // expect((new InternetObject(String.raw`

    // `)).data).toBe(null)

    const parser = new ASTParser(String.raw`   "\n \t"   `)
    parser.parse()

    // console.warn(">>>>", parser.data)

    // expect((new InternetObject(String.raw` " Hello World " `)).data).toBe(" Hello World ")
  })

  // it("String with surrounding white spaces", () => {
  //   const tokenizer = new Tokenizer(`   Hello World 😀   `)
  //   tokenizer.readAll()
  //   let token = tokenizer.get(0)
  //   console.log(tokenizer.tokens)
  //   expect(tokenizer.length).toBe(1)
  //   expect(token.value).toBe("Hello World 😀")
  //   expect(token.type).toBe("string")
  //   expect(token.col).toBe(4)
  //   expect(token.row).toBe(1)
  //   expect(token.index).toBe(3)
  // })
})

// {,,,}
// [,,,]
// --- ,,,
// ,,,
// k:,
