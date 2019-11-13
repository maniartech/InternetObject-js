import 'jest'
import InternetObject from '../../src'
import Tokenizer from '../../src/parser/tokenizer'
import { print } from '../../src/utils/index'
import ASTParser from '../../src/parser/ast-parser'

describe('Internet Object', () => {
  it('serializes into IO format', () => {
    const io = new InternetObject(String.raw`
      name, age, gender
      ---
      Spiderman, 25, M
      `)

    const serialized = io.serialize()

    expect(typeof serialized).toBe('string')
    expect(serialized).toBe('Spiderman,25,M')
  })
})
