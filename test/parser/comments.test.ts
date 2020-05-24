import 'jest'

import InternetObject from '../../src'
import DataParser from '../../src/data/index'
import Tokenizer from '../../src/parser/tokenizer'
import ASTParser from '../../src/parser/ast-parser'

describe('AST Parser', () => {
  it('ignores the comments', () => {
    const text = String.raw`
    {
      # This is a comment
      name: "aamir", # This is a name
      "age": " 40  " # This is last comment
    }
    `
    const parser: any = new ASTParser(text)
    parser.parse()

    const { values } = parser.data
    expect(values.length).toBe(2)
    expect(values[0].key).toBe('name')
    expect(values[1].key).toBe('age')
  })
})
