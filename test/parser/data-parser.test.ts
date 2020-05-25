import 'jest'

import ASTParser from '../../src/parser/ast-parser'
import ErrorCodes from '../../src/errors/io-error-codes'

describe('Data Parser Tests', () => {
  it('handles key errors', () => {
    expect(() => {
      const parser = new ASTParser(String.raw`
        name: John Doe: age: 40
      `)
      parser.parse()
    }).toThrowError(ErrorCodes.unexpectedColon)
  })
})
