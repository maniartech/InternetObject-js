import 'jest'
import InternetObject from '../../src'
import Tokenizer from '../../src/parser/tokenizer'
import { print } from '../../src/utils/index'
import ASTParser from '../../src/parser/ast-parser'
import ErrorCodes from '../../src/errors/io-error-codes'

describe('Internet Object', () => {
  it('Structure', () => {
    const io = new InternetObject(String.raw`
      name, age, gender
      ---
      Spiderman, 25, M
      `)
    expect(io.data).toBeDefined()
    expect(io.header).toBeDefined()
    expect(io.schema).toBeDefined()
  })

  it('Types', () => {
    expect(new InternetObject('').data).toBe('')
    expect(new InternetObject('N').data).toBeNull()
    expect(new InternetObject('10').data).toBe(10)
  })

  it('Structure Positional and Keyword Arguments', () => {
    const t1 = () => {
      const io = new InternetObject(String.raw`
        name, age, gender
        ---
        Spiderman, age:25, M
        `)
    }
    const t2 = () => {
      const io = new InternetObject(String.raw`
        name, age, gender
        ---
        name:Spiderman, 25, M
        `)
    }

    expect(t1).toThrowError(ErrorCodes.positionalMemberAfterKeywordMember)
    expect(t2).toThrowError(ErrorCodes.positionalMemberAfterKeywordMember)
  })
})
