import 'jest'

import InternetObject from '../src'
import Tokenizer from '../src/parser/tokenizer'
import { print } from '../src/utils/index'
import ASTParser from '../src/parser/ast-parser'
import Schema from '../src/header/schema'
import AnyDef from '../src/types/any'

describe('Trial Tests', () => {
  it('Blank string', () => {
    // expect((new InternetObject("")).data).toBe(null)
    // expect((new InternetObject("         ")).data).toBe(null)
    // expect((new InternetObject(String.raw`

    // `)).data).toBe(null)

    // const parser = new ASTParser(String.raw`   "\n \t"   `)
    // parser.parse()

    // console.warn(">>>>", parser.data)
    const s = String.raw`  {
      "name":"string",
      "age?*":"int",
      "active?":"any",
      address: {city, state},
      addresses: [{city, state}],
      "tags":[{string, minLength:5}],
      "notes"
    } `
    const o: any = String.raw`Aamir, 40, T, [a, b]`

    const x = '[a, b, c]'
    const parser = new ASTParser(s)
    parser.parse()

    const schema = Schema.compile(s)
    // print(schema)

    const def = new AnyDef()
    console.log(
      def.serialize(
        {
          name: 'aamir',
          age: 20,
          address: {
            street: 'Bond Street',
            city: 'New York',
            lnglat: [10001, 20002]
          },
          test: 'mm,n',
          tags: ['a', 'b', 'c']
        },
        {
          type: 'any',
          path: 'test'
        }
      )
    )

    // print(parser.data)
    // console.log(new InternetObject(o, s))
    // expect((new InternetObject(null)).data).toBe(" Hello World ")
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
